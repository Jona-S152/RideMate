import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Href, router } from "expo-router";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface HistoryRouteProps{
    title: string;
    startLocation: string; // Nueva prop para el punto de partida
    endLocation: string;   // Nueva prop para el punto final
    passengerCount: number; // Nueva prop para el número de círculos
    isActive?: string;
    routeScreen: Href;
    sessionId: number;
}

export default function RouteCard({ 
    sessionId,
    title, 
    isActive, 
    routeScreen, 
    startLocation, 
    endLocation, 
    passengerCount = 0 
}: HistoryRouteProps) {
    const { user } = useAuth();

    const { startTracking, stopTracking } = useTripTrackingStore();
    // const session = useTripRealtimeById(sessionId);
    // console.log("SESSION DESDE HISTORY ROUTE CARD: ", session);
    // Limitamos el número máximo de círculos visibles
    const maxCircles = 3;
    const circlesToRender = Math.min(passengerCount, maxCircles);

    const handleStartTrip = async () => {
        if (!user || user.driver_mode !== true) {
            return router.push(routeScreen);
        }

        try {
            const { data, error } = await supabase
                .from('trip_sessions')
                .update({ status: 'active'})
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
                                {startLocation} {/* 👈 Dinámico */}
                        </ThemedText>
                                
                        <ThemedText
                            lightColor={DefaultTheme.colors.text}
                            className="text-base font-normal">
                                Punto final
                        </ThemedText>
                        <ThemedText
                            lightColor={DefaultTheme.colors.text}
                            className="text-sm font-light">
                                {endLocation} {/* 👈 Dinámico */}
                        </ThemedText>
                        <View className="my-2">
                            <View className="flex-row items-center">
                                {/* 👈 Círculos Dinámicos */}
                                {[...Array(circlesToRender)].map((_, i) => (
                                    <ThemedView
                                        key={i}
                                        lightColor={Colors.light.primary}
                                        // Usamos un estilo dinámico simple para el solapamiento y la opacidad
                                        style={{ 
                                            width: 32, 
                                            height: 32, 
                                            borderRadius: 16, 
                                            marginLeft: i === 0 ? 0 : -12, 
                                            zIndex: 30 - i, // Para el orden de solapamiento
                                            opacity: 1 - (i * 0.2), // Efecto de atenuación
                                        }}
                                        className="z-30" 
                                    />
                                ))}
                                {passengerCount > maxCircles && (
                                    <ThemedText className="ml-2 text-sm">
                                        +{passengerCount - maxCircles}
                                    </ThemedText>
                                )}
                            </View>
                        </View> 
                    </View>
                    <View className="justify-around">
                        <View className="w-44 h-28">
                            <Image
                                source={require('@/assets/images/mapExample.png')}
                                resizeMode="cover"
                                className="w-full h-full rounded-2xl"/>
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