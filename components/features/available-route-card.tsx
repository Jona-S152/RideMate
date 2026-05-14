import { Colors } from "@/constants/Colors";
import GlassCard from "@/components/common/GlassCard";
import { Coords } from "@/interfaces/available-routes";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Href } from "expo-router";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
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
    stops: StopData[];
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
    onPress?: () => void;
}

export default function AvailableRouteCard({
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
    onPress,
}: DriverRouteCardProps) {

    const [imageError, setImageError] = useState(false);
    const occupiedCount = passengersData.length > 0 ? passengersData.length : passengers;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
                console.log("Card pressed!", start);
                onPress?.();
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
                                        color={index < occupiedCount ? "#10B981" : "#A0AECB"}
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
