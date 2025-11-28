import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);

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

  /** Helper: obtain an active session (tries getSession, then signInWithPassword) */
  const ensureSession = async (email: string, password: string) => {
    // try current session first
    let { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) return sessionData.session;

    // if not, try to sign in immediately (works if email confirmation is off)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // return null to allow caller to handle
      return null;
    }
    // try getSession again
    ({ data: sessionData } = await supabase.auth.getSession());
    return sessionData.session ?? signInData.session ?? null;
  };

  const handleRegister = async () => {
    setLoading(true);

    try {
      // 1) Crear user en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        // options: { emailRedirectTo: 'exp://..' } // opcional según config
      });

      if (authError) throw authError;

      // 2) Obtener sesión activa (puede que signUp no haya creado sesión inmediatamente)
      // intentamos garantizar que haya sesión y token
      const session = await ensureSession(form.email.trim(), form.password);

      if (!session?.user) {
        // Si NO hay sesión, podemos aún intentar insertar usando authData.user.id
        // pero si RLS requiere session (auth.uid()) el insert fallará.
        // Mejor informar al usuario.
        Alert.alert(
          "Atención",
          "No se pudo iniciar sesión automáticamente. Intenta iniciar sesión manualmente."
        );
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // 3) Insertar fila en public.users (asegúrate de que created_at tenga default y password no exista)
      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        name: form.name || null,
        last_name: form.lastname || null,
        email: form.email,
        is_driver: false,
        role_id: 2,
      });

      if (insertError) throw insertError;

      // 4) Construir objeto user para el context (puedes ajustar campos que necesites)
      const userForContext = {
        id: userId,
        email: form.email,
        is_driver: false,
      };

      // 5) Guardar token + user en el contexto inmediatamente
      await login(session.access_token ?? "", userForContext);

      // 6) Avanzar al step opcional (pero ya está guardado en contexto)
      setLoading(false);

    } catch (err: any) {
      console.log("Register error:", err);
      Alert.alert("Error al registrarse", err?.message ?? String(err));
      setLoading(false);
    }
  };

  return (
    <View>
      <ThemedView lightColor={Colors.light.primary} className="w-full px-4 pt-6 rounded-bl-[40px]">
        <View className="items-center">
          <Image className="mt-32 mb-32" source={require('../../assets/images/TitleApp.png')} />
        </View>
      </ThemedView>

      <View className="mx-5 mt-4 mb-2">
        <Text className="text-3xl font-bold mb-6 text-primary">
          Crear cuenta
        </Text>
      </View>

        <View className="mx-5 mt-2">
          <ThemedTextInput
            lightColor={Colors.light.background}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Nombre"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />

          <ThemedTextInput
            lightColor={Colors.light.background}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Apellido"
            value={form.lastname}
            onChangeText={(t) => setForm({ ...form, lastname: t })}
          />

          <ThemedTextInput
            lightColor={Colors.light.background}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
          />

          <ThemedTextInput
            lightColor={Colors.light.background}
            className="py-6 px-4 mb-4 w-full"
            placeholder="Contraseña"
            secureTextEntry
            value={form.password}
            onChangeText={(t) => setForm({ ...form, password: t })}
          />

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            className="bg-yellow-500 py-4 rounded-full mt-4"
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-center font-semibold">Continuar</Text>}
          </Pressable>
        </View>

      
    </View>
  );
}
