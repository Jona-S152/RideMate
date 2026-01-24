import { Colors } from "@/constants/Colors";
import { PassengerTripSession, UserData } from "@/interfaces/available-routes";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, View } from "react-native";

interface PassengerDropOffModalProps {
    visible: boolean;
    passengers: PassengerTripSession[];
    users?: UserData[];
    onConfirm: (passengerIds: string[]) => Promise<void>;
    onClose: () => void;
    title?: string;
}

export default function PassengerDropOffModal({
    visible,
    passengers,
    users = [],
    onConfirm,
    onClose,
    title = "¿Quiénes se bajan aquí?",
}: PassengerDropOffModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const togglePassenger = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
        );
    };

    const handleConfirm = async () => {
        if (selectedIds.length === 0) return;
        setLoading(true);
        try {
            await onConfirm(selectedIds);
            setSelectedIds([]); // Reset for next time
        } finally {
            setLoading(false);
        }
    };

    const joinedPassengers = passengers.filter((p) => p.status === "joined");

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center bg-black/60 px-4">
                <View className="bg-white rounded-3xl p-6 overflow-hidden">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-slate-800 flex-1">
                            {title}
                        </Text>
                        <Pressable onPress={onClose} className="p-1">
                            <Ionicons name="close" size={24} color="#64748b" />
                        </Pressable>
                    </View>

                    {joinedPassengers.length === 0 ? (
                        <View className="py-8 items-center">
                            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                            <Text className="text-slate-500 mt-2 text-center">
                                No hay pasajeros en el viaje actualmente.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <FlatList
                                data={joinedPassengers}
                                keyExtractor={(item) => item.passenger_id}
                                className="max-h-80"
                                renderItem={({ item }) => {
                                    const isSelected = selectedIds.includes(item.passenger_id);
                                    const passengerUser = users.find(u => u.id === item.passenger_id);

                                    return (
                                        <Pressable
                                            onPress={() => togglePassenger(item.passenger_id)}
                                            className={`flex-row items-center p-4 mb-2 rounded-xl border-2 ${isSelected
                                                ? "bg-blue-50 border-blue-500"
                                                : "bg-slate-50 border-transparent"
                                                }`}
                                        >
                                            <View className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden mr-3">
                                                {passengerUser?.avatar_profile ? (
                                                    <Image
                                                        source={{ uri: passengerUser.avatar_profile }}
                                                        className="w-full h-full"
                                                    />
                                                ) : (
                                                    <View className="flex-1 items-center justify-center">
                                                        <Ionicons name="person" size={20} color="#64748b" />
                                                    </View>
                                                )}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-slate-800">
                                                    {passengerUser?.name || `ID: ${item.passenger_id.slice(0, 8)}...`}
                                                </Text>
                                                <View className="flex-row items-center">
                                                    <View className="flex-row items-center mr-2">
                                                        <Ionicons name="star" size={12} color="#fbbf24" />
                                                        <Text className="text-[10px] font-bold text-slate-600 ml-0.5">
                                                            {passengerUser?.rating || "0.0"}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View
                                                className={`w-6 h-6 rounded-full items-center justify-center border-2 ${isSelected
                                                    ? "bg-blue-500 border-blue-500"
                                                    : "border-slate-300"
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={16} color="white" />
                                                )}
                                            </View>
                                        </Pressable>
                                    );
                                }}
                            />

                            <View className="mt-6">
                                <Pressable
                                    onPress={handleConfirm}
                                    disabled={loading || selectedIds.length === 0}
                                    className={`h-14 rounded-xl items-center justify-center ${selectedIds.length > 0 ? "" : "opacity-50"
                                        }`}
                                    style={{ backgroundColor: Colors.light.secondary }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-base">
                                            Confirmar Descenso ({selectedIds.length})
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
}
