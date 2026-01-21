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
