import { Colors } from "@/constants/Colors";
import { UserData } from "@/interfaces/available-routes";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import SlideToConfirmButton from "../ui/SlideToConfirmButton";

interface Waypoint {
    id: string;
    type: 'stop' | 'meeting_point' | 'origin' | 'destination';
    location: string;
    coords: {
        latitude: number;
        longitude: number;
    };
    order: number;
    passengerId?: string;
    stopId?: number;
    status?: string;
}

interface WaypointCheckInModalProps {
    visible: boolean;
    waypoint: Waypoint | null;
    users?: UserData[];
    onSkip: () => Promise<void>;
    onArriveMeetingPoint: (passengerId: string, meetingPointId: number) => Promise<void>;
    onArriveStop: (passengerId: string, stopId: number) => Promise<void>;
    onPassengerBoarded?: (passengerId: string) => Promise<void>;
    onClose: () => void;
}

export default function WaypointCheckInModal({
    visible,
    waypoint,
    users = [],
    onSkip,
    onArriveMeetingPoint,
    onArriveStop,
    onPassengerBoarded,
    onClose,
}: WaypointCheckInModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);

    useEffect(() => {
        if (visible && waypoint) {
            if (waypoint.type === 'meeting_point' && (waypoint.status === 'visited' || waypoint.status === 'arrived')) {
                setStep(2);
            } else {
                setStep(1);
            }
        }
    }, [visible, waypoint]);

    if (!waypoint) return null;

    const passengerUser = users.find((u) => u.id === waypoint.passengerId);

    const extractNumericId = (idStr: string): number => {
        if (idStr.includes('-')) {
            const parts = idStr.split('-');
            return Number(parts[parts.length - 1]);
        }
        return Number(idStr);
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            await onSkip();
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmStep1 = async () => {
        setLoading(true);
        try {
            const targetId = waypoint.type === 'stop' && waypoint.stopId
                ? waypoint.stopId
                : extractNumericId(waypoint.id);

            if (waypoint.type === 'meeting_point') {
                await onArriveMeetingPoint(waypoint.passengerId || '', targetId);
                setStep(2);
            } else {
                await onArriveStop(waypoint.passengerId || '', targetId);
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBoardPassengerStep2 = async () => {
        Toast.show({
            type: 'success',
            text1: 'Pasajero a bordo',
            text2: 'El pasajero ha sido marcado como a bordo.',
        });
        if (onPassengerBoarded && waypoint.passengerId) {
            try {
                await onPassengerBoarded(waypoint.passengerId);
            } catch (err) {
                console.error("Error onPassengerBoarded:", err);
            }
        }
        onClose();
        setStep(1);
    };

    const getIcon = () => {
        if (step === 2) return 'person-add';
        if (waypoint.type === 'stop') return 'location';
        if (waypoint.type === 'meeting_point') return 'person';
        return 'flag';
    };

    const getTitle = () => {
        const name = passengerUser?.name;
        if (step === 2) {
            return name ? `Marcar a ${name} a bordo` : 'Marcar pasajero a bordo';
        }
        if (waypoint.type === 'stop') {
            return name ? `¿Llegaste a la parada de ${name}?` : '¿Llegaste a la parada?';
        }
        if (waypoint.type === 'meeting_point') {
            return name ? `¿Llegaste a la recolección de ${name}?` : '¿Recogiste al pasajero?';
        }
        return '¿Llegaste al punto?';
    };

    const getTypeColor = () => {
        if (step === 2) return 'bg-emerald-500';
        if (waypoint.type === 'stop') return 'bg-purple-500';
        if (waypoint.type === 'meeting_point') return 'bg-primary';
        return 'bg-green-500';
    };

    return (
        <Modal
            transparent
            animationType="slide"
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 justify-end bg-black/60"
                onPress={onClose}
            >
                <Pressable onPress={(e) => e.stopPropagation()}>
                    <View className="rounded-t-3xl p-6 pb-8 border-t border-slate-700" style={{ backgroundColor: Colors.dark.primary }}>
                        {/* Waypoint / Step Icon */}
                        <View className="items-center mb-4">
                            <View className={`w-20 h-20 ${getTypeColor()} rounded-full items-center justify-center shadow-lg`}>
                                <Ionicons name={getIcon()} size={40} color="white" />
                            </View>
                        </View>

                        {/* Step Badge */}
                        {waypoint.type === 'meeting_point' && (
                            <View className="items-center mb-2">
                                <View className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                    <Text className="text-xs font-bold text-slate-300">
                                        Paso {step} de 2 {step === 1 ? "• Llegada" : "• Abordaje"}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Title */}
                        <Text className="text-2xl font-bold text-center mb-2 text-white">
                            {getTitle()}
                        </Text>

                        {/* Type Badge */}
                        <View className="items-center mb-4">
                            {waypoint.type === 'stop' && (
                                <Text className="text-sm font-bold text-purple-400 uppercase">
                                    Parada Destino
                                </Text>
                            )}
                            {waypoint.type === 'meeting_point' && (
                                <Text className="text-sm font-bold uppercase" style={{ color: Colors.dark.secondary }}>
                                    Punto de Encuentro
                                </Text>
                            )}
                        </View>

                        {/* Tarjeta de Pasajero si existe */}
                        {passengerUser && (
                            <View className="flex-row items-center p-3 bg-slate-800/50 rounded-2xl border border-slate-700 mb-4">
                                <View className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden mr-3">
                                    {passengerUser.avatar_profile ? (
                                        <Image
                                            source={{ uri: passengerUser.avatar_profile }}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <View className="flex-1 items-center justify-center bg-slate-600">
                                            <Ionicons name="person" size={24} color="#94a3b8" />
                                        </View>
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-base text-white">
                                        {passengerUser.name}
                                    </Text>
                                    <View className="flex-row items-center mt-0.5">
                                        <Ionicons name="star" size={14} color={Colors.dark.danger} />
                                        <Text className="text-xs font-bold text-slate-400 ml-1">
                                            {passengerUser.rating || "0.0"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Ubicación y Descripción de Calles */}
                        <View className="bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-700">
                            <View className="flex-row items-center justify-center gap-1 mb-1">
                                <Ionicons name="location-outline" size={16} color="#94a3b8" />
                                <Text className="text-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    Descripción de la Ubicación
                                </Text>
                            </View>
                            <Text className="text-center text-white font-bold text-base mb-0.5">
                                {waypoint.location.split(',')[0]}
                            </Text>
                            {waypoint.location.split(',').length > 1 && (
                                <Text className="text-center text-slate-400 text-sm">
                                    {waypoint.location.split(',').slice(1).join(',').trim()}
                                </Text>
                            )}
                        </View>

                        {/* Actions (Paso 1 vs Paso 2) */}
                        {step === 1 ? (
                            <View className="flex-row gap-4">
                                <Pressable
                                    onPress={() => handleSkip()}
                                    disabled={loading}
                                    className="flex-1 bg-slate-800 h-14 rounded-xl items-center justify-center border border-slate-700"
                                >
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons name="close-circle" size={20} color="#94a3b8" />
                                        <Text className="text-slate-300 font-bold text-base">
                                            Saltar
                                        </Text>
                                    </View>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleConfirmStep1()}
                                    disabled={loading}
                                    className="flex-1 h-14 rounded-xl items-center justify-center"
                                    style={{ backgroundColor: Colors.dark.secondary }}
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
                        ) : (
                            /* Paso 2: Deslizador de Confirmación de Abordaje */
                            <View className="mb-2">
                                <SlideToConfirmButton
                                    onConfirm={handleBoardPassengerStep2}
                                    title="Desliza para marcar a bordo"
                                    disabled={loading}
                                />
                            </View>
                        )}

                        {/* Close hint */}
                        <Pressable onPress={onClose} className="mt-4">
                            <Text className="text-center text-slate-500 text-sm">
                                Toca para cerrar
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}


