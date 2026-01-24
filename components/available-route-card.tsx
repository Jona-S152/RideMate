import { useAuth } from "@/app/context/AuthContext";
import { useSession } from "@/app/context/SessionContext";
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
    trip_session_id: number;
    driverName?: string;
    driverAvatar?: string;
    driverRating?: number;
    passengersData?: {
        id: string;
        avatar: string;
    }[];
}

export default function AvailableRouteCard({
    routeScreen,
    start,
    end,
    passengers = 0,
    routeId,
    startLongitude,
    startLatitude,
    endLongitude,
    endLatitude,
    stops,
    trip_session_id,
    driverName,
    driverAvatar,
    driverRating,
    passengersData = []
}: DriverRouteCardProps) {

    const { user } = useAuth();
    const { setSessionChanged } = useSession();

    const routeSelectionMap: Href = "/(tabs)/available-routes/selection-map-screen";

    const displayPassengers = passengersData.length > 0
        ? passengersData
        : Array(Math.min(passengers, 3)).fill(null);

    const extraPassengers = passengers - (passengersData.length > 0 ? passengersData.length : 3);
    const showExtraCount = passengersData.length > 0 ? false : (passengers > 3);

    const handleJoinTrip = async () => {
        if (!user || user.driver_mode === true) {
            console.log("❌ Cancelando join: Usuario nulo o modo conductor activado.", { user: !!user, driverMode: user?.driver_mode });
            return;
        }
        console.log("✅ Validación de usuario/modo pasó. Iniciando verificación de viaje...");

        try {
            const { data: sessionTrip, error } = await supabase
                .from('passenger_trip_sessions')
                .select("*")
                .eq("passenger_id", user.id)
                .in("status", ["joined"])
                .maybeSingle();

            console.log(sessionTrip);

            if (error) {
                console.error(error);
                Alert.alert("Error verificando viaje");
                return;
            }

            if (sessionTrip) {
                Alert.alert("No se pudo solicitar el viaje.", "Ya tiene un viaje en curso");
                return;
            }

            console.log("Intentando navegar a selección de mapa:", routeSelectionMap);
            router.push({
                pathname: routeSelectionMap, // Crea esta ruta
                params: {
                    trip_session_id: trip_session_id,
                    start_name: start,
                    end_name: end
                }
            });
            // Insertar participación del pasajero
            // const { error: insertError } = await supabase
            //     .from('passenger_trip_sessions')
            //     .insert([
            //         {
            //             trip_session_id: trip_session_id,
            //             passenger_id: user.id,
            //             status: 'joined',      // el conductor debe aceptar
            //             rejected: false,
            //             rejection_reason: null
            //         }
            //     ]);

            // if (insertError) throw insertError;

            // setSessionChanged(true);
            // router.replace("/(tabs)/home");

            // Si quieres redirigir:
            // router.push(routeScreen);

        } catch (error: any) {
            console.error("Error al unirse al viaje:", error.message);
            Alert.alert("Error", "No se pudo solicitar unirse al viaje.");
        }
    };

    const handleStartTrip = async () => {
        if (!user || user.driver_mode !== true) {
            return router.push(routeScreen);
        }

        try {

            const { data: session, error: sError } = await supabase
                .from("trip_sessions")
                .select("*")
                .eq("driver_id", user.id)
                .in("status", ["pending", "active"])
                .maybeSingle();

            if (sError) {
                console.error(sError);
                Alert.alert("Error verificando viaje");
                return;
            }

            if (session) {
                Alert.alert("No se pudo iniciar el viaje.", "Ya tiene un viaje en curso");
                return;
            }

            const { data: sessionData, error: sessionError } = await supabase
                .from('trip_sessions')
                .insert([
                    {
                        route_id: routeId,
                        driver_id: user.id,
                        status: 'pending',
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

            setSessionChanged(true);
            router.replace("/(tabs)/home");

        } catch (error: any) {
            console.error("Error al iniciar el viaje:", error.message);
            Alert.alert("Error", "No se pudo iniciar el viaje. Por favor, intentalo de nuevo.");
        }
    }

    return (
        <ThemedView
            lightColor={Colors.light.historyCard.background}
            darkColor={Colors.light.historyCard.background}
            className="flex-1 justify-center rounded-[28px] m-2 p-5"
        >
            <ThemedText
                lightColor={Colors.light.textBlack}
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

                    {driverName && (
                        <View className="flex-row items-center mt-3">
                            <Image
                                source={{ uri: driverAvatar || "https://via.placeholder.com/150" }}
                                className="w-8 h-8 rounded-full border border-gray-200"
                            />
                            <View className="ml-2">
                                <Text className="text-xs font-bold text-gray-700">{driverName}</Text>
                                <View className="flex-row items-center">
                                    <Text className="text-[10px] text-gray-500">⭐ {driverRating || "0.0"}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    {!user?.driver_mode && (
                        <View className="my-3">
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
                                                className="w-8 h-8 rounded-full border-2 border-white opacity-40"
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
                        </View>
                    )}
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
                        onPress={() => {
                            console.log("🔘 Botón presionado. Modo conductor:", user?.driver_mode);
                            if (user?.driver_mode) {
                                handleStartTrip();
                            } else {
                                console.log("➡️ Llamando a handleJoinTrip...");
                                handleJoinTrip();
                            }
                        }}
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
