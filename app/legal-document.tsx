import { getLegalUrl } from "@/config/legal";
import { LegalDocumentType } from "@/interfaces/legal";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

export default function LegalDocumentScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: LegalDocumentType }>();
  const documentType: LegalDocumentType = type === "privacy" ? "privacy" : "terms";
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const url = useMemo(() => getLegalUrl(documentType), [documentType]);
  const title = documentType === "terms" ? "Términos y Condiciones" : "Política de Privacidad";

  return (
    <View className="flex-1 bg-background">
      <View className="h-24 flex-row items-center px-4 pt-8 pb-2 border-b border-slate-700">
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text className="text-white font-bold text-lg ml-4">{title}</Text>
      </View>
      {failed ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-center mb-4">No se pudo cargar el documento.</Text>
          <Pressable onPress={() => { setFailed(false); setReloadKey((key) => key + 1); }} className="rounded-full px-6 py-3 bg-secondary">
            <Text className="text-white font-semibold">Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={reloadKey}
          source={{ uri: url }}
          onError={() => setFailed(true)}
          startInLoadingState
          renderLoading={() => <ActivityIndicator className="flex-1" size="large" />}
          javaScriptEnabled
        />
      )}
    </View>
  );
}