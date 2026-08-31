import { supabase } from "@/lib/supabase";

export interface DiscordDriverApplicationData {
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  licenseNumber: string;
  licenseExpirationDate?: string | null;
  licenseImageUrl?: string;
  brand: string;
  model: string;
  year: number | string;
  plate: string;
  color: string;
  seatsCapacity: number;
  registrationDocUrl?: string | null;
  vehicleImageUrl?: string | null;
  isUpdate?: boolean;
}

const DISCORD_WEBHOOK_URL =
  process.env.EXPO_PUBLIC_DISCORD_WEBHOOK_URL ||
  process.env.DISCORD_WEBHOOK_URL ||
  "https://discord.com/api/webhooks/1543703207186800701/BtPL-BS1rzik7k1rj-3_thBMYbsj8AGvTtMJo9s3vdSjo0zpW4myoKbXkxAA26Otpxrm";

const SUPABASE_PROJECT_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://vqukywrmpxbldoemllaa.supabase.co"; // Fallback URL if env is missing

export const discordService = {
  /**
   * Envía una notificación formateada con Embed a Discord Webhook
   * cuando un usuario solicita ser conductor o actualiza sus documentos.
   */
  async sendDriverApplicationToDiscord(data: DiscordDriverApplicationData): Promise<boolean> {
    if (!DISCORD_WEBHOOK_URL) {
      console.warn("[discordService] DISCORD_WEBHOOK_URL no configurado.");
      return false;
    }

    try {
      // 1. Obtener datos adicionales del usuario si no fueron pasados
      let name = data.userName;
      let email = data.userEmail;

      if (!name || !email) {
        const { data: userData } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", data.userId)
          .single();

        if (userData) {
          name = name || userData.name || "Usuario Sin Nombre";
          email = email || userData.email || "No registrado";
        }
      }

      // 2. Construir URLs de la Edge Function para Aprobar / Rechazar
      const edgeFunctionBaseUrl = `${SUPABASE_PROJECT_URL}/functions/v1/handle-driver-application`;
      const approveUrl = `${edgeFunctionBaseUrl}?action=approve&userId=${encodeURIComponent(
        data.userId
      )}`;
      const rejectUrl = `${edgeFunctionBaseUrl}?action=reject&userId=${encodeURIComponent(
        data.userId
      )}`;

      // 3. Preparar URLs de imágenes formateadas
      const licenseLink = data.licenseImageUrl
        ? `[🪪 Ver Foto de Licencia](${data.licenseImageUrl})`
        : "_Sin foto de licencia_";
      const regLink = data.registrationDocUrl
        ? `[📄 Ver Matrícula / SOAT](${data.registrationDocUrl})`
        : "_Sin foto de matrícula_";
      const vehicleLink = data.vehicleImageUrl
        ? `[🚘 Ver Foto de Vehículo](${data.vehicleImageUrl})`
        : "_Sin foto de vehículo_";

      // 4. Armar el Embed de Discord
      const embedTitle = data.isUpdate
        ? "✏️ Actualización de Conductor para Re-Verificación"
        : "🚗 Nueva Solicitud de Conductor - RideMate";

      const embedColor = data.isUpdate ? 15387656 : 2449643; // Amarillo / Azul

      const payload = {
        username: "RideMate Admin Bot",
        avatar_url: "https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-bare-minimum/assets/icon.png",
        embeds: [
          {
            title: embedTitle,
            description: `Se ha registrado una solicitud de conductor en el sistema que requiere revisión administrativa.`,
            color: embedColor,
            fields: [
              {
                name: "👤 Solicitante",
                value: `**Nombre:** ${name || "N/A"}\n**Email:** ${email || "N/A"}\n**ID Usuario:** \`${data.userId}\``,
                inline: false,
              },
              {
                name: "📄 Licencia de Conducir",
                value: `**Número:** ${data.licenseNumber}\n**Expiración:** ${data.licenseExpirationDate || "No registrada"}`,
                inline: true,
              },
              {
                name: "🚘 Vehículo",
                value: `**Marca/Modelo:** ${data.brand} ${data.model} (${data.year})\n**Placa:** \`${data.plate}\` | **Color:** ${data.color}\n**Asientos:** ${data.seatsCapacity}`,
                inline: true,
              },
              {
                name: "🖼️ Documentos Adjuntos",
                value: `${licenseLink}\n${regLink}\n${vehicleLink}`,
                inline: false,
              },
              {
                name: "⚡ Acciones de Administración",
                value: `✅ **[Aprobar Solicitud](${approveUrl})**\n\n❌ **[Rechazar Solicitud](${rejectUrl})**`,
                inline: false,
              },
            ],
            image: data.licenseImageUrl ? { url: data.licenseImageUrl } : undefined,
            footer: {
              text: `RideMate Admin System • ${new Date().toLocaleString("es-EC")}`,
            },
          },
        ],
      };

      // 5. POST hacia Discord Webhook
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[discordService] Error al enviar a Discord Webhook:", response.status, errText);
        return false;
      }

      console.log("[discordService] Solicitud enviada exitosamente a Discord Webhook.");
      console.log("[discordService] Datos enviados a Discord Webhook:", JSON.stringify(payload, null, 2));
      return true;
    } catch (error: any) {
      console.error("[discordService] Excepción al enviar a Discord:", error.message);
      return false;
    }
  },
};
