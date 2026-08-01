import { Colors } from "@/constants/Colors";
import { PassengerTripSession, UserData } from "@/interfaces/available-routes";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";

interface PassengerDropOffModalProps {
    visible: boolean;
    passenger: PassengerTripSession | null;
    users?: UserData[];
    onConfirm: (passengerId: string) => Promise<void>;
    onSkip: (passengerId: string) => Promise<void>;
    onClose: () => void;
    title?: string;
}

export default function PassengerDropOffModal({
    visible,
    passenger,
    users = [],
    onConfirm,
    onSkip,
    onClose,
    title = "¿Confirmar bajada del pasajero?",
}: PassengerDropOffModalProps) {
    const [passengerUser, setPassengerUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (passenger) {
            const passengerUserData = users.find((u) => u.id === passenger.passenger_id);
            setPassengerUser(passengerUserData || null);
        } else {
            setPassengerUser(null);
        }
    }, [passenger, users]);

    const handleConfirm = async () => {
        if (!passenger) return;
        setLoading(true);
        try {
            await onConfirm(passenger.passenger_id);
            onClose(); // Cerramos el modal tras confirmar
        } catch (error) {
            console.error("Error al confirmar descenso:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        if (!passenger) return;
        setLoading(true);
        try {
            await onSkip(passenger.passenger_id);
            onClose(); // Cerramos el modal tras confirmar
        } catch (error) {
            console.error("Error al saltar pasajero:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center bg-black/60 px-4">
                <View className="bg-white rounded-3xl p-6 overflow-hidden">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-slate-800 flex-1">
                            {title}
                        </Text>
                        <Pressable onPress={onClose} className="p-1">
                            <Ionicons name="close" size={24} color="#64748b" />
                        </Pressable>
                    </View>

                    {/* Content */}
                    {!passenger ? (
                        <View className="py-8 items-center">
                            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                            <Text className="text-slate-500 mt-2 text-center">
                                No se ha seleccionado ningún pasajero.
                            </Text>
                        </View>
                    ) : (
                        <View>
                            {/* Targeta con datos del Pasajero (Envuelta en flex-row) */}
                            <View className="flex-row items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                {/* Avatar */}
                                <View className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden mr-3">
                                    {passengerUser?.avatar_profile ? (
                                        <Image
                                            source={{ uri: passengerUser.avatar_profile }}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <View className="flex-1 items-center justify-center bg-slate-300">
                                            <Ionicons name="person" size={24} color="#64748b" />
                                        </View>
                                    )}
                                </View>

                                {/* Información de texto */}
                                <View className="flex-1">
                                    <Text className="font-bold text-base text-slate-800">
                                        {passengerUser?.name || `ID: ${passenger.passenger_id.slice(0, 8)}...`}
                                    </Text>

                                    <View className="flex-row items-center mt-1">
                                        <Ionicons name="star" size={14} color={Colors.light.secondary} />
                                        <Text className="text-xs font-bold text-slate-600 ml-1">
                                            {passengerUser?.rating || "0.0"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Botón de Confirmación */}
                            <View className="flex-row gap-4">
                                <Pressable
                                    onPress={() => handleSkip()}
                                    disabled={loading}
                                    className="flex-1 bg-slate-200 h-14 rounded-xl items-center justify-center border border-slate-300"
                                >
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons name="close-circle" size={20} color="#64748b" />
                                        <Text className="text-slate-700 font-bold text-base">
                                            Saltar
                                        </Text>
                                    </View>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleConfirm()}
                                    disabled={loading}
                                    className="flex-1 h-14 rounded-xl items-center justify-center"
                                    style={{ backgroundColor: Colors.light.secondary }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons name="checkmark-circle" size={20} color="white" />
                                            <Text className="text-white font-bold text-base">
                                                Llegué
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}