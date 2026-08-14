import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedTextInput } from "../ThemedTextInput";

interface ChangePasswordModalProps {
    animationType: "none" | "slide" | "fade" | undefined,
    transparent: boolean,
    visible: boolean,
    setVisible: (isVisible: boolean) => void
}

interface PasswordRequirements {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
}

function checkPasswordRequirements(password: string): PasswordRequirements {
    return {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
}

function isPasswordValid(reqs: PasswordRequirements): boolean {
    return reqs.minLength && reqs.hasUppercase && reqs.hasLowercase && reqs.hasNumber && reqs.hasSpecial;
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
    return (
        <View className="flex-row items-center mb-1">
            <Ionicons
                name={met ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={met ? "#22c55e" : "#64748b"}
            />
            <ThemedText
                className="ml-2 text-xs"
                style={{ color: met ? "#22c55e" : "#64748b" }}
            >
                {label}
            </ThemedText>
        </View>
    );
}

export default function ChangePasswordModal({ animationType, transparent, visible, setVisible }: ChangePasswordModalProps) {
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const passwordReqs = checkPasswordRequirements(newPassword);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
    const isDifferentFromCurrent = newPassword !== currentPassword || currentPassword === "";

    const handleClose = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrorMsg("");
        setVisible(false);
    };

    const handleUpdatePassword = async () => {
        setErrorMsg("");

        if (!currentPassword || !newPassword || !confirmPassword) {
            setErrorMsg("Por favor completa todos los campos.");
            return;
        }

        if (!isPasswordValid(passwordReqs)) {
            setErrorMsg("La contraseña nueva no cumple los requisitos.");
            return;
        }

        if (newPassword === currentPassword) {
            setErrorMsg("La contraseña nueva debe ser diferente a la actual.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg("Las contraseñas nuevas no coinciden.");
            return;
        }

        setLoading(true);
        try {
            // Verify current password by re-authenticating
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user?.email || "",
                password: currentPassword,
            });

            if (authError) {
                setErrorMsg("La contraseña actual es incorrecta.");
                setLoading(false);
                return;
            }

            // Update to new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            handleClose();
        } catch (error: any) {
            setErrorMsg(error.message || "No se pudo actualizar la contraseña.");
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
                onRequestClose={handleClose}
            >
                <Pressable
                    className="flex-1 justify-center items-center bg-black/70"
                    onPress={handleClose}
                >
                    <Pressable
                        style={{ backgroundColor: Colors.dark.primary, borderColor: Colors.dark.border }}
                        className="rounded-3xl w-[88%] overflow-hidden border"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View
                            className="p-5 flex-row items-center justify-between"
                            style={{ borderBottomWidth: 1, borderBottomColor: Colors.dark.border }}
                        >
                            <View className="flex-row items-center">
                                <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: Colors.dark.glassSoft }}>
                                    <Ionicons name="key-outline" size={18} color={Colors.dark.secondary} />
                                </View>
                                <ThemedText className="text-lg font-bold text-white">
                                    Cambiar contraseña
                                </ThemedText>
                            </View>
                            <Pressable
                                onPress={handleClose}
                                className="p-2 rounded-full"
                                style={{ backgroundColor: Colors.dark.glassSoft }}
                            >
                                <Ionicons name="close" size={18} color={Colors.dark.text} />
                            </Pressable>
                        </View>

                        {/* Body */}
                        <View className="p-5">
                            {/* Current Password */}
                            <View className="mb-3">
                                <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                                    Contraseña actual
                                </ThemedText>
                                <View
                                    className="flex-row items-center rounded-2xl border px-4"
                                    style={{ borderColor: Colors.dark.border, backgroundColor: Colors.dark.glassSoft }}
                                >
                                    <ThemedTextInput
                                        lightColor="transparent"
                                        className="flex-1 py-3 text-white"
                                        style={{ borderWidth: 0 }}
                                        placeholder="Tu contraseña actual"
                                        placeholderTextColor="#64748b"
                                        secureTextEntry={!showCurrent}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                    />
                                    <Pressable onPress={() => setShowCurrent(!showCurrent)} className="p-1">
                                        <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                                    </Pressable>
                                </View>
                            </View>

                            {/* New Password */}
                            <View className="mb-3">
                                <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                                    Contraseña nueva
                                </ThemedText>
                                <View
                                    className="flex-row items-center rounded-2xl border px-4"
                                    style={{
                                        borderColor: newPassword.length > 0 && !isPasswordValid(passwordReqs) ? "#ef4444" : Colors.dark.border,
                                        backgroundColor: Colors.dark.glassSoft
                                    }}
                                >
                                    <ThemedTextInput
                                        lightColor="transparent"
                                        className="flex-1 py-3 text-white"
                                        style={{ borderWidth: 0 }}
                                        placeholder="Nueva contraseña"
                                        placeholderTextColor="#64748b"
                                        secureTextEntry={!showNew}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                    <Pressable onPress={() => setShowNew(!showNew)} className="p-1">
                                        <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                                    </Pressable>
                                </View>

                                {/* Password Requirements */}
                                {newPassword.length > 0 && (
                                    <View className="mt-2 ml-1">
                                        <RequirementItem met={passwordReqs.minLength} label="Mínimo 8 caracteres" />
                                        <RequirementItem met={passwordReqs.hasUppercase} label="Al menos una mayúscula" />
                                        <RequirementItem met={passwordReqs.hasLowercase} label="Al menos una minúscula" />
                                        <RequirementItem met={passwordReqs.hasNumber} label="Al menos un número" />
                                        <RequirementItem met={passwordReqs.hasSpecial} label="Al menos un carácter especial" />
                                    </View>
                                )}
                            </View>

                            {/* Confirm Password */}
                            <View className="mb-4">
                                <ThemedText className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                                    Confirmar contraseña nueva
                                </ThemedText>
                                <View
                                    className="flex-row items-center rounded-2xl border px-4"
                                    style={{
                                        borderColor: confirmPassword.length > 0 && !passwordsMatch ? "#ef4444" : Colors.dark.border,
                                        backgroundColor: Colors.dark.glassSoft
                                    }}
                                >
                                    <ThemedTextInput
                                        lightColor="transparent"
                                        className="flex-1 py-3 text-white"
                                        style={{ borderWidth: 0 }}
                                        placeholder="Repite la contraseña nueva"
                                        placeholderTextColor="#64748b"
                                        secureTextEntry={!showConfirm}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <Pressable onPress={() => setShowConfirm(!showConfirm)} className="p-1">
                                        <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                                    </Pressable>
                                </View>
                                {confirmPassword.length > 0 && (
                                    <View className="flex-row items-center mt-1 ml-1">
                                        <Ionicons
                                            name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                                            size={14}
                                            color={passwordsMatch ? "#22c55e" : "#ef4444"}
                                        />
                                        <ThemedText
                                            className="ml-2 text-xs"
                                            style={{ color: passwordsMatch ? "#22c55e" : "#ef4444" }}
                                        >
                                            {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                                        </ThemedText>
                                    </View>
                                )}
                            </View>

                            {/* Error message */}
                            {errorMsg ? (
                                <View className="flex-row items-center mb-3 px-1">
                                    <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                                    <ThemedText className="text-red-500 text-sm ml-2">{errorMsg}</ThemedText>
                                </View>
                            ) : null}

                            {/* Submit Button */}
                            <Pressable
                                style={{
                                    backgroundColor: Colors.dark.secondary,
                                    opacity: loading ? 0.7 : 1,
                                }}
                                className="rounded-full py-4 items-center"
                                onPress={handleUpdatePassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <ThemedText className="text-white font-bold text-base">
                                        Actualizar contraseña
                                    </ThemedText>
                                )}
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}