import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useCollapsingHeader } from "@/hooks/useCollapsingHeader";
import { authService } from "@/services/auth.service";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Keyboard, Platform, Pressable, ScrollView, Text, View } from "react-native";
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
    setLoading(true);

    try {
      const { session, userRecord } = await authService.signUp({
        email: form.email.trim(),
        password: form.password,
        name: form.name,
        lastname: form.lastname
      });

      // Guardar token + user en el contexto inmediatamente
      await login(session?.access_token ?? "", userRecord);
      setLoading(false);

    } catch (err: any) {
      console.log("Register error:", err);
      Alert.alert("Error al registrarse", err?.message ?? String(err));
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
          <Image className="h-36" style={{ resizeMode: "contain" }} source={require('../../assets/images/TitleApp.png')} />
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

          <ThemedTextInput
            lightColor={Colors.light.glassSoft}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Contraseña"
            secureTextEntry
            value={form.password}
            onChangeText={(t) => setForm({ ...form, password: t })}
          />

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
