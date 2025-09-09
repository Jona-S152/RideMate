import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { Link } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen () {
    const { login } = useAuth();
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
                    placeholder="Nombre completo"/>

                <ThemedTextInput
                    lightColor={Colors.light.background}
                    className="py-6 px-4 mb-4 w-full"
                    placeholder="Correo electrónico"/>
                        
                <ThemedTextInput
                    lightColor={Colors.light.background}
                    className="py-6 px-4 mb-4 w-full"
                    secureTextEntry={true}
                    placeholder="Contraseña"/>
                        
                <Pressable 
                    style={{ backgroundColor: Colors.light.secondary}}
                    className="px-8 py-4 rounded-full"
                    onPress={() => login('Sesion iniciada')}>
                    <ThemedText
                        style={{ color: 'white'}}
                        >
                        Iniciar sesion
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