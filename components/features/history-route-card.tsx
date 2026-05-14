import { useAuth } from "@/app/context/AuthContext";
import GlassCard from "@/components/common/GlassCard";
import { Colors } from "@/constants/Colors";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Href, router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { ThemedText } from "../ui/ThemedText";

interface HistoryRouteProps {
    title: string;
    startLocation: string;
    endLocation: string;
    passengerCount: number; // Mantener por compatibilidad o fallback
    isActive?: string;
    routeScreen: Href;
    sessionId: number;
    routeId?: number;
    // New Props
    driver?: {
        name: string;
        avatar: string;
        rating: number;
    };
    passengersData?: {
        id: string;
        avatar: string;
    }[];
    imageUrl?: string;
}

export default function RouteCard({
    sessionId,
    routeId,
    title,
    isActive,
    routeScreen,
    startLocation,
    endLocation,
    passengerCount = 0,
    driver,
    passengersData = [],
    imageUrl
}: HistoryRouteProps) {
    console.log(`[HistoryCard] id=${sessionId} imageUrl=${imageUrl}`);
    const { user } = useAuth();

    // Use passengersData if available, otherwise fallback to count for history items (which might not have data loaded yet)
    // Actually, user requested replacing circles with photos.
    // If passengersData is provided, use it. If not, maybe fallback to circles if we want to keep history working as is for now.

    // Logic for displaying circles:
    const displayPassengers = passengersData.length > 0
        ? passengersData
        : Array(Math.min(passengerCount, 3)).fill(null); // Fallback to nulls for circles

    const extraPassengers = passengerCount - (passengersData.length > 0 ? passengersData.length : 3);
    const showExtraCount = passengersData.length > 0 ? false : (passengerCount > 3);

    const [imageError, setImageError] = useState(false);

    return (
        <Pressable onPress={() => router.push(routeScreen)}>
            <GlassCard
                style={{
                    borderRadius: 24,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.28,
                    shadowRadius: 18,
                    elevation: 8,
                }}
            >
                {/* Hero Map Image */}
                <View className="w-full h-28 bg-gray-200">
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
                    {isActive === 'active' && (
                        <View className="absolute top-2 right-2 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(226, 235, 240, 0.3)', borderColor: 'rgba(226, 235, 240, 0.3)', }}>
                            <Text style={{ color: Colors.dark.secondary }} className="text-xs font-bold">EN CURSO</Text>
                        </View>
                    )}
                    {isActive === 'pending' && (
                        <View className="absolute top-2 right-2 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(185, 106, 16, 0.1)', borderColor: 'rgba(185, 106, 16, 0.1)', }}>
                            <Text style={{ color: Colors.dark.danger }} className="text-xs font-bold">PENDIENTE</Text>
                        </View>
                    )}
                    {isActive === 'completed' && (
                        <View className="absolute top-2 right-2 rounded-full px-2 py-1" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.1)', }}>
                            <Text style={{ color: Colors.dark.success }} className="text-xs font-bold">COMPLETADO</Text>
                        </View>
                    )}
                </View>

                {/* Overlapping Driver Avatar */}
                {driver && (
                    <View className="absolute left-4 top-20 z-10">
                        <View className="relative">
                            <Image
                                source={{ uri: driver.avatar || "https://via.placeholder.com/150" }}
                                className="w-14 h-14 rounded-full border-[3px]"
                                style={{ borderColor: Colors.dark.glassStrong }}
                            />
                            {/* Status/Rating Badge */}
                            <View className="absolute bottom-0 right-0 rounded-full px-1 border-2" style={{ backgroundColor: Colors.dark.success, borderColor: Colors.dark.glassStrong }}>
                                <Text className="text-[8px] font-bold text-white">
                                    ★ {Number(driver.rating || 0).toFixed(1)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Card Content */}
                <View className="pt-10 px-4 pb-4" style={{ backgroundColor: Colors.dark.primary }}>
                    {/* Title */}
                    <ThemedText
                        lightColor="white"
                        darkColor="white"
                        className="text-lg font-bold mb-1"
                        numberOfLines={1}
                    >
                        {title}
                    </ThemedText>


                    {/* Route Text */}
                    <ThemedText
                        lightColor="#D1D5DB"
                        darkColor="#D1D5DB"
                        className="text-xs font-medium opacity-90 mb-3"
                        numberOfLines={2}
                    >
                        {startLocation} → {endLocation}
                    </ThemedText>

                    {/* Bottom Row: Action Button + Seats (right side) */}
                    <View className="flex-row justify-between items-center mt-3">
                        {/* Action Button (Left) */}
                        {/* {isActive === "active" ? (
                            <Pressable
                                style={{ backgroundColor: Colors.light.secondary }}
                                className="rounded-xl py-2 px-6 items-center justify-center"
                                onPress={() => router.push(routeScreen)}
                            >
                                <Text className="text-xs font-bold" style={{ color: Colors.dark.text }}>Ver</Text>
                            </Pressable>
                        ) : isActive === "pending" ? (
                            <Pressable
                                style={{ backgroundColor: Colors.light.secondary }}
                                className="rounded-xl py-2 px-6 items-center justify-center"
                                onPress={user?.driver_mode ? handleStartTrip : () => router.push(routeScreen)}
                            >
                                <Text className="text-xs font-bold" style={{ color: Colors.dark.text }}>
                                    {user?.driver_mode ? "Iniciar" : "Ver"}
                                </Text>
                            </Pressable>
                        ) : null} */}

                        {/* Seat Icons (Bottom Right) */}
                        <View className="flex-row space-x-1">
                            {[0, 1, 2, 3].map((index) => {
                                const occupiedCount = passengersData.length > 0 ? passengersData.length : passengerCount;
                                const isOccupied = index < occupiedCount;
                                return (
                                    <MaterialCommunityIcons
                                        key={index}
                                        name="car-seat"
                                        size={20}
                                        color={isOccupied ? "#10B981" : "#6B7280"}
                                    />
                                );
                            })}
                        </View>
                    </View>
                </View>
            </GlassCard>
        </Pressable>
    );
}