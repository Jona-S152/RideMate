import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useCollapsingHeader } from "@/hooks/useCollapsingHeader";
import { authService } from "@/services/auth.service";
import { legalService } from "@/services/legal.service";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, Image, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const HEADER_EXPANDED = SCREEN_HEIGHT * 0.50; // 45%
  const HEADER_COLLAPSED = SCREEN_HEIGHT * 0.30; // 22%

  const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState({ terms: false, privacy: false });

  const headerHeight = useCollapsingHeader({
    expanded: HEADER_EXPANDED,
    collapsed: HEADER_COLLAPSED,
    keyboardHeight,
  });
  console.log("headerHeight:", headerHeight);

  // Datos obligatorios
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    lastname: "",
  });

  // Datos opcionales
  const [optional, setOptional] = useState({
    phone: "",
    avatar: "",
    address: "",
  });

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleRegister = async () => {
    if (!form.name || !form.lastname || !form.email || !form.password) {
      Toast.show({
        type: "error",
        text1: "Campos requeridos",
        text2: "Por favor completa todos los campos.",
      });
      return;
    }

    // Validate password requirements
    const reqs = {
      minLength: form.password.length >= 8,
      hasUppercase: /[A-Z]/.test(form.password),
      hasLowercase: /[a-z]/.test(form.password),
      hasNumber: /[0-9]/.test(form.password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password),
    };
    const allMet = Object.values(reqs).every(Boolean);
    if (!allMet) {
      Toast.show({
        type: "warning",
        text1: "Contraseña inválida",
        text2: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.",
      });
      return;
    }

    if (!legalAccepted.terms || !legalAccepted.privacy) {
      Toast.show({
        type: "warning",
        text1: "Aceptación requerida",
        text2: "Debes aceptar los Términos y la Política de Privacidad para continuar.",
      });
      return;
    }

    setLoading(true);

    try {
      // Phase 1: Register in Supabase Auth (sends confirmation email or registers directly)
      const res = await authService.signUp({
        email: form.email.trim(),
        password: form.password,
        name: form.name,
        lastname: form.lastname,
        legal: await legalService.getActiveDocuments(),
      });

      if (!res.needsEmailConfirmation && res.session) {
        await login(res.session.access_token, {
          id: res.session.user.id,
          email: res.session.user.email || form.email.trim(),
          is_driver: false,
          driver_mode: false,
          name: `${form.name} ${form.lastname}`.trim(),
        });
        Toast.show({
          type: "success",
          text1: "¡Registro Exitoso!",
          text2: "Tu cuenta ha sido creada.",
        });
        router.replace('/(tabs)/available-routes'); // REDIRIGIR A HOME
        return;
      }

      // Save form data for Phase 2 (after email confirmation)
      await AsyncStorage.setItem('pendingRegistration', JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        name: form.name,
        lastname: form.lastname,
        legal: await legalService.getActiveDocuments(),
      }));

      // Navigate to email confirmation screen
      router.push('/(auth)/email-confirmation');
    } catch (err: any) {
      console.log("Register error:", err);
      Toast.show({
        type: "error",
        text1: "Error al registrarse",
        text2: err?.message ?? String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AnimatedThemedView
        lightColor={Colors.light.glassStrong}
        style={{ height: headerHeight }}
        className="w-full px-4 pt-6 rounded-bl-[40px]"
      >
        <View className="items-center justify-center flex-1">
          <Image className="h-36" style={{ resizeMode: "contain" }} source={require('../../assets/brand-assets/SplashScreen_DarkMode.png')} />
        </View>
      </AnimatedThemedView>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: keyboardHeight + 40,
        }}
      >
        <View className="mx-5 mt-4 mb-2">
          <Text className="text-3xl font-bold mb-6 text-textPrimary">
            Crear cuenta
          </Text>
        </View>

        <View className="mx-5 mt-2">
          <ThemedTextInput
            lightColor={Colors.light.glassSoft}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Nombre"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />

          <ThemedTextInput
            lightColor={Colors.light.glassSoft}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Apellido"
            value={form.lastname}
            onChangeText={(t) => setForm({ ...form, lastname: t })}
          />

          <ThemedTextInput
            lightColor={Colors.light.glassSoft}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
          />

          {/* Password field with eye toggle */}
          <View className="mb-4">
            {/* Input row */}
            <ThemedView
              className="flex-row items-center p-4 rounded-full"
              style={{ borderWidth: 1, borderColor: Colors.dark.borderColor }}
            >
              <TextInput
                style={{ color: Colors.dark.text }}
                placeholderTextColor="rgba(160,174,203,0.9)"
                className="flex-1"
                placeholder="Contraseña"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(t) => setForm({ ...form, password: t })}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} className="p-2">
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </Pressable>
            </ThemedView>
            {/* Password Requirements */}
            {form.password.length > 0 && (() => {
              const reqs = {
                minLength: form.password.length >= 8,
                hasUppercase: /[A-Z]/.test(form.password),
                hasLowercase: /[a-z]/.test(form.password),
                hasNumber: /[0-9]/.test(form.password),
                hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password),
              };
              return (
                <View
                  className="px-4 pb-3 mt-1 rounded-xl"
                  style={{
                    borderColor: Colors.dark.borderWarning,
                    borderWidth: 1,
                    backgroundColor: Colors.dark.warning,
                    paddingTop: 12,
                  }}
                >
                  {([
                    [reqs.minLength, "Mínimo 8 caracteres"],
                    [reqs.hasUppercase, "Al menos una mayúscula"],
                    [reqs.hasLowercase, "Al menos una minúscula"],
                    [reqs.hasNumber, "Al menos un número"],
                    [reqs.hasSpecial, "Al menos un carácter especial"],
                  ] as [boolean, string][]).map(([met, label]) => (
                    <View key={label} className="flex-row items-center mb-1">
                      <Ionicons name={met ? "checkmark-circle" : "ellipse-outline"} size={14} color={met ? "#22c55e" : "#64748b"} />
                      <Text className="ml-2 text-xs" style={{ color: met ? "#22c55e" : "#64748b" }}>{label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>

          {(["terms", "privacy"] as const).map((type) => {
            const checked = legalAccepted[type];
            return (
              <View key={type} className="flex-row items-center mb-3">
                <Pressable
                  onPress={() => setLegalAccepted((current) => ({ ...current, [type]: !current[type] }))}
                  className="mr-3"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                >
                  <Ionicons name={checked ? "checkbox" : "square-outline"} size={25} color={checked ? Colors.dark.secondary : "#94a3b8"} />
                </Pressable>
                <Pressable className="flex-1" onPress={() => router.push({ pathname: "/legal-document", params: { type } })}>
                  <Text className="text-blue-400 underline">{legalService.getDocumentLabel(type)}</Text>
                </Pressable>
              </View>
            );
          })}

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            className="bg-secondary py-4 rounded-full mt-4"
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-center font-semibold text-white">Continuar</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
