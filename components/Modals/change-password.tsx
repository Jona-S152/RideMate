import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedTextInput } from "../ThemedTextInput";

interface ChangePasswordModalProps {
    animationType: "none" | "slide" | "fade" | undefined,
    transparent: boolean,
    visible: boolean,
    setVisible: (isVisible: boolean) => void
}

export default function ChangePasswordModal({ animationType, transparent, visible, setVisible }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Error", "Por favor completa ambos campos.");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Las contraseñas no coinciden.");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Alert.alert("Éxito", "Contraseña actualizada correctamente.");
            setNewPassword("");
            setConfirmPassword("");
            setVisible(false);
        } catch (error: any) {
            Alert.alert("Error", error.message || "No se pudo actualizar la contraseña.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View>
            <Modal
                animationType={animationType}
                transparent={transparent}
                visible={visible}
                onRequestClose={() => setVisible(false)}
            >
                <Pressable
                    className="flex-1 justify-center items-center bg-black/60"
                    onPress={() => setVisible(false)}
                >
                    <Pressable
                        style={{ backgroundColor: Colors.dark.primary }}
                        className="rounded-3xl w-80 overflow-hidden border border-slate-700"
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View>
                            {/* Header */}
                            <View className="p-5 pb-4 flex-row items-center justify-between">
                                <ThemedText
                                    lightColor="#ffffff"
                                    darkColor="#ffffff"
                                    className="text-2xl font-bold">
                                    Cambiar contraseña
                                </ThemedText>
                                <Pressable
                                    onPress={() => setVisible(false)}
                                    className="p-2 bg-slate-800 rounded-full"
                                >
                                    <ThemedText lightColor="#ffffff" darkColor="#ffffff" className="text-sm">✕</ThemedText>
                                </Pressable>
                            </View>

                            {/* Inputs */}
                            <View className="mt-2">
                                <ThemedTextInput
                                    lightColor="#1e293b"
                                    placeholder="Contraseña nueva"
                                    placeholderTextColor="#64748b"
                                    secureTextEntry
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    className="text-lg mx-4 mb-3 border border-slate-700 rounded-xl px-3 py-2"
                                    style={{ color: '#ffffff' }}
                                />

                                <ThemedTextInput
                                    lightColor="#1e293b"
                                    placeholder="Confirmar contraseña"
                                    placeholderTextColor="#64748b"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    className="text-lg mx-4 border border-slate-700 rounded-xl px-3 py-2"
                                    style={{ color: '#ffffff' }}
                                />
                            </View>

                            {/* Action Button */}
                            <View className="m-4 mt-6">
                                <Pressable
                                    style={{ backgroundColor: Colors.dark.secondary }}
                                    className="rounded-full p-3 items-center"
                                    onPress={handleUpdatePassword}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <ThemedText
                                            lightColor="#ffffff"
                                            darkColor="#ffffff"
                                            className="text-lg font-bold">
                                            Actualizar
                                        </ThemedText>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}