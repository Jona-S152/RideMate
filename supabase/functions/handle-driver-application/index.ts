import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    // 1. Extraer parámetros (soporta GET desde enlaces o POST JSON)
    let action = url.searchParams.get("action");
    let userId = url.searchParams.get("userId");
    let rejectionReason = url.searchParams.get("reason");

    if (req.method === "POST") {
      try {
        const body = await req.json();
        action = action || body.action;
        userId = userId || body.userId || body.user_id;
        rejectionReason = rejectionReason || body.rejectionReason || body.rejection_reason;
      } catch {
        // Ignora error si no hay body json
      }
    }

    // 2. Validación de Seguridad (Token Secreto)
    // const EXPECTED_SECRET = Deno.env.get("ADMIN_ACTION_SECRET") || "RideMate_Secret_Token_2026_xK9#pL";
    // if (secret !== EXPECTED_SECRET) {
    //   return new Response("<h1>❌ Acceso denegado: Token no válido</h1>", {
    //     headers: { "Content-Type": "text/html; charset=utf-8" },
    //     status: 401,
    //   });
    // }

    if (!action || !userId) {
      return new Response("Faltan parámetros requeridos (action, userId)", { status: 400 });
    }

    // 3. Inicializar cliente Supabase Admin (Service Role)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 4. Obtener información del usuario para la notificación
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    const userName = userData?.name || "Usuario";

    // 5. Lógica según acción
    if (action === "approve") {
      // 5.1 Actualizar driver_profiles -> status = 'approved'
      const { error: profileError } = await supabase
        .from("driver_profiles")
        .update({
          status: "approved",
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Error al actualizar driver_profiles:", profileError);
        return new Response(`Error en Base de Datos (driver_profiles): ${profileError.message}`, { status: 500 });
      }

      // 5.2 Actualizar public.users -> is_driver = true
      const { error: userError } = await supabase
        .from("users")
        .update({ is_driver: true })
        .eq("id", userId);

      if (userError) {
        console.error("Error al actualizar users:", userError);
        return new Response(`Error en Base de Datos (users): ${userError.message}`, { status: 500 });
      }

      // 5.3 Enviar Notificación Push vía Expo
      const { data: device } = await supabase
        .from("device_tokens")
        .select("token")
        .eq("user_id", userId)
        .single();

      if (device?.token) {
        console.log("Envio notificación", JSON.stringify(device, null, 2));
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: device.token,
            title: "¡Solicitud Aprobada! 🎉",
            body: "Tu perfil de conductor ha sido verificado. ¡Ya puedes publicar viajes en RideMate!",
            data: { type: "DRIVER_APPROVED" },
          }),
        });
      }

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Solicitud Aprobada</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #334155; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            .icon { font-size: 64px; margin-bottom: 16px; }
            h1 { color: #22c55e; margin: 0 0 12px 0; font-size: 24px; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0; }
            strong { color: #f8fafc; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>¡Solicitud Aprobada!</h1>
            <p>El usuario <strong>${userName}</strong> ha sido verificado exitosamente como Conductor en RideMate.</p>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });

    } else if (action === "reject") {
      const reason = rejectionReason || "Solicitud rechazada por la administración.";

      // 5.1 Actualizar driver_profiles -> status = 'rejected'
      const { error: profileError } = await supabase
        .from("driver_profiles")
        .update({
          status: "rejected",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Error al actualizar driver_profiles:", profileError);
        return new Response(`Error en Base de Datos (driver_profiles): ${profileError.message}`, { status: 500 });
      }

      // 5.2 Actualizar public.users -> is_driver = false
      const { error: userError } = await supabase
        .from("users")
        .update({ is_driver: false })
        .eq("id", userId);

      if (userError) {
        console.error("Error al actualizar users:", userError);
        return new Response(`Error en Base de Datos (users): ${userError.message}`, { status: 500 });
      }

      // 5.3 Enviar Notificación Push vía Expo
      const { data: device } = await supabase
        .from("device_tokens")
        .select("token")
        .eq("user_id", userId)
        .single();

      if (device?.token) {
        console.log("Envio notificación", JSON.stringify(device, null, 2));
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: device.token,
            title: "Solicitud Rechazada ⚠️",
            body: `Tu solicitud de conductor ha sido rechazada. Motivo: ${reason}`,
            data: { type: "DRIVER_REJECTED" },
          }),
        });
      }

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Solicitud Rechazada</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #334155; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            .icon { font-size: 64px; margin-bottom: 16px; }
            h1 { color: #ef4444; margin: 0 0 12px 0; font-size: 24px; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0; }
            strong { color: #f8fafc; }
            .reason { background: #0f172a; padding: 12px; border-radius: 12px; color: #fca5a5; font-size: 13px; margin-top: 16px; border: 1px solid #450a0a; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <h1>Solicitud Rechazada</h1>
            <p>La solicitud del usuario <strong>${userName}</strong> fue rechazada.</p>
            <div class="reason">Motivo: ${reason}</div>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Acción no soportada. Usa action=approve o action=reject", { status: 400 });
  } catch (err: any) {
    console.error("Excepción en handle-driver-application:", err.message);
    return new Response(`Error interno: ${err.message}`, { status: 500 });
  }
});