import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "./context/AuthContext";

export default function Index() {
  const { token } = useAuth();
  const [hasPendingReg, setHasPendingReg] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPending = async () => {
      try {
        const stored = await AsyncStorage.getItem("pendingRegistration");
        setHasPendingReg(!!stored);
      } catch {
        setHasPendingReg(false);
      }
    };
    checkPending();
  }, []);

  // Mientras carga el token o el estado de registro pendiente
  if (token === undefined || hasPendingReg === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(tabs)/home" />;
  } else if (hasPendingReg) {
    return <Redirect href="/(auth)/email-confirmation" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}