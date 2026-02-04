import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Href, router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

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
            lightColor={isActive !== "completed" ? Colors.light.historyCard.activeBackground : Colors.light.historyCard.background}
            darkColor={Colors.light.historyCard.activeBackground}
            className="flex-1 justify-center rounded-[28px] m-2 p-5 overflow-hidden">
            {isActive !== "completed" && (
                <View
                    className="
                        absolute -top-15 -left-12 
                        w-[150%] h-40 
                        bg-[#FFD369]/40 
                        -rotate-[70deg]
                    "
                />
            )}
            <View className="">
                <ThemedText
                    lightColor={DefaultTheme.colors.text}
                    darkColor={DarkTheme.colors.text}
                    className="text-sm font-bold">
                    {title}
                </ThemedText>
            </View>
            <View className="flex-row justify-between">
                <View className="flex-1 pr-4">

                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        darkColor={DarkTheme.colors.text}
                        className="text-base font-normal mt-2">
                        Punto de partida
                    </ThemedText>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        className="text-sm font-light mb-2">
                        {startLocation}
                    </ThemedText>

                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        className="text-base font-normal">
                        Punto final
                    </ThemedText>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        className="text-sm font-light">
                        {endLocation}
                    </ThemedText>

                    {/* Driver Info */}
                    {driver && (
                        <View className="flex-row items-center mt-3 mb-1">
                            <View>
                                <Image
                                    source={{ uri: driver.avatar || "https://via.placeholder.com/150" }}
                                    className="w-8 h-8 rounded-full border border-gray-200"
                                />
                                <ThemedView
                                    lightColor={Colors.light.tird}
                                    className="absolute -bottom-1 -right-1 rounded-full px-1 justify-center items-center"
                                    style={{ minWidth: 20 }}
                                >
                                    <Text className="text-[8px] font-bold text-slate-800">
                                        {driver.rating.toFixed(1)}
                                    </Text>
                                </ThemedView>
                            </View>
                            <View className="ml-2">
                                <Text className="text-xs font-bold text-gray-700">{driver.name}</Text>
                                <Text className="text-[10px] text-gray-500">Conductor</Text>
                            </View>
                        </View>
                    )}

                    <View className="my-2 min-h-[32px]">
                        {/* Passengers List */}
                        {(passengersData.length > 0 || passengerCount > 0) && (
                            <View className="flex-row items-center">
                                {displayPassengers.map((p, i) => (
                                    <View
                                        key={p ? p.id : i}
                                        style={{
                                            marginLeft: i === 0 ? 0 : -12,
                                            zIndex: 30 - i,
                                        }}
                                    >
                                        {p ? (
                                            <Image
                                                source={{ uri: p.avatar }}
                                                className="w-8 h-8 rounded-full border-2 border-white"
                                            />
                                        ) : (
                                            <ThemedView
                                                lightColor={Colors.light.primary}
                                                className="w-8 h-8 rounded-full border-2 border-white opacity-80"
                                            />
                                        )}
                                    </View>
                                ))}
                                {showExtraCount && (
                                    <ThemedText className="ml-2 text-sm">
                                        +{extraPassengers}
                                    </ThemedText>
                                )}
                            </View>
                        )}
                    </View>
                </View>
                <View className="justify-around">
                    <View className="w-44 h-28">
                        <Image
                            source={
                                imageUrl && !imageError
                                    ? { uri: imageUrl }
                                    : require('@/assets/images/mapExample.png')
                            }
                            onError={() => setImageError(true)}
                            resizeMode="cover"
                            className="w-full h-full rounded-2xl" />
                    </View>
                    {isActive === "active" ?
                        (
                            <Pressable
                                style={{ backgroundColor: Colors.light.primary }}
                                className="rounded-full p-2 mt-4"
                                onPress={() => router.push(routeScreen)}
                            >
                                <Text className="text-lg text-center text-white">
                                    {"Ver"}
                                </Text>
                            </Pressable>
                        )
                        : isActive === "pending" ?
                            (
                                <Pressable
                                    style={{ backgroundColor: Colors.light.primary }}
                                    className="rounded-full p-2 mt-4"
                                    onPress={user?.driver_mode ? handleStartTrip : () => router.push(routeScreen)}
                                >
                                    <Text className="text-lg text-center text-white">
                                        {user?.driver_mode ? "Iniciar" : "Ver"}
                                    </Text>
                                </Pressable>
                            )
                            :
                            (
                                <View></View>
                            )
                    }
                </View>
            </View>
        </ThemedView>
    );
}