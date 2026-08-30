import { ActiveLegalVersions, LegalAcceptance, LegalDocumentType, LegalStatus } from "@/interfaces/legal";
import { supabase } from "@/lib/supabase";

const legalDocumentColumns = "id, type, version, is_active, published_at";

export const legalService = {
  async getActiveDocuments(): Promise<ActiveLegalVersions> {
    const { data, error } = await supabase
      .from("legal_documents")
      .select(legalDocumentColumns)
      .eq("is_active", true)
      .in("type", ["terms", "privacy"])
      .order("published_at", { ascending: false });

    if (error) throw error;

    const documents = data ?? [];
    const terms = documents.find((document) => document.type === "terms");
    const privacy = documents.find((document) => document.type === "privacy");

    if (!terms || !privacy) {
      throw new Error("Los documentos legales activos no están disponibles.");
    }

    return { terms, privacy } as ActiveLegalVersions;
  },

  async getStatus(userId: string): Promise<LegalStatus> {
    const [{ data: user, error: userError }, active] = await Promise.all([
      supabase
        .from("users")
        .select("accepted_terms_version, accepted_privacy_version, accepted_legal_at")
        .eq("id", userId)
        .maybeSingle(),
      this.getActiveDocuments(),
    ]);

    if (userError) throw userError;
    if (!user) throw new Error("No se encontró el perfil del usuario.");

    const accepted: LegalAcceptance = user;
    return {
      active,
      accepted,
      compliant:
        accepted.accepted_terms_version === active.terms.version &&
        accepted.accepted_privacy_version === active.privacy.version,
    };
  },

  async acceptCurrentVersions(userId: string, active?: ActiveLegalVersions): Promise<LegalAcceptance> {
    const current = active ?? (await this.getActiveDocuments());
    const accepted_legal_at = new Date().toISOString();
    const acceptance = {
      accepted_terms_version: current.terms.version,
      accepted_privacy_version: current.privacy.version,
      accepted_legal_at,
    };

    const { error } = await supabase.from("users").update(acceptance).eq("id", userId);
    if (error) throw error;

    return acceptance;
  },

  getDocumentLabel(type: LegalDocumentType): string {
    return type === "terms" ? "Términos y Condiciones" : "Política de Privacidad";
  },
};