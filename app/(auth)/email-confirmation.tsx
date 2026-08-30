import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { authService } from "@/services/auth.service";
import LegalConsent from "@/components/legal/LegalConsent";
import { legalService } from "@/services/legal.service";
import { ActiveLegalVersions } from "@/interfaces/legal";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";

export default function EmailConfirmationScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [completedRegistration, setCompletedRegistration] = useState<{
    session: { access_token: string; user: { id: string; email?: string } };
    userRecord: any;
  } | null>(null);

  useEffect(() => {
    let pendingEmail = "";

    // Cargar datos de registro pendiente para mostrar el correo y verificar la sesión
    const loadPendingData = async () => {
      try {
        const stored = await AsyncStorage.getItem("pendingRegistration");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.email) {
            pendingEmail = parsed.email.trim().toLowerCase();
            setEmail(parsed.email);

            // Verificar si Supabase ya tiene la sesión activa del usuario recién verificado
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email?.trim().toLowerCase() === pendingEmail) {
              console.log("[email-confirmation] Sesión detectada al cargar pantalla:", session.user.email);
              await handleCompletion();
            }
          }
        }
      } catch (err) {
        console.error("Error cargando pendingRegistration:", err);
      }
    };
    loadPendingData();

    // Escuchar el evento de autenticación cuando el usuario hace clic en el enlace del correo
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[email-confirmation] Auth state change:", event, session?.user?.email);
      if (session?.user?.email) {
        const sessionEmail = session.user.email.trim().toLowerCase();
        if (pendingEmail && sessionEmail === pendingEmail) {
          console.log("[email-confirmation] Coincidencia de sesión confirmada para:", sessionEmail);
          await handleCompletion();
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleCompletion = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("pendingRegistration");
      if (!stored) {
        throw new Error("No se encontraron los datos del registro. Por favor intenta registrarte de nuevo.");
      }

      const form = JSON.parse(stored);
      console.log("[email-confirmation] Completing registration for:", form.email);

      // Fase 2: Insertar en BD y asignar tenant
      const { session, userRecord } = await authService.completeRegistration(form);
      if (!session) {
        throw new Error("No se pudo obtener la sesión después de confirmar el correo.");
      }

      setCompletedRegistration({ session, userRecord });
    } catch (err: any) {
      console.error("[email-confirmation] Error completando registro:", err);
      Toast.show({
        type: "error",
        text1: "Verificación incompleta",
        text2: err?.message || "Asegúrate de haber confirmado tu correo antes de continuar.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLegalAcceptance = async (active: ActiveLegalVersions) => {
    if (!completedRegistration) return;
    await legalService.acceptCurrentVersions(completedRegistration.userRecord.id, active);
    await AsyncStorage.removeItem("pendingRegistration");
    await login(completedRegistration.session.access_token, completedRegistration.userRecord);
    setCompletedRegistration(null);
  };

  const handleResendEmail = async () => {
    if (!email) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No se encontró la dirección de correo.",
      });
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: "ridemate://auth/callback",
        },
      });

      if (error) throw error;
      Toast.show({
        type: "success",
        text1: "Correo reenviado",
        text2: "Se ha enviado un nuevo enlace de confirmación a tu correo electrónico.",
      });
    } catch (err: any) {
      console.error("[email-confirmation] Error reenviando correo:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err?.message || "No se pudo reenviar el correo de confirmación.",
      });
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = async () => {
    await AsyncStorage.removeItem("pendingRegistration");
    await authService.signOut();
    router.replace("/(auth)/login");
  };

  if (completedRegistration) {
    return (
      <View className="flex-1 bg-background px-6 justify-center items-center">
        <LegalConsent
          title="Acepta los documentos legales"
          description="Confirma las versiones actuales para finalizar tu registro."
          onAccept={handleLegalAcceptance}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-6 justify-center items-center">
      <View
        className="w-full rounded-3xl p-8 items-center border border-slate-700 shadow-2xl"
        style={{ backgroundColor: Colors.dark.surface }}
      >
        {/* Animated Mail Icon Badge */}
        <View className="w-24 h-24 rounded-full bg-blue-500/10 items-center justify-center mb-6 border border-blue-500/20">
          <Ionicons name="mail-unread" size={48} color={Colors.dark.secondary} />
        </View>

        {/* Title & Description */}
        <Text className="text-2xl font-bold text-white text-center mb-3">
          ¡Verifica tu correo!
        </Text>
        <Text className="text-slate-400 text-center mb-2 text-base leading-6">
          Hemos enviado un enlace de confirmación a:
        </Text>
        {email ? (
          <View className="bg-slate-800/80 px-4 py-2 rounded-xl mb-6 border border-slate-700">
            <Text className="text-blue-400 font-bold text-base text-center">
              {email}
            </Text>
          </View>
        ) : null}

        <Text className="text-slate-400 text-center text-sm mb-8">
          Por favor revisa tu bandeja de entrada (o carpeta de spam) y haz clic en el enlace para activar tu cuenta.
        </Text>

        {/* Primary Action Button */}
        <Pressable
          onPress={handleCompletion}
          disabled={loading}
          className="w-full h-14 rounded-2xl items-center justify-center mb-4"
          style={{ backgroundColor: Colors.dark.secondary }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text className="text-white font-bold text-base">
                Ya confirmé mi correo
              </Text>
            </View>
          )}
        </Pressable>

        {/* Secondary Resend Button */}
        <Pressable
          onPress={handleResendEmail}
          disabled={resending}
          className="w-full h-12 rounded-2xl items-center justify-center bg-slate-800 border border-slate-700 mb-6"
        >
          {resending ? (
            <ActivityIndicator color={Colors.dark.secondary} />
          ) : (
            <Text className="text-slate-300 font-semibold text-sm">
              Reenviar correo de confirmación
            </Text>
          )}
        </Pressable>

        {/* Return to Login */}
        <Pressable onPress={handleBackToLogin}>
          <Text className="text-slate-400 text-sm font-medium">
            ← Volver a Iniciar Sesión
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
