import { Colors } from "@/constants/Colors";
import { ActiveLegalVersions } from "@/interfaces/legal";
import { legalService } from "@/services/legal.service";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type LegalConsentProps = {
  onAccept: (active: ActiveLegalVersions) => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
  title?: string;
  description?: string;
};

export default function LegalConsent({ onAccept, onCancel, title = "Documentos legales", description = "Revisa y acepta los documentos legales para continuar." }: LegalConsentProps) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveLegalVersions | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      setActive(await legalService.getActiveDocuments());
    } catch (loadError: any) {
      setError(loadError?.message || "No se pudieron cargar los documentos legales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleAccept = async () => {
    if (!active || !termsAccepted || !privacyAccepted) return;
    setSubmitting(true);
    try {
      await onAccept(active);
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (type: "terms" | "privacy") => {
    if (type === "terms") setTermsAccepted((value) => !value);
    else setPrivacyAccepted((value) => !value);
  };

  if (loading) {
    return <ActivityIndicator color={Colors.dark.secondary} size="large" />;
  }

  if (error || !active) {
    return (
      <View className="items-center px-6">
        <Text className="text-center text-slate-300 mb-4">{error || "No hay documentos legales disponibles."}</Text>
        <Pressable onPress={loadDocuments} className="rounded-full px-6 py-3" style={{ backgroundColor: Colors.dark.secondary }}>
          <Text className="text-white font-semibold">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="w-full rounded-3xl p-6" style={{ backgroundColor: Colors.dark.surface }}>
      <Text className="text-2xl font-bold text-white text-center mb-3">{title}</Text>
      <Text className="text-slate-300 text-center mb-6">{description}</Text>

      {(["terms", "privacy"] as const).map((type) => {
        const checked = type === "terms" ? termsAccepted : privacyAccepted;
        return (
          <View key={type} className="flex-row items-center mb-4">
            <Pressable onPress={() => toggle(type)} className="mr-3" accessibilityRole="checkbox" accessibilityState={{ checked }}>
              <Ionicons name={checked ? "checkbox" : "square-outline"} size={26} color={checked ? Colors.dark.secondary : "#94a3b8"} />
            </Pressable>
            <Pressable className="flex-1" onPress={() => {
              console.log("Type: ", type);
              router.push({ pathname: "/legal-document", params: { type } })
            }}>
              <Text className="text-blue-400 underline">{legalService.getDocumentLabel(type)}</Text>
              <Text className="text-xs text-slate-400 mt-1">Versión {active[type].version}</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable
        onPress={handleAccept}
        disabled={submitting || !termsAccepted || !privacyAccepted}
        className="h-14 rounded-2xl items-center justify-center mt-3"
        style={{ backgroundColor: termsAccepted && privacyAccepted ? Colors.dark.secondary : "#475569" }}
      >
        {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Aceptar y continuar</Text>}
      </Pressable>
      {onCancel ? (
        <Pressable onPress={onCancel} disabled={submitting} className="items-center mt-4 py-2">
          <Text className="text-slate-400">Cancelar y volver</Text>
        </Pressable>
      ) : null}
    </View>
  );
}