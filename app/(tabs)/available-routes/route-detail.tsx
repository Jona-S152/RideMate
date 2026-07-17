import { useAuth } from "@/app/context/AuthContext";
import { SwipeTripActions } from "@/components/features/SwipeTripActions";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTripMeetingPoints, useTripRealtimeById, useTripStops } from "@/hooks/useRealTime";
import { DriverInfo, PassengerTripSession, RouteData, SessionData, UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { sendMultiplePushNotifications, sendPushNotification } from "@/services/notifications.service";
import { ratingsService } from "@/services/ratings.service";
import { tripService } from "@/services/trip.service";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import { calculateDistance } from "@/utils/geo";
import { Ionicons } from "@expo/vector-icons";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, View } from "react-native";


export default function RouteDetail() {
    const params = useLocalSearchParams<{ id: string, sessionId?: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const { startTracking, stopTracking } = useTripTrackingStore();
    const sessionId = useMemo(() => Number(params.sessionId), [params.sessionId]);
    const [driver, setDriver] = useState<DriverInfo | null>(null);
    const [passengers, setPassengers] = useState<PassengerTripSession[]>([]);
    //const [meetingPoints, setMeetingPoints] = useState<MeetingPoint[]>([]);
    const [sessionUsers, setSessionUsers] = useState<UserData[]>([]);
    const [showStops, setShowStops] = useState(false);
    const [route, setRoute] = useState<RouteData | null>(null);
    const [imageError, setImageError] = useState(false);
    //const [session, setRouteSessions] = useState<SessionData | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [sortedItinerary, setSortedItinerary] = useState<any[]>([]);
    const [loadingItinerary, setLoadingItinerary] = useState(true);

    const { session } = useTripRealtimeById(Number(params.sessionId));
    const { stops: sessionStops } = useTripStops(Number(params.sessionId));
    const { meetingPoints: sessionMeetingPoints } = useTripMeetingPoints(Number(params.sessionId));

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchRoute(),
            session && user?.driver_mode === false && fetchDriverData(session),
            fetchPassengers().then(data => {
                if (data) fetchSessionUsers(data);
            }),
            //fetchMeetingPoints()
        ]);
        setRefreshing(false);
    };

    const fetchRoute = async () => {
        if (!params.id) return;

        console.log("id", params.id);
        const { data, error } = await supabase
            .from("routes")
            .select(`
                *,
                stops(*)
            `)
            .eq("id", params.id)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Error fetching route:", error);
            return;
        }

        console.log(data);

        setRoute(data || null);
    }

    const fetchPassengers = async () => {
        if (!sessionId) return;

        const { data, error } = await supabase
            .from("passenger_trip_sessions")
            .select("*")
            .eq("trip_session_id", sessionId);

        if (error) {
            console.error("Error fetching passengers:", error);
            return;
        }

        setPassengers(data || []);
        return data || [];
    };

    const fetchMeetingPoints = async () => {
        if (!sessionId) return;

        const { data, error } = await supabase
            .from("passenger_meeting_points")
            .select("*")
            .eq("trip_session_id", sessionId);

        if (error) {
            console.error("Error fetching meeting points:", error);
            return;
        }

        const mp_available = data?.filter(mp =>
            sessionMeetingPoints.some(smp =>
                smp.passenger_mp_id === mp.id && ["pending", "visited"].includes(smp.status)
            )
            // VALIDAR MEETING_POINTS DE LA SESION POR PASAJEROS 
            // VERIFICAR SI SE PUEDE REPLICAR COMO LA LÓGICA DE PARADAS
            // && passengers.some(p => p.passenger_id === mp.passenger_id)
        ) || [];

        console.log('MP available: ', mp_available);
        //setMeetingPoints(mp_available || []);
    };

    const fetchSessionUsers = async (passengerSessions: PassengerTripSession[]) => {
        if (!passengerSessions.length) {
            setSessionUsers([]);
            return [];
        }

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .in('id', passengerSessions.map(p => p.passenger_id));

        if (error) {
            console.error("Error fetching session users:", error);
            return [];
        }

        // Fetch ratings for all these users
        const userIds = data.map(u => u.id);
        const ratingsMap = await ratingsService.getUsersRatings(userIds);

        const userData = data.map(u => ({
            ...(u as UserData),
            rating: ratingsMap[u.id]?.rating || 0,
            rating_count: ratingsMap[u.id]?.count || 0
        }));

        setSessionUsers(userData);
        return userData;
    };

    const fetchDriverData = async (sessionData: SessionData) => {
        if (!sessionData) return;

        let driverInfo: DriverInfo | null = null;
        if (sessionData?.driver_id) {
            const { data: driverUser } = await supabase
                .from('users')
                .select('name, avatar_profile')
                .eq('id', sessionData.driver_id)
                .single();

            console.log('Driver USER: ', driverUser);

            if (driverUser) {
                const ratingInfo = await ratingsService.getUserRating(sessionData.driver_id);
                driverInfo = {
                    name: driverUser.name,
                    avatar: driverUser.avatar_profile,
                    rating: ratingInfo.rating
                };
            }
        }
        console.log("Driver info: ", driverInfo);
        setDriver(driverInfo);
    }

    useEffect(() => {
        fetchRoute();
        if (session && user?.driver_mode === false) {
            fetchDriverData(session);
        }
        fetchPassengers().then(data => {
            if (data) fetchSessionUsers(data);
        });
        //fetchMeetingPoints();
    }, [params.id, session, sessionMeetingPoints]);


    const handleStartTrip = async () => {
        if (session?.status === 'active') {
            return router.push(`/(tabs)/home/route-detail?id=${session?.id}`);
        }

        if (!user || user.driver_mode !== true) {
            return router.push(`/(tabs)/home/route-detail?id=${session?.id}`);
        }

        try {
            setIsActionLoading(true);

            // Validate driver proximity to start point
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se requiere acceso a la ubicación para iniciar el viaje.');
                setIsActionLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const driverLat = location.coords.latitude;
            const driverLon = location.coords.longitude;

            if (session?.start_coords?.coordinates) {
                const startLon = session.start_coords.coordinates[0];
                const startLat = session.start_coords.coordinates[1];

                const distance = calculateDistance(driverLat, driverLon, startLat, startLon);

                if (distance > 1.0) { // 1.0 km de tolerancia
                    Alert.alert(
                        "Punto de inicio lejano",
                        "Estás muy lejos del punto de inicio para comenzar la ruta. Por favor, acércate al punto de partida."
                    );
                    setIsActionLoading(false);
                    return;
                }
            }

            console.log("[available-routes.route-detail] starting trip session", { sessionId: session?.id });
            await tripService.startTripSession(session?.id!);
            console.log("[available-routes.route-detail] trip session started, dispatching notifications", { sessionId: session?.id });


            const passengers = await fetchPassengers();
            const passengerIds = (passengers || [])
                .map((p) => p.passenger_id)
                .filter(Boolean) as string[];

            if (!passengerIds.length) {
                console.log("[route-detail.handleStartTrip] no joined/approved passengers to notify", session?.id);
            } else {
                console.log("[route-detail.handleStartTrip] passengers to notify:", passengerIds);
                await sendMultiplePushNotifications(
                    passengerIds,
                    "¡El conductor ha iniciado la ruta! 🚗",
                    "Tu conductor ha comenzado el viaje. Dirígete al punto de recogida.",
                    {
                        type: "TRIP_STARTED",
                        trip_session_id: session?.id,
                    }
                );
                console.log("[route-detail.handleStartTrip] bulk trip-start notification dispatched", {
                    sessionId: session?.id,
                    passengerCount: passengerIds.length,
                });
            }

            await startTracking(session?.id!, user.id);

            router.push(`/(tabs)/home/route-detail?id=${session?.id}`);

        } catch (error: any) {
            console.error("Error al iniciar el viaje:", error.message);
            Alert.alert("Error", "No se pudo iniciar el viaje. Por favor, intentalo de nuevo.");
        } finally {
            setIsActionLoading(false);
        }
    }

    const handleCancelTrip = async () => {
        if (!user || user.driver_mode !== true) {
            Alert.alert("Info", "Solo el conductor puede cancelar el viaje desde aquí.");
            return;
        }

        Alert.alert(
            "Cancelar viaje",
            "¿Estás seguro de que deseas cancelar este viaje?",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Sí, cancelar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsActionLoading(true);
                            await tripService.cancelTripSession(sessionId);

                            const passengerIds = await tripService.getPassengersIdsByRoute_includingRequests(sessionId);
                            await sendMultiplePushNotifications(passengerIds, "Viaje cancelado", "El conductor ha cancelado el viaje.", {
                                type: "TRIP_CANCELLED",
                                trip_session_id: session?.id,
                            });

                            try {
                                await stopTracking();
                            } catch (trackError) {
                                console.error("Error stopping tracking on cancel:", trackError);
                            }

                            Alert.alert("Éxito", "Viaje cancelado correctamente.");
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/(tabs)/available-routes");
                            }
                        } catch (error: any) {
                            console.error("Error al cancelar el viaje:", error.message);
                            Alert.alert("Error", "No se pudo cancelar el viaje.");
                        } finally {
                            setIsActionLoading(false);
                        }
                    }
                }
            ]
        );
    }

    const formatRouteDate = (dateString: string) => {
        const date = new Date(dateString);

        // 1. Determinamos el prefijo (Hoy, Mañana o el nombre del día)
        let prefix = format(date, "EEEE, d 'may'", { locale: es }); // p.ej. "viernes, 15 may"

        if (isToday(date)) {
            prefix = `Hoy, ${format(date, "d 'may'", { locale: es })}`;
        } else if (isTomorrow(date)) {
            prefix = `Mañana, ${format(date, "d 'may'", { locale: es })}`;
        }

        // 2. Formateamos la hora
        const time = format(date, 'h:mm a');

        return `${prefix}  •  ${time}`;
    };

    const handleLeaveTrip = async () => {
        if (!session || !user) return;

        Alert.alert(
            "Abandonar viaje",
            "¿Estás seguro de que quieres salirte de este viaje?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sí, salir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await tripService.leaveTripSession(session.id, user.id);

                            await sendPushNotification(session.driver_id, "Viaje abandonado", `${user.name} ha abandonado el viaje.`, {
                                type: "TRIP_CANCELLED",
                                trip_session_id: session.id,
                            });

                            Alert.alert("Éxito", "Has abandonado el viaje correctamente.");
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/(tabs)/available-routes");
                            }
                        } catch (error) {
                            console.error("Error leaving trip:", error);
                            Alert.alert("Error", "No se pudo abandonar el viaje.");
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        const fetchAndSortItinerary = async () => {
            if (!session || !session.start_coords) {
                setSortedItinerary([]);
                setLoadingItinerary(false);
                return;
            }

            try {
                setLoadingItinerary(true);
                const startLat = session.start_coords.coordinates[1];
                const startLng = session.start_coords.coordinates[0];



                // Petición asíncrona que causaba el problema
                const stops = (await tripService.getSessionStops(session.id)) || [];
                const meetingPoints = (await tripService.getMeetingPoints(session.id)) || [];

                console.log("SESSION STOPS: ", JSON.stringify(stops, null, 2));
                console.log("TRIP SESSION STOPS: ", JSON.stringify(sessionStops, null, 2));

                const available_stops = stops?.filter(s =>
                    sessionStops.some(smp =>
                        smp.trip_session_id === s.trip_session_id
                        && smp.passenger_id === s.passenger_id
                        && smp.passenger_stop_id === s.id
                        && ["pending", "visited"].includes(smp.status)
                    )
                ) || [];

                // Filtrar solo puntos de encuentro de pasajeros aprobados
                const approvedMeetingPoints = meetingPoints.filter(mp =>
                    sessionMeetingPoints.some(smp =>
                        smp.trip_session_id === mp.trip_session_id
                        && smp.passenger_id === mp.passenger_id
                        && smp.passenger_mp_id === mp.id
                        && ["pending", "visited"].includes(smp.status)
                    )
                ) || [];

                console.log("AVAILABLE STOPS: ", available_stops);
                console.log("MEETING POINTS: ", approvedMeetingPoints);
                console.log("SESSION STOPS: ", sessionStops);
                console.log("STOPS: ", stops);

                const stop_points = (available_stops || []).map(s => {
                    const lat = s.coords.latitude;
                    const lng = s.coords.longitude;
                    return { ...s, type: 'stop' as const, lat, lng };
                });

                console.log("PARADAS: ", stops);
                console.log("PUNTOS DE ENCUENTRO: ", approvedMeetingPoints);

                const mp_points = (approvedMeetingPoints || []).map(mp => {
                    const lat = mp.coords.coordinates[1] ?? 0;
                    const lng = mp.coords.coordinates[0] ?? 0;
                    return { ...mp, type: 'meeting_point' as const, lat, lng };
                });

                const allPoints = [
                    ...stop_points,
                    ...mp_points
                ];

                const sorted = allPoints.sort((a, b) => {
                    const distA = calculateDistance(startLat, startLng, a.lat, a.lng);
                    const distB = calculateDistance(startLat, startLng, b.lat, b.lng);
                    return distA - distB;
                });

                // Guardamos el resultado síncronamente en el estado
                console.log("Itinerario ordenado:", JSON.stringify(sorted, null, 2));
                setSortedItinerary(sorted);
            } catch (error) {
                console.error("Error cargando el itinerario:", error);
            } finally {
                setLoadingItinerary(false);
            }
        };

        fetchAndSortItinerary();
    }, [sessionStops, sessionMeetingPoints, passengers, session]);

    return (
        <ThemedView
            className="flex-1"
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
        >
            <ThemedView
                className="flex-row items-center justify-between px-4 pb-4 w-full pt-8"
                lightColor={Colors.light.background}
                darkColor={Colors.dark.background}
            >
                {/* Botón de Atrás */}
                <Pressable
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace("/(tabs)/available-routes");
                        }
                    }}
                    className="p-2 -ml-2" // -ml-2 para compensar el padding y que el icono alinee al borde
                >
                    <Ionicons name="arrow-back" size={24} color="#E2EBF0" />
                </Pressable>

                {/* Título Centrado */}
                <View className="flex-1 items-center">
                    <ThemedText className="text-lg font-semibold text-[#E2EBF0]">
                        Detalle del viaje
                    </ThemedText>
                </View>

                {/* Botón de Compartir */}
                <Pressable
                    onPress={() => console.log("Compartir...")}
                    className="p-2 -mr-2"
                >
                    <Ionicons name="share-outline" size={24} color="#E2EBF0" />
                </Pressable>
            </ThemedView>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.dark.secondary}
                    />
                }
            >
                {route && (
                    <ThemedView
                        className="flex-row items-center justify-between px-4 pb-4 w-full pt-8"
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}
                    >
                        <View
                            className="w-full h-52 rounded-2xl overflow-hidden bg-gray-200"
                        >
                            <Image
                                source={
                                    route.image_url && !imageError
                                        ? { uri: route.image_url }
                                        : require('@/assets/images/mapExample.png')
                                }
                                onError={() => setImageError(true)}
                                resizeMode="cover"
                                className="w-full h-full"
                            />
                        </View>
                    </ThemedView>
                )}
                {
                    session && (
                        <>
                            {/* Fecha y Estado */}
                            <View className="flex-row justify-between px-4 mt-4">
                                <ThemedText
                                    lightColor={Colors.light.text}
                                    darkColor={Colors.dark.text}
                                    className="font-medium"
                                >{formatRouteDate(session.created_at.toString())}</ThemedText>

                                <View className="rounded-full px-3 py-1 justify-center" style={{ backgroundColor: session.status === 'active' ? 'rgba(226, 235, 240, 0.1)' : session.status === 'pending' ? 'rgba(185, 106, 16, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
                                    <ThemedText
                                        lightColor={session.status === 'active' ? Colors.light.secondary : session.status === 'pending' ? Colors.light.danger : Colors.light.success}
                                        darkColor={session.status === 'active' ? Colors.dark.secondary : session.status === 'pending' ? Colors.dark.danger : Colors.dark.success}
                                        className="text-xs font-bold uppercase"
                                    >
                                        {session.status === 'active' ? 'En curso' : session.status === 'pending' ? 'Pendiente' : session.status === 'cancelled' ? 'CANCELADO' : 'COMPLETADO'}
                                    </ThemedText>
                                </View>
                            </View>

                            {/* Itinerario Vertical */}
                            <View className="px-4 py-6">
                                {/* Punto de Inicio */}
                                <View className="flex-row items-center">
                                    <View className="items-center mr-4">
                                        <View className="w-3 h-3 rounded-full bg-blue-500" />
                                        <View className="w-0.5 h-8 bg-gray-600" />
                                    </View>
                                    <View className="flex-1">
                                        <ThemedText className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">Punto de Partida</ThemedText>
                                        <ThemedText className="text-base font-semibold" numberOfLines={1}>{session.start_location}</ThemedText>
                                    </View>
                                </View>

                                {/* Botón para mostrar/ocultar paradas intermedias */}
                                {((sessionStops.length || 0) > 0 || sessionMeetingPoints.length > 0) && (
                                    <Pressable
                                        onPress={() => setShowStops(!showStops)}
                                        className="flex-row items-center py-2 -ml-1"
                                    >
                                        <View className="w-8 h-8 items-center justify-center mr-2">
                                            <Ionicons
                                                name={showStops ? "remove-circle-outline" : "add-circle-outline"}
                                                size={20}
                                                color={Colors.dark.secondary}
                                            />
                                        </View>
                                        <ThemedText className="text-xs font-bold" style={{ color: Colors.dark.secondary }}>
                                            {showStops ? 'OCULTAR PARADAS Y PUNTOS DE ENCUENTRO' : `${(sortedItinerary.length || 0)} PARADAS INTERMEDIAS`}
                                        </ThemedText>
                                    </Pressable>
                                )}

                                {/* Lista de Paradas y Meeting Points Combinados */}
                                {showStops && (
                                    <View>
                                        {loadingItinerary ? (
                                            <ThemedText className="text-xs text-center text-gray-400 py-2">Cargando itinerario...</ThemedText>
                                        ) : sortedItinerary.length === 0 ? (
                                            <ThemedText className="text-xs text-center text-gray-400 py-2">No hay paradas programadas</ThemedText>
                                        ) : (sortedItinerary.map((item, index) => (
                                            <View key={`${item.type}-${item.id}`} className="flex-row items-center">
                                                <View className="items-center mr-4">
                                                    <View className="w-0.5 h-4 bg-gray-600" />
                                                    <View
                                                        className={`w-2.5 h-2.5 rounded-full ${item.type === 'stop' ? 'bg-orange-400' : 'border border-blue-400 bg-blue-200'}`}
                                                    />
                                                    <View className="w-0.5 h-4 bg-gray-600" />
                                                </View>
                                                <View className="flex-1 py-1">
                                                    <View className="flex-row items-center">
                                                        <Ionicons
                                                            name={item.type === 'stop' ? "location-outline" : "people-outline"}
                                                            size={12}
                                                            color={item.type === 'stop' ? "#F59E0B" : "#A0AECB"}
                                                            className="mr-1"
                                                        />
                                                        <ThemedText
                                                            className="text-[10px] font-bold uppercase"
                                                            style={{ color: item.type === 'stop' ? "#F59E0B" : "#A0AECB" }}
                                                        >
                                                            {item.type === 'stop' ? `Parada` : 'Punto de Encuentro'}
                                                        </ThemedText>
                                                    </View>
                                                    <ThemedText className="text-sm font-medium" numberOfLines={1}>{item.location}</ThemedText>
                                                </View>
                                            </View>
                                        )))}
                                    </View>
                                )}

                                {/* Punto Final */}
                                <View className="flex-row items-center">
                                    <View className="items-center mr-4">
                                        {!showStops && <View className="w-0.5 h-4 bg-gray-600" />}
                                        <View className="w-3 h-3 rounded-full bg-emerald-500" />
                                    </View>
                                    <View className="flex-1">
                                        <ThemedText className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">Punto de Llegada</ThemedText>
                                        <ThemedText className="text-base font-semibold" numberOfLines={1}>{session.end_location}</ThemedText>
                                    </View>
                                </View>
                            </View>
                        </>
                    )
                }
                {driver && (
                    <ThemedView className="flex-row gap-x-3 items-center justify-between py-4 m-4 rounded-2xl"
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}
                        style={{
                            borderColor: Colors.dark.borderSecondary,
                            borderWidth: 1
                        }}
                    >
                        <View className="flex-row">
                            <View className="relative">
                                <Image
                                    source={{ uri: driver.avatar || "https://via.placeholder.com/150" }}
                                    className="w-14 h-14 rounded-full border-[3px]"
                                    style={{ borderColor: Colors.dark.glassStrong }}
                                />
                                {/* Status/Rating Badge */}
                                <View className="absolute bottom-0 right-0 rounded-full bg-white">
                                    <Ionicons name="checkmark-circle" color={Colors.dark.success} size={16} />
                                </View>
                            </View>
                            <View className="flex-col justify-center mx-4">
                                <ThemedText className="text-base font-semibold">
                                    {driver.name}
                                </ThemedText>
                                <View className="flex-row items-center justify-center">
                                    <ThemedText className="text-base mr-1 text-white">
                                        {`${Number(driver.rating || 0).toFixed(1)}`}
                                    </ThemedText>
                                    <Ionicons name="star" color={Colors.dark.danger} size={12} />
                                    <ThemedText className="text-sm ml-2 text-textSecondary">
                                        (123 viajes)
                                    </ThemedText>
                                </View>
                            </View>
                        </View>
                        <View className="flex-row pr-4">
                            <Pressable onPress={() => console.log("Llamando...")} className="p-3 mr-2 justify-center items-center" style={{ borderWidth: 1, borderColor: Colors.dark.borderSecondary, borderRadius: 100 }}>
                                <Ionicons name="call" color={Colors.dark.secondary} size={20} />
                            </Pressable>
                            <Pressable onPress={() => console.log("Mensaje...")} className="p-3 justify-center items-center" style={{ borderWidth: 1, borderColor: Colors.dark.borderSecondary, borderRadius: 100 }}>
                                <Ionicons name="chatbubble-ellipses" color={Colors.dark.secondary} size={20} />
                            </Pressable>
                        </View>
                    </ThemedView>
                )}
                <ThemedView className="flex-row gap-x-3 items-center justify-between py-4 mx-4 rounded-2xl"
                    lightColor={Colors.light.background}
                    darkColor={Colors.dark.background}
                    style={{
                        borderColor: Colors.dark.borderSecondary,
                        borderWidth: 1
                    }}
                >
                    <View className="flex-row">
                        <View className="justify-center items-center">
                            <Ionicons name="car-sport" color={Colors.dark.text} size={40} />
                        </View>
                        <View className="flex-col justify-center mx-4">
                            <ThemedText className="text-base font-semibold">
                                Chevrolet Onix 2020
                            </ThemedText>
                            <ThemedText className="text-sm text-textSecondary">
                                {`Placa: GBB-1234  •  Color: Gris`}
                            </ThemedText>
                        </View>
                    </View>
                </ThemedView>
                <View className="m-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <ThemedText className="font-semibold text-base">
                            Pasajeros
                        </ThemedText>
                        <View className="flex-row items-center bg-blue-500/10 px-2 py-1 rounded-full">
                            <Ionicons name="people" size={14} color={Colors.dark.secondary} />
                            <ThemedText className="text-xs font-bold ml-1" lightColor={Colors.light.secondary} darkColor={Colors.dark.secondary}>
                                {`${passengers.filter(p => p.status === 'joined').length} APROBADOS`}
                            </ThemedText>
                        </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                        {sessionUsers.map((passenger) => {
                            const sessionInfo = passengers.find(p => p.passenger_id === passenger.id);
                            const isApproved = sessionInfo?.status === 'joined';

                            return (
                                <View key={passenger.id} className="items-center mr-4">
                                    <View className="relative">
                                        <Image
                                            source={{ uri: passenger.avatar_profile || "https://via.placeholder.com/150" }}
                                            className="w-12 h-12 rounded-full border-2"
                                            style={{ borderColor: isApproved ? Colors.dark.secondary : Colors.dark.borderSecondary }}
                                        />
                                        <View
                                            className="absolute -bottom-1 -right-1 bg-white rounded-full px-1.5 flex-row items-center shadow-sm"
                                            style={{ elevation: 2 }}
                                        >
                                            <ThemedText className="text-[10px] font-bold text-black">
                                                {Number(passenger.rating || 0).toFixed(1)}
                                            </ThemedText>
                                            <Ionicons name="star" size={8} color="#F59E0B" />
                                        </View>
                                        {!isApproved && (
                                            <View className="absolute inset-0 bg-black/40 rounded-full items-center justify-center">
                                                <Ionicons name="time" size={20} color="white" />
                                            </View>
                                        )}
                                    </View>
                                    <ThemedText className="text-xs mt-2 font-medium" numberOfLines={1} style={{ width: 64, textAlign: 'center' }}>
                                        {passenger.name.split(' ')[0]}
                                    </ThemedText>
                                </View>
                            );
                        })}
                        {sessionUsers.length === 0 && (
                            <ThemedText className="text-sm text-textSecondary italic">
                                No hay pasajeros unidos todavía
                            </ThemedText>
                        )}
                    </ScrollView>
                </View>
            </ScrollView>
            {
                (session?.status !== 'completed' && session?.status !== 'cancelled') && (user?.driver_mode === false || user?.is_driver === false) && (
                    <Pressable onPress={() => handleLeaveTrip()}>
                        <ThemedView className="flex-row justify-center items-center py-4 m-8 rounded-full"
                            lightColor={Colors.light.secondary}
                            darkColor={Colors.dark.secondary}
                        >
                            <Ionicons name="exit" size={20} color={Colors.dark.text} />
                            <ThemedText className="text-lg font-bold ml-1">Abandonar viaje</ThemedText>

                        </ThemedView>
                    </Pressable>
                )
            }
            {
                session?.status !== 'completed' && session?.status !== 'cancelled' && user?.driver_mode && (
                    <SwipeTripActions
                        onStart={handleStartTrip}
                        onCancel={handleCancelTrip}
                        isLoading={isActionLoading}
                    />
                )
            }
        </ThemedView>
    );
}
