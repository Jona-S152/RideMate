import { supabase } from "@/lib/supabase";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function setupNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#000A1C",
      sound: "default",
    });
    console.log("Canal de notificaciones Android 'default' configurado.");
  }
}

export async function registerDeviceToken(userId: string) {
  console.log("Iniciando registro de token para usuario:", userId);
  
  // Configurar canal de notificaciones en Android
  await setupNotificationChannel();

  // 1. Pedir permiso al usuario
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log("Estado actual de permisos:", existingStatus);
  
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("Nuevo estado de permisos:", finalStatus);
  }

  if (finalStatus !== "granted") {
    console.log("Permiso de notificaciones denegado");
    return;
  }

  try {
    // 2. Obtener el token de Expo
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "b4cab86f-ce79-4ee9-90ab-eaef88ce61a8",
    });
    
    const token = tokenData.data;
    console.log("=== TOKEN DE EXPO REGISTRADO EN SUPABASE ===", {
      userId,
      token,
      platform: Platform.OS,
    });

    // 3. Guardar en tu tabla de Supabase (device_tokens)
    let { data, error } = await supabase.from("device_tokens").upsert(
      {
        user_id: userId,
        token: token,
        updated_at: new Date(),
      },
      { onConflict: "user_id" },
    ).select();

    // Manejo de autorrecuperación si el usuario existe en Auth pero falta en public.users (Error FK 23503)
    if (error && error.code === "23503") {
      console.warn(`[registerDeviceToken] Usuario ${userId} no encontrado en tabla 'users'. Intentando autorrecuperación...`);
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user && authUser.user.id === userId) {
        const { error: syncError } = await supabase.from("users").upsert({
          id: userId,
          email: authUser.user.email || "",
          name: authUser.user.user_metadata?.name || authUser.user.email?.split("@")[0] || "Usuario",
          last_name: authUser.user.user_metadata?.lastname || null,
          status: "active",
          role_id: 2,
          is_driver: false,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "id" });

        if (syncError) {
          console.error("[registerDeviceToken] Error en autorrecuperación de usuario en DB:", syncError);
        }

        // Reintentar guardar el token de notificación
        const retryResult = await supabase.from("device_tokens").upsert(
          {
            user_id: userId,
            token: token,
            updated_at: new Date(),
          },
          { onConflict: "user_id" },
        ).select();

        data = retryResult.data;
        error = retryResult.error;
      }
    }

    if (error) {
      console.error("Error guardando token en Supabase:", error);
    } else {
      console.log("Token guardado exitosamente en DB:", data);
    }
  } catch (error) {
    console.error("Error obteniendo token de expo:", error);
  }
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    // 1. Obtener los tokens del usuario desde la base de datos (pueden ser uno o varios)
    const { data: tokensData, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", userId);

    if (error || !tokensData || tokensData.length === 0) {
      console.warn("No se encontró token en DB para el usuario:", userId);
      return;
    }

    // Tomar los tokens disponibles
    const tokens = tokensData.map((t) => t.token);
    console.log(`[sendPushNotification] Enviando a ${tokens.length} token(s) para usuario ${userId}:`, tokens);
    console.log("TITLE: ", title);
    console.log("BODY: ", body);

    for (const pushToken of tokens) {
      const message = {
        to: pushToken,
        sound: "default",
        title,
        body,
        data: data || {},
        channelId: "default",
        priority: "high",
      };

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log("Notificación enviada (Ticket):", JSON.stringify(result, null, 2));

      if (result.errors) {
        console.error("Errores en el envío de notificación:", result.errors);
      }

      // Consultar recibos de entrega para diagnosticar estado real en Expo/FCM
      if (result.data?.id) {
        const ticketId = result.data.id;
        setTimeout(async () => {
          try {
            const receiptRes = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ids: [ticketId] }),
            });
            const receipts = await receiptRes.json();
            console.log("RECIBO DE ENTREGA EXPO (RECEIPTS):", JSON.stringify(receipts, null, 2));

            // Si el token expiró o fue desregistrado en FCM, eliminarlo de Supabase automáticamente
            if (receipts.data && receipts.data[ticketId]) {
              const receipt = receipts.data[ticketId];
              if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
                console.warn(`⚠️ El token ${pushToken} venció o pertenece a una instalación anterior (DeviceNotRegistered). Eliminando de DB...`);
                await supabase.from("device_tokens").delete().eq("token", pushToken);
              }
            }
          } catch (receiptErr) {
            console.error("Error obteniendo recibos de notificaciones:", receiptErr);
          }
        }, 3000);
      }
    }

  } catch (error) {
    console.error("Error enviando notificación push:", error);
  }
}

export async function sendMultiplePushNotifications(
  userIds: string[],
  title: string,
  body: string,
  data?: any
) {
  console.warn(`[notifications] Attempting to send to ${userIds.length} users:`, userIds);

  if (!userIds || userIds.length === 0) return;

  console.log("User IDs:", userIds);
  console.log("Data:", data);
  console.log("Title:", title);
  console.log("Body:", body);

  try {
    // 1. Obtener TODOS los tokens en una sola consulta SQL (.in)
    const { data: tokensData, error } = await supabase
      .from("device_tokens")
      .select("user_id, token")
      .in("user_id", userIds); // Trae todos los que coincidan con la lista

    if (error || !tokensData || tokensData.length === 0) {
      console.warn("No se encontraron tokens para los usuarios provistos.");
      return;
    }

    // 2. Construir el array de mensajes para Expo
    const messages = tokensData.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: data || {},
      channelId: "default",
      priority: "high",
    }));

    const matchedUserIds = tokensData.map((t) => t.user_id);
    console.warn(`[notifications] sending batch to ${messages.length} devices for users`, matchedUserIds);

    // 3. Enviar todo en un solo payload HTTP POST
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages), // Mandamos el array completo
    });

    const result = await response.json();
    console.log(`Lote de ${messages.length} notificaciones enviado (Ticket):`, JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error("Errores en el envío por lotes:", result.errors);
    }

    // Consultar recibos del lote y limpiar tokens caducados
    if (result.data && Array.isArray(result.data)) {
      const ticketIds = result.data.map((item: any) => item.id).filter(Boolean);
      if (ticketIds.length > 0) {
        setTimeout(async () => {
          try {
            const receiptRes = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ids: ticketIds }),
            });
            const receipts = await receiptRes.json();
            console.log("RECIBOS DE ENTREGA EN LOTE EXPO:", JSON.stringify(receipts, null, 2));

            if (receipts.data) {
              for (let i = 0; i < result.data.length; i++) {
                const ticket = result.data[i];
                const msg = messages[i];
                if (ticket?.id && receipts.data[ticket.id]) {
                  const r = receipts.data[ticket.id];
                  if (r.status === "error" && r.details?.error === "DeviceNotRegistered") {
                    console.warn(`⚠️ Limpiando token no registrado ${msg.to}...`);
                    await supabase.from("device_tokens").delete().eq("token", msg.to);
                  }
                }
              }
            }
          } catch (rErr) {
            console.error("Error obteniendo recibos en lote:", rErr);
          }
        }, 3000);
      }
    }
  } catch (error) {
    console.error("Error enviando notificaciones múltiples:", error);
  }
}