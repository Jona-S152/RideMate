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
                    className="flex-1 justify-center items-center bg-black/50"
                    onPress={() => setVisible(false)}
                >
                    <Pressable
                        style={{ backgroundColor: Colors.light.background }}
                        className="rounded-2xl w-80 overflow-hidden"
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View>
                            <View style={{ backgroundColor: Colors.light.primary }} className="p-4">
                                <ThemedText
                                    lightColor={Colors.light.text}
                                    darkColor={Colors.dark.text}
                                    className="text-2xl">
                                    Cambiar contraseña
                                </ThemedText>
                            </View>
                            <View className="mt-4">
                                <ThemedTextInput
                                    lightColor={Colors.light.background} // Ensure input background is distinguishable inside the modal
                                    placeholder="Contraseña nueva"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    className="text-lg mx-4 mb-3 border border-gray-200 rounded-lg px-3 py-2"
                                />

                                <ThemedTextInput
                                    lightColor={Colors.light.background}
                                    placeholder="Confirmar contraseña"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    className="text-lg mx-4 border border-gray-200 rounded-lg px-3 py-2"
                                />
                            </View>
                            <View className="m-4 mt-6">
                                <Pressable
                                    style={{ backgroundColor: Colors.light.secondary }}
                                    className={`rounded-full p-3 active:bg-yellow-200 items-center`}
                                    onPress={handleUpdatePassword}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <ThemedText
                                            lightColor={Colors.light.text}
                                            darkColor={Colors.dark.text}
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