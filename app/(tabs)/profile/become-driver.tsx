import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Keyboard, Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function BecomeDriverScreen() {
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form States
    const [name, setName] = useState(user?.name || "");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState(user?.email || "");

    // Animation Constants
    const HEADER_EXPANDED = 300;
    const HEADER_COLLAPSED = 140;
    const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);
    const headerHeight = useRef(new Animated.Value(HEADER_EXPANDED)).current;

    useEffect(() => {
        fetchUserDetails();

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

    const fetchUserDetails = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from("users")
                .select("name, last_name, email")
                .eq("id", user.id)
                .single();

            if (error) throw error;
            if (data) {
                setName(data.name || "");
                setLastName(data.last_name || "");
                setEmail(data.email || "");
            }
        } catch (error: any) {
            console.error("Error fetching user details:", error.message);
        }
    };

    const handleApply = async () => {
        try {
            if (!user?.id) {
                Alert.alert("Error", "Por favor inicia sesión primero.");
                return;
            }

            setLoading(true);

            // In a real app, this might involve more fields (license, plate, etc.)
            // But for now, we follow the existing logic of setting is_driver = true
            const { error } = await supabase
                .from("users")
                .update({
                    is_driver: true,
                    name: name,
                    last_name: lastName
                })
                .eq("id", user.id);

            if (error) throw error;

            await updateUser({
                ...user,
                is_driver: true,
                driver_mode: true, // Auto-switch to driver mode usually
                name: name
            });

            Alert.alert("¡Felicidades!", "Ahora eres un conductor verificado.");
            router.replace("/(tabs)/profile");

        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAwareScrollView className="flex-1 bg-white" bounces={false}>
            <AnimatedThemedView
                style={{ height: headerHeight }}
                lightColor={Colors.light.primary}
                className="w-full px-4 pt-6 rounded-bl-[40px] justify-center"
            >
                <View className="items-center">
                    <View className="bg-white/20 p-4 rounded-full mb-4">
                        <Ionicons name="car-sport" size={60} color="white" />
                    </View>
                    <ThemedText
                        lightColor="white"
                        className="text-2xl font-bold text-center">
                        Conviértete en Conductor
                    </ThemedText>
                    <ThemedText
                        lightColor="white"
                        className="text-sm opacity-80 text-center px-8 mt-2">
                        Completa tus datos para empezar a compartir tus viajes
                    </ThemedText>
                </View>
            </AnimatedThemedView>

            <View className="px-6 py-8">
                <View className="mb-6">
                    <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Nombres</ThemedText>
                    <ThemedTextInput
                        lightColor={Colors.light.background}
                        className="py-4 px-4 rounded-full border border-slate-100"
                        placeholder="Tus nombres"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View className="mb-6">
                    <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Apellidos</ThemedText>
                    <ThemedTextInput
                        lightColor={Colors.light.background}
                        className="py-4 px-4 rounded-full border border-slate-100"
                        placeholder="Tus apellidos"
                        value={lastName}
                        onChangeText={setLastName}
                    />
                </View>

                <View className="mb-8">
                    <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Correo electrónico</ThemedText>
                    <ThemedTextInput
                        lightColor={Colors.light.background}
                        className="py-4 px-4 rounded-full border border-slate-100 bg-slate-50"
                        value={email}
                        editable={false}
                    />
                </View>

                <View className="bg-blue-50 p-4 rounded-2xl mb-8 flex-row items-center">
                    <Ionicons name="information-circle" size={24} color={Colors.light.primary} />
                    <ThemedText className="flex-1 ml-3 text-sm text-slate-600">
                        Al aplicar, confirmas que tienes una licencia de conducir válida y cumples con los términos de servicio.
                    </ThemedText>
                </View>

                <Pressable
                    style={{ backgroundColor: Colors.light.secondary }}
                    className="w-full py-4 rounded-full items-center shadow-lg"
                    onPress={handleApply}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <ThemedText className="text-white font-bold text-lg">
                            Aplicar como Conductor
                        </ThemedText>
                    )}
                </Pressable>
            </View>
        </KeyboardAwareScrollView>
    );
}
