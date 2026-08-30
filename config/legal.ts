import { LegalDocumentType } from "@/interfaces/legal";

const legalUrls: Record<LegalDocumentType, string | undefined> = {
  terms: process.env.EXPO_PUBLIC_TERMS_URL,
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL,
};

export function getLegalUrl(type: LegalDocumentType): string {
  const url = legalUrls[type];
  if (!url) {
    throw new Error(`No se configuró la URL legal para: ${type}.`);
  }
  return url;
}