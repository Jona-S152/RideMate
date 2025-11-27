import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
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

  const handleRegister = async () => {
    setLoading(true);

    // 1) Registrar en auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (authError) {
      alert(authError.message);
      return setLoading(false);
    }

    const userId = authData.user?.id;
    if (!userId) {
      alert("Error creando el usuario");
      setLoading(false);
      return;
    }

    // 2) Insertar en tabla users
    const { error: dbError } = await supabase.from("users").insert({
      id: userId,
      name: form.name,
      last_name: form.lastname,
      email: form.email,
      is_driver: false,
      role_id: 2,
    });

    if (dbError) {
      alert(dbError.message);
      return setLoading(false);
    }

    // Pasar al Step 2
    setLoading(false);
    setStep(2);
  };

  const handleOptionalSave = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Usuario no encontrado");
      return setLoading(false);
    }

    const { error } = await supabase
      .from("users")
      .update(optional)
      .eq("id", user.id);

    if (error) alert(error.message);

    setLoading(false);

    // Final: redirigir a Home, Dashboard o donde quieras
    console.log("Perfil actualizado");
  };

  return (
    <View>

        <ThemedView lightColor={Colors.light.primary} className="w-full px-4 pt-6 rounded-bl-[40px]">
            <View className="items-center">
                <Image
                    className="mt-32 mb-32"
                    source={require('../../assets/images/TitleApp.png')}/>
            </View> 
            {/* <Image
                className="mb-1"
                source={require('../../assets/images/CarLogin.png')}/> */}
        </ThemedView>

      {/* ---------- HEADER ---------- */}
      <View className="mx-5 mt-4 mb-2">
        <Text className="text-3xl font-bold mb-6 text-primary">
            {step === 1 ? "Crear cuenta" : "Completar perfil"}
        </Text>
      </View>

      {/* ---------- STEP 1 ---------- */}
      {step === 1 && (
        <View className="mx-5 mt-2 mb-4">
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
            className="bg-primary py-4 rounded-full mt-4"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-center text-white font-semibold">
                Continuar
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ---------- STEP 2 ---------- */}
      {step === 2 && (
        <View>
          <Text className="text-gray-500 mb-4">
            Estos datos son opcionales. Puedes completarlos ahora o más tarde.
          </Text>

          <TextInput
            placeholder="Teléfono"
            className="w-full p-4 rounded-lg bg-gray-100 mb-3"
            value={optional.phone}
            onChangeText={(t) => setOptional({ ...optional, phone: t })}
          />

          <TextInput
            placeholder="Avatar URL"
            className="w-full p-4 rounded-lg bg-gray-100 mb-3"
            autoCapitalize="none"
            value={optional.avatar}
            onChangeText={(t) => setOptional({ ...optional, avatar: t })}
          />

          <TextInput
            placeholder="Dirección"
            className="w-full p-4 rounded-lg bg-gray-100 mb-3"
            value={optional.address}
            onChangeText={(t) => setOptional({ ...optional, address: t })}
          />

          <View className="flex-row justify-between mt-4">
            <Pressable
              className="bg-gray-200 py-3 px-6 rounded-full"
              onPress={() => console.log("Omitido")}
            >
              <Text className="text-gray-800">Omitir</Text>
            </Pressable>

            <Pressable
              onPress={handleOptionalSave}
              disabled={loading}
              className="bg-primary py-3 px-6 rounded-full"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Guardar</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
