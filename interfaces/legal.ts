export type LegalDocumentType = "terms" | "privacy";

export type LegalDocument = {
  id: string;
  type: LegalDocumentType;
  version: string;
  content: string;
  is_active: boolean;
  published_at: string;
};

export type ActiveLegalVersions = {
  terms: LegalDocument;
  privacy: LegalDocument;
};

export type LegalAcceptance = {
  accepted_terms_version?: string | null;
  accepted_privacy_version?: string | null;
  accepted_legal_at?: string | null;
};

export type LegalStatus = {
  compliant: boolean;
  active: ActiveLegalVersions;
  accepted: LegalAcceptance;
};