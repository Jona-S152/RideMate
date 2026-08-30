import { ActiveLegalVersions, LegalStatus } from "@/interfaces/legal";
import { legalService } from "@/services/legal.service";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import LegalConsent from "./LegalConsent";

type LegalUpdateGuardProps = {
  userId?: string;
  children: React.ReactNode;
};

export default function LegalUpdateGuard({ userId, children }: LegalUpdateGuardProps) {
  const [status, setStatus] = useState<LegalStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!userId) {
      setStatus(null);
      setError(null);
      return;
    }

    let active = true;
    setStatus(null);
    setError(null);
    legalService.getStatus(userId)
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch((loadError: any) => {
        if (active) setError(loadError?.message || "No se pudo verificar la aceptación legal.");
      });

    return () => {
      active = false;
    };
  }, [userId, retry]);

  if (!userId) return <>{children}</>;

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-white text-center mb-4">{error}</Text>
        <Text className="text-blue-400" onPress={() => setRetry((value) => value + 1)}>Reintentar</Text>
      </View>
    );
  }

  if (!status) {
    return <View className="flex-1 bg-background items-center justify-center"><ActivityIndicator size="large" /></View>;
  }

  if (!status.compliant) {
    const acceptCurrentVersions = async (activeVersions: ActiveLegalVersions) => {
      await legalService.acceptCurrentVersions(userId, activeVersions);
      setStatus({ ...status, active: activeVersions, compliant: true });
    };

    return (
      <View className="flex-1 bg-background px-6 justify-center">
        <LegalConsent
          title="Actualización legal"
          description="Debes aceptar las versiones actuales para continuar usando RideMate."
          onAccept={acceptCurrentVersions}
        />
      </View>
    );
  }

  return <>{children}</>;
}