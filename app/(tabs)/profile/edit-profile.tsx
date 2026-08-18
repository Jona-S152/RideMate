import { useAuth } from "@/app/context/AuthContext";
import AvatarStudioModal from "@/components/Modals/avatar-studio-modal";
import ChangePasswordModal from "@/components/Modals/change-password";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { userService } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Keyboard, Pressable, View } from "react-native";
import Toast from "react-native-toast-message";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export default function EditProfileScreen() {
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const [changePassVisibleModal, setChangePassVisibleModal] = useState<boolean>(false);

    // Form States
    const [name, setName] = useState(user?.name || "");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState(user?.email || "");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_profile || null);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneError, setPhoneError] = useState("");
    const [studioVisible, setStudioVisible] = useState(false);
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
            const data = await userService.getUserProfile(user.id);
            if (data) {
                setName(data.name || "");
                setLastName(data.last_name || "");
                setEmail(data.email || "");
                setPhoneNumber(data.phone_number ? data.phone_number.replace(/^\+593/, "") : "");
                if (data.avatar_profile) setAvatarUrl(data.avatar_profile);
            }
        } catch (error: any) {
            console.error("Error fetching user details:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (text: string) => {
        const cleaned = text.replace(/\D/g, "");
        const truncated = cleaned.slice(0, 9);
        setPhoneNumber(truncated);

        if (truncated.length > 0 && truncated.length < 9) {
            setPhoneError("El número debe tener 9 dígitos");
        } else {
            setPhoneError("");
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;

        if (phoneNumber.length > 0 && phoneNumber.length !== 9) {
            Toast.show({
                type: "warning",
                text1: "Número inválido",
                text2: "El número de teléfono debe tener exactamente 9 dígitos.",
            });
            return;
        }

        setSaving(true);
        try {
            const fullPhoneNumber = phoneNumber ? `+593${phoneNumber}` : undefined;

            const isUpdated = await userService.updateProfile(user.id, {
                name,
                last_name: lastName,
                email,
                avatar_profile: avatarUrl || undefined,
                phone_number: fullPhoneNumber
            });

            if (!isUpdated) {
                Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: "No se ha podido actualizar la información del perfil.",
                });
                return;
            }
            // Update Auth Context
            await updateUser({
                ...user,
                name: name,
                email: email,
                avatar_profile: avatarUrl || undefined,
                phone_number: fullPhoneNumber
            });

            Toast.show({
                type: "success",
                text1: "Éxito",
                text2: "Perfil actualizado correctamente",
            });
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)/profile");
            }
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAwareScrollView className="flex-1 bg-background" bounces={false}>
            <AnimatedThemedView
                style={{ height: headerHeight }}
                lightColor={Colors.dark.glass}
                darkColor={Colors.dark.glass}
                className="w-full px-4 pt-6 rounded-bl-[40px] justify-center relative"
            >
                <Pressable
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace("/(tabs)/profile");
                        }
                    }}
                    className="absolute top-10 left-6 p-2 rounded-full z-20"
                    style={({ pressed }) => [{
                        backgroundColor: pressed ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                        borderWidth: 1,
                        borderColor: Colors.dark.border
                    }]}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
                <View className="items-center">
                    <View className="relative w-32 h-32 mb-4">
                        <View className="rounded-full w-32 h-32 items-center justify-center overflow-hidden border-4 shadow-sm relative" style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border }}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} className="w-full h-full" contentFit="cover" />
                            ) : (
                                <Ionicons name="person" size={60} color="#94a3b8" />
                            )}
                        </View>
                        <Pressable
                            onPress={() => setStudioVisible(true)}
                            className="absolute bottom-0 right-0 p-2 rounded-full shadow-md border" style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border }}
                        >
                            <Ionicons name="color-palette" size={20} color={Colors.dark.secondary} />
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
                        lightColor={Colors.dark.glassSoft}
                        className="py-4 px-4 rounded-full border"
                        style={{ borderColor: Colors.dark.border }}
                        placeholder="Tus nombres"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View className="mb-6">
                    <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Apellidos</ThemedText>
                    <ThemedTextInput
                        lightColor={Colors.dark.glassSoft}
                        className="py-4 px-4 rounded-full border"
                        style={{ borderColor: Colors.dark.border }}
                        placeholder="Tus apellidos"
                        value={lastName}
                        onChangeText={setLastName}
                    />
                </View>

                <View className="mb-6">
                    <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Número de teléfono</ThemedText>
                    <View
                        className="flex-row items-center rounded-full border px-4"
                        style={{ borderColor: phoneError ? "#ef4444" : Colors.dark.border, backgroundColor: Colors.dark.glassSoft }}
                    >
                        <ThemedText className="mr-2 font-bold text-base">🇪🇨 +593</ThemedText>
                        <ThemedTextInput
                            keyboardType="phone-pad"
                            lightColor="transparent"
                            className="flex-1 py-4 text-base bg-transparent"
                            style={{ borderWidth: 0 }}
                            placeholder="99 123 4567"
                            value={phoneNumber}
                            onChangeText={handlePhoneChange}
                        />
                    </View>
                    {phoneError ? (
                        <ThemedText className="text-red-500 text-xs mt-1 ml-2">{phoneError}</ThemedText>
                    ) : null}
                </View>

                <View className="mb-6">
                    <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Correo electrónico</ThemedText>
                    <ThemedTextInput
                        lightColor={Colors.dark.glassSoft}
                        className="py-4 px-4 rounded-full border"
                        style={{ borderColor: Colors.dark.border }}
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

            <AvatarStudioModal
                visible={studioVisible}
                setVisible={setStudioVisible}
                onApply={(url) => setAvatarUrl(url)}
            />
        </KeyboardAwareScrollView>
    );
}
