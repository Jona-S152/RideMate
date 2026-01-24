import { useAuth } from "@/app/context/AuthContext";
import ChangePasswordModal from "@/components/Modals/change-password";
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

export default function EditProfileScreen() {
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const [changePassVisibleModal, setChangePassVisibleModal] = useState<boolean>(false);

    // Form States
    const [name, setName] = useState(user?.name || "");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState(user?.email || "");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

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
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("users")
                .update({
                    name,
                    last_name: lastName,
                    email
                })
                .eq("id", user.id);

            if (error) throw error;

            // Update Auth Context
            await updateUser({
                ...user,
                name: name,
                email: email
            });

            Alert.alert("Éxito", "Perfil actualizado correctamente");
            router.back();
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
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
                    <View className="relative w-32 h-32 mb-4">
                        <View className="bg-stone-200 rounded-full w-32 h-32 items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                            <Ionicons name="person" size={60} color="#94a3b8" />
                        </View>
                        <Pressable className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-slate-100">
                            <Ionicons name="camera" size={20} color={Colors.light.primary} />
                        </Pressable>
                    </View>
                    <ThemedText
                        lightColor={Colors.light.text}
                        className="text-2xl font-bold">
                        {name || "Usuario"}
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

                <View className="mb-6">
                    <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Correo electrónico</ThemedText>
                    <ThemedTextInput
                        lightColor={Colors.light.background}
                        className="py-4 px-4 rounded-full border border-slate-100 bg-slate-50"
                        placeholder="correo@ejemplo.com"
                        value={email}
                        editable={false} // Recommendation: Email usually fixed or changed via special flow
                    />
                </View>

                <Pressable
                    className="flex-row items-center py-4 px-2 mb-8"
                    onPress={() => setChangePassVisibleModal(true)}
                >
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.light.primary} />
                    <ThemedText
                        lightColor={Colors.light.primary}
                        className="ml-2 font-semibold">
                        Cambiar contraseña
                    </ThemedText>
                </Pressable>

                <Pressable
                    style={{ backgroundColor: Colors.light.secondary }}
                    className="w-full py-4 rounded-full items-center shadow-lg"
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <ThemedText className="text-white font-bold text-lg">
                            Guardar Cambios
                        </ThemedText>
                    )}
                </Pressable>
            </View>

            <ChangePasswordModal
                animationType="fade"
                transparent={true}
                visible={changePassVisibleModal}
                setVisible={setChangePassVisibleModal}
            />
        </KeyboardAwareScrollView>
    );
}
