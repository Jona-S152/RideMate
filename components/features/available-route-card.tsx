import { useAuth } from "@/app/context/AuthContext";
import GlassCard from "@/components/common/GlassCard";
import { Coords } from "@/interfaces/available-routes";
import { tripService } from "@/services/trip.service";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Href, router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { ThemedText } from "../ui/ThemedText";

interface StopData {
    stop_id: number;
    status: string;
}

interface DriverRouteCardProps {
    routeScreen: Href;
    start: string;
    end: string;
    passengers?: number;
    routeId: number;
    startCoords: Coords;
    endCoords: Coords;
    stops?: StopData[];
    trip_session_id: number;
    driverName?: string;
    driverAvatar?: string;
    driverRating?: number;
    passengersData?: {
        id: string;
        avatar: string;
    }[];
    imageUrl?: string;
    isDriver?: boolean;
    status?: string;
    user_pending_request?: boolean;
    pendingRequestsCount?: number;
    onPress?: () => void;
}

export default function AvailableRouteCard({
    trip_session_id,
    start,
    end,
    passengers = 0,
    driverName,
    driverAvatar,
    driverRating,
    passengersData = [],
    imageUrl,
    isDriver = false,
    status,
    user_pending_request = false,
    pendingRequestsCount = 0,
    onPress,
}: DriverRouteCardProps) {

    const [imageError, setImageError] = useState(false);
    const joinedCount = passengersData.length > 0 ? passengersData.length : passengers;
    const { user } = useAuth();

    // Determine seat color logic
    const getSeatColor = (seatIndex: number) => {
        // Occupied seats (approved passengers) are always green
        if (seatIndex < joinedCount) {
            return "#10B981"; // Green for approved passengers
        }
        // Pending requests are shown in blue after occupied seats
        if (seatIndex < joinedCount + pendingRequestsCount) {
            return "#3B82F6"; // Blue for pending requests
        }
        // Rest are available (gray)
        return "#A0AECB";
    };

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
                onPress?.();
            }}
            onLongPress={() => {
                if (user?.driver_mode === false) return;

                Alert.alert(
                    "Eliminar ruta",
                    "¿Estás seguro de que deseas eliminar esta ruta?",
                    [
                        { text: "No", style: "cancel" },
                        {
                            text: "Sí, eliminar",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    await tripService.DeleteTripSession(user!.id);
                                    Alert.alert("Éxito", "Ruta eliminada correctamente.");
                                    if (router.canGoBack()) {
                                        router.back();
                                    } else {
                                        router.replace("/(tabs)/available-routes");
                                    }
                                } catch (error: any) {
                                    console.error("Error al cancelar el viaje:", error.message);
                                    Alert.alert("Error", "No se pudo cancelar el viaje.");
                                }
                            }
                        }
                    ]
                );
            }}
        >
            <GlassCard
                style={{
                    margin: 4,
                    borderRadius: 24,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.28,
                    shadowRadius: 18,
                    elevation: 8,
                }}
            >
                {/* Hero Map Image */}
                <View className="w-full h-36 bg-gray-700 relative">
                    <Image
                        source={
                            imageUrl && !imageError
                                ? { uri: imageUrl }
                                : require('@/assets/images/mapExample.png')
                        }
                        onError={() => setImageError(true)}
                        resizeMode="cover"
                        className="w-full h-full"
                    />
                    {/* Status Indicator */}
                    {status === 'active' && (
                        <View className="absolute top-2 right-2 rounded-full px-2 py-1" style={{ backgroundColor: "rgba(16,185,129,0.92)" }}>
                            <Text className="text-white text-xs font-bold">EN CURSO</Text>
                        </View>
                    )}
                </View>

                {/* Overlapping Driver Avatar */}
                {driverName && (
                    <View className="absolute left-4 top-28 z-10">
                        <View className="relative">
                            <Image
                                source={{ uri: driverAvatar || "https://via.placeholder.com/150" }}
                                className="w-14 h-14 rounded-full border-[3px] border-surfaceAlt"
                            />
                            <View className="absolute bottom-0 right-0 bg-success rounded-full px-1 border-2 border-surfaceAlt">
                                <Text className="text-[8px] font-bold text-white">
                                    ★ {driverRating ? driverRating.toFixed(1) : "0.0"}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Card Content */}
                <View className="pt-10 px-4 pb-4" style={{ backgroundColor: "rgba(12, 22, 42, 0.84)" }}>
                    {/* Driver Name */}
                    <ThemedText
                        lightColor="white"
                        darkColor="white"
                        className="text-base font-bold mb-1"
                        numberOfLines={1}
                    >
                        {driverName ?? "Ruta"}
                    </ThemedText>

                    {/* Route Text */}
                    <ThemedText
                        lightColor="#D1D5DB"
                        darkColor="#D1D5DB"
                        className="text-xs font-medium opacity-90 mb-2"
                        numberOfLines={2}
                    >
                        {start.split(',')[0]} → {end.split(',')[0]}
                    </ThemedText>

                    {/* Bottom Row: hint + seat icons */}
                    <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-textSecondary text-[10px]">
                            {isDriver ? "Toca para iniciar" : ""}
                        </Text>

                        {/* Seat Icons — only for passengers */}
                        {!isDriver && (
                            <View className="flex-row" style={{ gap: 4 }}>
                                {[0, 1, 2, 3].map((index) => (
                                    <MaterialCommunityIcons
                                        key={index}
                                        name="car-seat"
                                        size={18}
                                        color={getSeatColor(index)}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </GlassCard>
        </TouchableOpacity>
    );
}
