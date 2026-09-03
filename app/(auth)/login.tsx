import LegalConsent from "@/components/legal/LegalConsent";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useAppInsets } from "@/hooks/useAppInsets";
import { ActiveLegalVersions } from "@/interfaces/legal";
import { AuthSessionResponse, authService } from "@/services/auth.service";
import { legalService } from "@/services/legal.service";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Keyboard, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
    const { login } = useAuth()
    const insets = useAppInsets();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [pendingLogin, setPendingLogin] = useState<{
        session: NonNullable<AuthSessionResponse["session"]>;
        userRecord: AuthSessionResponse["userRecord"];
    } | null>(null);
    const [loginLoading, setLoginLoading] = useState(false);
    const [legalLoading, setLegalLoading] = useState(false);

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
        if (loginLoading) return;
        setLoginLoading(true);
        try {
            const { session, userRecord } = await authService.signIn(email, password);

            // Llamamos a login correctamente
            if (!session) throw new Error("No se pudo iniciar sesión.");

            const legalStatus = await legalService.getStatus(userRecord.id);
            console.warn("Legal status: ", JSON.stringify(legalStatus, null, 2));
            if (!legalStatus.compliant) {
                setPendingLogin({ session, userRecord });
                return;
            }
            await login(session.access_token, userRecord);
            console.log("Sesión iniciada", userRecord);

        } catch (error: any) {
            await authService.signOut().catch(() => { });
            console.error("Error iniciando sesión:", error.message);
            Toast.show({
                type: "error",
                text1: "Error de Inicio de Sesión",
                text2: error.message || "Usuario no encontrado o credenciales incorrectas",
            });
        } finally {
            setLoginLoading(false);
        }
    };

    const acceptLegalAndLogin = async (active: ActiveLegalVersions) => {
        if (!pendingLogin) return;
        setLegalLoading(true);
        try {
            await legalService.acceptCurrentVersions(pendingLogin.userRecord.id, active);
            await login(pendingLogin.session.access_token, pendingLogin.userRecord);
            setPendingLogin(null);
        } catch (error: any) {
            await authService.signOut();
            setPendingLogin(null);
            Toast.show({
                type: "error",
                text1: "No se pudo aceptar la información legal",
                text2: error?.message || "Intenta nuevamente.",
            });
        } finally {
            setLegalLoading(false);
        }
    };

    const cancelPendingLogin = async () => {
        await authService.signOut();
        setPendingLogin(null);
        setLegalLoading(false);
    };

    if (pendingLogin) {
        return (
            <View className="flex-1 bg-background px-6 justify-center items-center" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                <LegalConsent
                    title="Actualización legal"
                    description="Debes aceptar los Términos y la Política de Privacidad para iniciar sesión en RideMate."
                    onAccept={acceptLegalAndLogin}
                    onCancel={cancelPendingLogin}
                />
                {legalLoading ? <ActivityIndicator className="mt-4" /> : null}
            </View>
        );
    }

    return (
        <KeyboardAwareScrollView className="bg-background" contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
            <AnimatedThemedView
                style={{ height: headerHeight, paddingTop: insets.top }}
                lightColor={Colors.light.glassStrong}
                className="w-full px-4 rounded-bl-[40px]"
            >
                <View className="items-center justify-center flex-1">
                    <Image
                        className="h-36"
                        style={{ resizeMode: "contain" }}
                        source={require('../../assets/brand-assets/SplashScreen_DarkMode.png')} />
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

                <View className="relative w-full mb-4 justify-center">
                    <ThemedTextInput
                        lightColor={Colors.light.glassSoft}
                        className="py-6 pl-4 pr-12 w-full"
                        secureTextEntry={!showPassword}
                        placeholder="Contraseña"
                        value={password}
                        onChangeText={setPassword}
                    />
                    <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        className="absolute right-4 p-2 z-10"
                    >
                        <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color={Colors.light.textSecondary}
                        />
                    </Pressable>
                </View>

                <Pressable
                    style={{ backgroundColor: loginLoading ? "#64748b" : Colors.light.secondary }}
                    className="px-8 py-4 rounded-full min-w-[170px] items-center"
                    disabled={loginLoading}
                    onPress={() => handleLogin(email, password)}>
                    {loginLoading ? (
                        <View className="flex-row items-center">
                            <ActivityIndicator color="white" size="small" />
                            <ThemedText className="ml-2" style={{ color: 'white' }}>
                                Iniciando sesión...
                            </ThemedText>
                        </View>
                    ) : (
                        <ThemedText style={{ color: 'white' }}>
                            Iniciar sesión
                        </ThemedText>
                    )}
                </Pressable>

                <View className="mt-4">
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