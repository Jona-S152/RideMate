import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

interface Waypoint {
    id: string;
    type: 'stop' | 'meeting_point' | 'origin' | 'destination';
    location: string;
    latitude: number;
    longitude: number;
    order: number;
    passengerId?: string;
    stopId?: number;
}

interface WaypointCheckInModalProps {
    visible: boolean;
    waypoint: Waypoint | null;
    onConfirm: (status: 'visited' | 'skipped') => Promise<void>;
    onClose: () => void;
}

export default function WaypointCheckInModal({
    visible,
    waypoint,
    onConfirm,
    onClose,
}: WaypointCheckInModalProps) {
    const [loading, setLoading] = useState(false);

    if (!waypoint) return null;

    const handleConfirm = async (status: 'visited' | 'skipped') => {
        setLoading(true);
        try {
            await onConfirm(status);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = () => {
        if (waypoint.type === 'stop') return 'location';
        if (waypoint.type === 'meeting_point') return 'person';
        return 'flag';
    };

    const getTitle = () => {
        if (waypoint.type === 'stop') return '¿Llegaste a la parada?';
        if (waypoint.type === 'meeting_point') return '¿Recogiste al pasajero?';
        return '¿Llegaste al punto?';
    };

    const getTypeColor = () => {
        if (waypoint.type === 'stop') return 'bg-purple-500';
        if (waypoint.type === 'meeting_point') return 'bg-[#000D3A]';
        return 'bg-green-500';
    };

    return (
        <Modal
            transparent
            animationType="slide"
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl p-6 pb-8">
                    {/* Waypoint Icon */}
                    <View className="items-center mb-4">
                        <View className={`w-20 h-20 ${getTypeColor()} rounded-full items-center justify-center shadow-lg`}>
                            <Ionicons name={getIcon()} size={40} color="white" />
                        </View>
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-bold text-center mb-2 text-slate-800">
                        {getTitle()}
                    </Text>

                    {/* Type Badge */}
                    <View className="items-center mb-4">
                        {waypoint.type === 'stop' && (
                            <Text className="text-sm font-bold text-purple-600 uppercase">
                                Parada
                            </Text>
                        )}
                        {waypoint.type === 'meeting_point' && (
                            <Text className="text-sm font-bold text-[#000D3A] uppercase">
                                Punto de Encuentro
                            </Text>
                        )}
                    </View>

                    {/* Location */}
                    <View className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                        <Text className="text-center text-slate-600 text-sm mb-1">
                            Ubicación
                        </Text>
                        <Text className="text-center text-slate-800 font-semibold">
                            {waypoint.location.split(',')[0]}
                        </Text>
                        <Text className="text-center text-slate-500 text-sm">
                            {waypoint.location.split(',').slice(1).join(',')}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-4">
                        <Pressable
                            onPress={() => handleConfirm('skipped')}
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
                            onPress={() => handleConfirm('visited')}
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

                    {/* Close hint */}
                    <Pressable onPress={onClose} className="mt-4">
                        <Text className="text-center text-slate-400 text-sm">
                            Toca fuera para cerrar
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
