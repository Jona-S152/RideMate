import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // 1. Recibe los datos del nuevo pasajero desde el Webhook
  const { record } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // 2. Buscamos quién es el conductor dueño del viaje (trip_sessions)
  const { data: trip } = await supabase
    .from("trip_sessions")
    .select("driver_id")
    .eq("id", record.trip_session_id)
    .single();

  if (!trip?.driver_id) return new Response("No se encontró conductor");

  // 3. Buscamos el Token en tu tabla device_tokens usando el driver_id
  const { data: device } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", trip.driver_id)
    .single();

  if (device?.token) {
    // 4. Enviamos la notificación a través de Expo
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: device.token,
        title: "¡Nueva solicitud de pasajero! 🚗",
        body: "Alguien quiere unirse a tu viaje.",
        data: { 
          type: 'NEW_PASSENGER', // Identificador para saber qué acción tomar
          trip_session_id: record.trip_session_id,
          passenger_id: record.passenger_id // Muy importante para el modal
        },
      }),
    });
  }

  return new Response("Notificación enviada con éxito");
});
