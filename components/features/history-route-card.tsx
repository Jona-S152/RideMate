import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Href, router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { ThemedText } from "../ui/ThemedText";
import { ThemedView } from "../ui/ThemedView";

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
    const { startTracking } = useTripTrackingStore(); // Removed stopTracking unused warning

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

    const handleStartTrip = async () => {
        if (!user || user.driver_mode !== true) {
            return router.push(routeScreen);
        }

        try {
            const { data, error } = await supabase
                .from('trip_sessions')
                .update({ status: 'active' })
                .eq('id', sessionId);

            if (error) {
                Alert.alert("Error", `Error al actualizar: ${error.message}`)
                return;
            }

            startTracking(sessionId, user.id);

            router.push(routeScreen);

        } catch (error: any) {
            console.error("Error al iniciar el viaje:", error.message);
            Alert.alert("Error", "No se pudo iniciar el viaje. Por favor, intentalo de nuevo.");
        }
    }

    return (
        <ThemedView
            lightColor="#1C2431"
            darkColor="#1C2431"
            className="rounded-[24px] m-1 overflow-hidden relative"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
        >
            {/* Hero Map Image */}
            <View className="w-full h-36 bg-gray-200">
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
            </View>

            {/* Overlapping Driver Avatar */}
            {driver && (
                <View className="absolute left-4 top-28 z-10">
                    <View className="relative">
                        <Image
                            source={{ uri: driver.avatar || "https://via.placeholder.com/150" }}
                            className="w-14 h-14 rounded-full border-[3px] border-[#1C2431]"
                        />
                        {/* Status/Rating Badge */}
                        <View className="absolute bottom-0 right-0 bg-[#10B981] rounded-full px-1 border-2 border-[#1C2431]">
                            <Text className="text-[8px] font-bold text-white">
                                ★ {driver.rating.toFixed(1)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Card Content */}
            <View className="pt-10 px-4 pb-4 bg-[#1C2431]">
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
                    {isActive === "active" ? (
                        <Pressable
                            style={{ backgroundColor: Colors.light.secondary }}
                            className="rounded-xl py-2 px-6 items-center justify-center"
                            onPress={() => router.push(routeScreen)}
                        >
                            <Text className="text-xs font-bold text-[#1C2431]">Ver</Text>
                        </Pressable>
                    ) : isActive === "pending" ? (
                        <Pressable
                            style={{ backgroundColor: Colors.light.secondary }}
                            className="rounded-xl py-2 px-6 items-center justify-center"
                            onPress={user?.driver_mode ? handleStartTrip : () => router.push(routeScreen)}
                        >
                            <Text className="text-xs font-bold text-[#1C2431]">
                                {user?.driver_mode ? "Iniciar" : "Ver"}
                            </Text>
                        </Pressable>
                    ) : null}

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
        </ThemedView>
    );
}