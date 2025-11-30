import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { DefaultTheme } from "@react-navigation/native";
import { Href, router } from "expo-router";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface StopData {
    stop_id: number;
    status: string; // Por ejemplo: 'upcoming'
}

interface DriverRouteCardProps {
routeScreen: Href;
start: string;
end: string;
passengers?: number;
routeId: number; 
startLongitude: number;
startLatitude: number;
endLongitude: number;
endLatitude: number;
stops: StopData[]; // Lista de stops con su ID y estado inicial
}

export default function AvailableRouteCard({
        routeScreen,
        start,
        end,
        passengers = 3,
        routeId,
        startLongitude,
        startLatitude,
        endLongitude,
        endLatitude,
        stops,
    }: DriverRouteCardProps) {

    const { user } = useAuth();

    const handleStartTrip = async () => {
        if (!user || user.driver_mode !== true) {
            return router.push(routeScreen);
        }

        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from('trip_sessions')
                .insert([
                    {
                        route_id: routeId,
                        driver_id: user.id,
                        status: 'active',
                        start_location: start,
                        end_location: end,
                        start_time: new Date().toISOString(),
                        start_longitude: startLongitude,
                        start_latitude: startLatitude,
                        end_longitude: endLongitude,
                        end_latitude: endLatitude,
                        is_active: true,
                    },
                ])
                .select()
                .single();

            if (sessionError) throw sessionError;

            const newTripSessionId = sessionData.id;

            console.log(sessionData);

            const stopsToInsert = stops.map(stop => ({
                trip_session_id: newTripSessionId,
                stop_id: stop.stop_id,
                status: stop.status
            }));

            const { error: stopsError } = await supabase
                .from('trip_session_stops')
                .insert(stopsToInsert);

            if (stopsError) throw stopsError;

            Alert.alert("Éxito", "Viaje iniciado y paradas registradas.");

        } catch (error: any) {   
            console.error("Error al iniciar el viaje:", error.message);
            Alert.alert("Error", "No se pudo iniciar el viaje. Por favor, intentalo de nuevo.");
        }
    }

    return (
            <ThemedView
                lightColor={Colors.light.historyCard.background}
                darkColor={Colors.light.historyCard.activeBackground}
                className="flex-1 justify-center rounded-[28px] m-2 p-5"
            >
                <ThemedText
                    lightColor={DefaultTheme.colors.text}
                    className="text-sm font-bold"
                >
                    {start} - {end}
                </ThemedText>
                <View className="flex-row justify-between">
                    <View className="flex-1 pr-4">

                        <ThemedText lightColor={DefaultTheme.colors.text} className="text-base font-normal mt-2">
                            Punto de partida
                        </ThemedText>
                        <ThemedText lightColor={DefaultTheme.colors.text} className="text-sm font-light mb-2">
                            {start.split(',')[0]}
                        </ThemedText>

                        <ThemedText lightColor={DefaultTheme.colors.text} className="text-base font-normal">
                            Punto final
                        </ThemedText>
                        <ThemedText lightColor={DefaultTheme.colors.text} className="text-sm font-light">
                            {end.split(',')[0]}
                        </ThemedText>
                        {!user?.driver_mode &&
                        <View className="my-3">
                            <View className="flex-row items-center">
                                {[...Array(passengers)].map((_, i) => (
                                    <ThemedView
                                        key={i}
                                        lightColor={Colors.light.primary}
                                        className={`w-8 h-8 rounded-full -ml-${i === 0 ? "0" : "3"} opacity-${100 - i * 20}`}
                                    />
                                ))}
                            </View>
                        </View>
                        }
                    </View>

                    <View className="justify-around">
                        <View className="w-40 h-28">
                            <Image
                                source={require('@/assets/images/mapExample.png')}
                                resizeMode="cover"
                                className="w-full h-full rounded-2xl"
                            />
                        </View>
                        <Pressable 
                            style={{ backgroundColor: Colors.light.secondary }} 
                            className="rounded-full p-2 mt-4"
                            onPress={user?.driver_mode ? handleStartTrip : () => router.push(routeScreen)}
                        >
                            <Text className="text-lg text-center">
                                {user?.driver_mode ? "Iniciar" : "Entrar"}
                            </Text>
                        </Pressable>
                    </View>
                </View>

            </ThemedView>
    );
}
