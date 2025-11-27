import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Link } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

type User = {
  id: string;
  email: string;
  is_driver: boolean;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => Promise<void>; // espera 2 argumentos
  logout: () => Promise<void>;
};

export default function LoginScreen () {
    const { login } = useAuth()

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    
    const handleLogin = async (email: string, password: string) => {
        try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        // data.user tiene info básica, pero tu campo is_driver estará en tu tabla de usuarios
        const userId = data.user?.id;
        if (!userId) throw new Error("No se pudo obtener el ID del usuario");

        const { data: userDataRaw, error: userError } = await supabase
            .from('users')
            .select('id, email, is_driver, role_id')
            .eq('id', data.user?.id);

            if (!userDataRaw || userDataRaw.length === 0) throw new Error("Usuario no encontrado");

        const userData: User = {
            id: userDataRaw[0].id,
            email: userDataRaw[0].email,
            is_driver: userDataRaw[0].is_driver ?? false,
        };


        // Llamamos a login correctamente
        await login(data.session?.access_token ?? '', userData);
        console.log("Sesión iniciada", userData);

        } catch (error: any) {
            console.error("Error iniciando sesión:", error.message);
            alert("Email o contraseña incorrectos");
        }
    };
    
    return (
        <View>
            <ThemedView lightColor={Colors.light.primary} className="w-full px-4 pt-6 rounded-bl-[40px]">
                <View className="items-center">
                    <Image
                        className="mt-32 mb-20"
                        source={require('../../assets/images/TitleApp.png')}/>
                </View> 
                <Image
                    className="mb-1"
                    source={require('../../assets/images/CarLogin.png')}/>
            </ThemedView>
            <View className="mx-6 my-8 items-center justify-center">
                <ThemedTextInput
                    lightColor={Colors.light.background}
                    className="py-6 px-4 mb-4 w-full"
                    placeholder="Correo electrónico"
                    value={email}
                    onChangeText={setEmail}
                />

                <ThemedTextInput
                    lightColor={Colors.light.background}
                    className="py-6 px-4 mb-4 w-full"
                    secureTextEntry={true}
                    placeholder="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                />
                        
                <Pressable 
                    style={{ backgroundColor: Colors.light.secondary}}
                    className="px-8 py-4 rounded-full"
                    onPress={() => handleLogin(email, password)}>
                    <ThemedText style={{ color: 'white'}}>
                        Iniciar sesión
                    </ThemedText>
                </Pressable>

                <View className="mt-1">
                    <Link href={'/(auth)/register'}>
                        <Text style={{ color: Colors.light.primary }}>
                            ¿No tienes cuenta? Crea una
                        </Text>
                    </Link>
                </View>
            </View>
        </View>
    );
}