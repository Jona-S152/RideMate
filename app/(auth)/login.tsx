import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { authService } from "@/services/auth.service";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Keyboard, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
    const { login } = useAuth()

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const HEADER_EXPANDED = 400;
    const HEADER_COLLAPSED = 185;
    const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

    const headerHeight = useRef(
        new Animated.Value(HEADER_EXPANDED)
    ).current;

    useEffect(() => {
        const showSub = Keyboard.addListener("keyboardDidShow", () => {
            Animated.timing(headerHeight, {
                toValue: HEADER_COLLAPSED,
                duration: 250,
                useNativeDriver: false,
            }).start();
        });

        const hideSub = Keyboard.addListener("keyboardDidHide", () => {
            Animated.timing(headerHeight, {
                toValue: HEADER_EXPANDED,
                duration: 250,
                useNativeDriver: false,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleLogin = async (email: string, password: string) => {
        try {
            const { session, userRecord } = await authService.signIn(email, password);
            
            // Llamamos a login correctamente
            await login(session?.access_token ?? '', userRecord);
            console.log("Sesión iniciada", userRecord);

        } catch (error: any) {
            console.error("Error iniciando sesión:", error.message);
            alert("Email o contraseña incorrectos");
        }
    };

    return (
        <KeyboardAwareScrollView className="bg-background">
            <AnimatedThemedView
                style={{ height: headerHeight }}
                lightColor={Colors.light.glassStrong}
                className="w-full px-4 pt-6 rounded-bl-[40px]"
            >
                <View className="items-center justify-center flex-1">
                    <Image
                        className="h-36"
                        style={{ resizeMode: "contain" }}
                        source={require('../../assets/images/TitleApp.png')} />
                </View>
                {/* <Image
                    className="mb-1"
                    source={require('../../assets/images/CarLogin.png')}/> */}
            </AnimatedThemedView>
            <View className="mx-6 my-8 items-center justify-center">
                <ThemedTextInput
                    lightColor={Colors.light.glassSoft}
                    className="py-6 px-4 mb-4 w-full"
                    placeholder="Correo electrónico"
                    value={email}
                    onChangeText={setEmail}
                />

                <ThemedTextInput
                    lightColor={Colors.light.glassSoft}
                    className="py-6 px-4 mb-4 w-full"
                    secureTextEntry={true}
                    placeholder="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                />

                <Pressable
                    style={{ backgroundColor: Colors.light.secondary }}
                    className="px-8 py-4 rounded-full"
                    onPress={() => handleLogin(email, password)}>
                    <ThemedText style={{ color: 'white' }}>
                        Iniciar sesión
                    </ThemedText>
                </Pressable>

                <View className="mt-1">
                    <Link href={'/(auth)/register'}>
                        <Text style={{ color: Colors.light.secondary }}>
                            ¿No tienes cuenta? Crea una
                        </Text>
                    </Link>
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
}