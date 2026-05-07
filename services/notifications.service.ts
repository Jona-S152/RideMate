import { supabase } from "@/lib/supabase";
import * as Notifications from "expo-notifications";

export async function registerDeviceToken(userId: string) {
  console.log("Iniciando registro de token para usuario:", userId);
  
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
    console.log("Token de Expo obtenido:", token);

    // 3. Guardar en tu tabla de Supabase (device_tokens)
    const { data, error } = await supabase.from("device_tokens").upsert(
      {
        user_id: userId,
        token: token,
        updated_at: new Date(),
      },
      { onConflict: "user_id" },
    ).select();

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
    // 1. Obtener el token del usuario desde la base de datos
    const { data: tokenData, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", userId)
      .single();

    if (error || !tokenData?.token) {
      console.warn("No se encontró token para el usuario:", userId);
      return;
    }

    // 2. Enviar la notificación usando Expo Push API
    const message = {
      to: tokenData.token,
      sound: "default",
      title,
      body,
      data: data || {},
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
    console.log("Notificación enviada:", result);

    if (result.errors) {
      console.error("Errores en el envío de notificación:", result.errors);
    }

  } catch (error) {
    console.error("Error enviando notificación push:", error);
  }
}
