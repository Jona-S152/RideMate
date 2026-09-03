import { useAuth } from "@/app/context/AuthContext";
import { SwipeTripActions } from "@/components/features/SwipeTripActions";
import ConfirmActionModal from "@/components/Modals/ConfirmActionModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useAppInsets } from "@/hooks/useAppInsets";
import { usePassengerTripRealtimeById, useTripMeetingPoints, useTripRealtimeById, useTripStops } from "@/hooks/useRealTime";
import { useSafeBackHandler } from "@/hooks/useSafeBackHandler";
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
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, View } from "react-native";
import Toast from "react-native-toast-message";


export default function RouteDetail() {
    useSafeBackHandler("/(tabs)/available-routes");
    const insets = useAppInsets();
    const params = useLocalSearchParams<{ id: string, sessionId?: string, viewOnly?: string, source?: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const { startTracking, stopTracking } = useTripTrackingStore();
    const isReadOnlyView = params.viewOnly === 'true' || params.source === 'activity' || params.source === 'history';
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

    const [confirmModalConfig, setConfirmModalConfig] = useState<{
        visible: boolean;
        title: string;
        description: string;
        confirmText: string;
        cancelText?: string;
        confirmType?: "danger" | "warning" | "info";
        iconName?: keyof typeof Ionicons.glyphMap;
        loading?: boolean;
        onConfirm: () => Promise<void> | void;
    } | null>(null);

    // Unificar el ID: el link de la lista de pasajeros pasa el trip_session_id en 'id',
    // mientras que otras pantallas lo pasan en 'sessionId'.
    const sessionId = useMemo(() => Number(params.sessionId || params.id), [params.sessionId, params.id]);

    const { session } = useTripRealtimeById(sessionId);
    const { stops: sessionStops } = useTripStops(sessionId);
    const { meetingPoints: sessionMeetingPoints } = useTripMeetingPoints(sessionId);
    const { passengerSession } = usePassengerTripRealtimeById(sessionId, user);
    const isDriverView = session && user
        ? session.driver_id === user.id
        : !!user?.driver_mode;
    const isSessionTerminal = useMemo(
        () => ['cancelled', 'completed', 'left'].includes(String(session?.status ?? '')),
        [session?.status]
    );

    const isPassengerActive = useMemo(() => {
        const userPassenger = passengers.find(p => p.passenger_id === user?.id);
        if (!userPassenger) return false;
        return ['joined', 'pending', 'pending_approval', 'approved'].includes(userPassenger.status);
    }, [passengers, user?.id]);
    const redirectedRef = useRef(false);

    const passengerStatusConfig: Record<string, { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
        joined: { label: 'Unido', bg: '#2563EB', text: '#E0F2FE', icon: 'checkmark-circle-outline' },
        pending: { label: 'Pendiente', bg: '#F59E0B', text: '#FEF3C7', icon: 'time-outline' },
        completed: { label: 'Completado', bg: '#10B981', text: '#D1FAE5', icon: 'checkmark-done-outline' },
        cancelled: { label: 'Cancelado', bg: '#EF4444', text: '#FEE2E2', icon: 'close-circle-outline' },
        left: { label: 'Abandonó', bg: '#F97316', text: '#FFEDD5', icon: 'log-out-outline' },
        rejected: { label: 'Rechazado', bg: '#6B7280', text: '#F3F4F6', icon: 'ban-outline' },
    };

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
            .eq("trip_session_id", sessionId)
            .order("id", { ascending: false });

        if (error) {
            console.error("Error fetching passengers:", error);
            return;
        }

        // Deduplicate by passenger_id keeping the latest session entry
        const latestPassengersMap = new Map<string, PassengerTripSession>();
        (data || []).forEach(p => {
            if (!latestPassengersMap.has(p.passenger_id)) {
                latestPassengersMap.set(p.passenger_id, p);
            }
        });
        const deduplicatedPassengers = Array.from(latestPassengersMap.values());

        setPassengers(deduplicatedPassengers);
        return deduplicatedPassengers;
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
        ) || [];

        console.log('MP available: ', mp_available);
    };

    const fetchSessionUsers = async (passengerSessions: PassengerTripSession[]) => {
        if (!passengerSessions.length) {
            setSessionUsers([]);
            return [];
        }

        const passengerIds = [...new Set(passengerSessions.map(p => p.passenger_id))];

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .in('id', passengerIds);

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
                .select('name, last_name, avatar_profile, status')
                .eq('id', sessionData.driver_id)
                .maybeSingle();

            console.log('Driver USER: ', driverUser);

            if (driverUser) {
                const ratingInfo = await ratingsService.getUserRating(sessionData.driver_id);
                const isDeleted = driverUser.status === 'deleted' || driverUser.last_name === 'Eliminado';
                const fullName = isDeleted
                    ? "Usuario Eliminado"
                    : `${driverUser.name || "Usuario"} ${driverUser.last_name || ""}`.trim();

                driverInfo = {
                    name: fullName,
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

    useEffect(() => {
        console.warn("SESSION status changed:", session?.status, "| sessionId:", sessionId, "| driver_mode:", user?.driver_mode, "| readOnly:", isReadOnlyView);

        if (isReadOnlyView || redirectedRef.current) {
            return;
        }

        // Redirigir al pasajero a la pantalla de ruta activa cuando el conductor inicia el viaje
        if (session?.status === 'active' && !isDriverView) {
            console.warn(`[route-detail] Redirecting passenger to active route: /(tabs)/home/route-detail?id=${sessionId}`);
            redirectedRef.current = true;
            router.replace(`/(tabs)/home/route-detail?id=${sessionId}`);
            return;
        }

        // Redirigir al pasajero cuando se cancele su sesión o la ruta completa
        const passengerStatus = passengerSession?.status;
        const isPassengerTerminal = ['cancelled', 'left', 'rejected'].includes(String(passengerStatus ?? ''));
        if (!isDriverView && (session?.status === 'cancelled' || session?.status === 'completed' || isPassengerTerminal)) {
            console.warn(`[route-detail] Session ${sessionId} is ${session?.status ?? passengerStatus}, redirecting to available-routes`);
            redirectedRef.current = true;
            router.replace('/(tabs)/available-routes');
        }
    }, [session?.status, passengerSession?.status, sessionId, isDriverView, isReadOnlyView]);

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
                Toast.show({
                    type: "error",
                    text1: "Permiso denegado",
                    text2: "Se requiere acceso a la ubicación para iniciar el viaje.",
                });
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
                    Toast.show({
                        type: "warning",
                        text1: "Punto de inicio lejano",
                        text2: "Estás muy lejos del punto de inicio para comenzar la ruta. Por favor, acércate al punto de partida.",
                    });
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
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudo iniciar el viaje. Por favor, intentalo de nuevo.",
            });
        } finally {
            setIsActionLoading(false);
        }
    }

    const executeCancelTrip = async () => {
        setConfirmModalConfig(prev => prev ? { ...prev, loading: true } : null);
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

            setConfirmModalConfig(null);
            Toast.show({
                type: "success",
                text1: "Éxito",
                text2: "Viaje cancelado correctamente.",
            });
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)/available-routes");
            }
        } catch (error: any) {
            console.error("Error al cancelar el viaje:", error.message);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudo cancelar el viaje.",
            });
            setConfirmModalConfig(null);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCancelTrip = () => {
        if (!user || user.driver_mode !== true) {
            Toast.show({
                type: "info",
                text1: "Información",
                text2: "Solo el conductor puede cancelar el viaje desde aquí.",
            });
            return;
        }

        setConfirmModalConfig({
            visible: true,
            title: "Cancelar viaje",
            description: "¿Estás seguro de que deseas cancelar este viaje?",
            confirmText: "Sí, cancelar",
            cancelText: "No",
            confirmType: "danger",
            iconName: "close-circle-outline",
            onConfirm: executeCancelTrip,
        });
    };

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

    const executeLeaveTrip = async () => {
        if (!session || !user) return;
        setConfirmModalConfig(prev => prev ? { ...prev, loading: true } : null);
        try {
            await tripService.leaveTripSession(session.id, user.id);

            await sendPushNotification(session.driver_id, "Viaje abandonado", `${user.name} ha abandonado el viaje.`, {
                type: "TRIP_CANCELLED",
                trip_session_id: session.id,
            });

            setConfirmModalConfig(null);
            Toast.show({
                type: "success",
                text1: "Éxito",
                text2: "Has abandonado el viaje correctamente.",
            });
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(tabs)/available-routes");
            }
        } catch (error) {
            console.error("Error leaving trip:", error);
            Toast.show({
                type: "error",
                text1: "Error",
                text2: "No se pudo abandonar el viaje.",
            });
            setConfirmModalConfig(null);
        }
    };

    const handleLeaveTrip = () => {
        if (!session || !user) return;

        setConfirmModalConfig({
            visible: true,
            title: "Abandonar viaje",
            description: "¿Estás seguro de que quieres salirte de este viaje?",
            confirmText: "Sí, salir",
            cancelText: "Cancelar",
            confirmType: "danger",
            iconName: "log-out-outline",
            onConfirm: executeLeaveTrip,
        });
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
            style={{ paddingBottom: insets.bottom }}
        >
            <ThemedView
                className="flex-row items-center justify-between px-4 pb-4 w-full"
                style={{ paddingTop: insets.top + 8 }}
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
                {/* <Pressable
                    onPress={() => console.log("Compartir...")}
                    className="p-2 -mr-2"
                >
                    <Ionicons name="share-outline" size={24} color="#E2EBF0" />
                </Pressable> */}
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
                        className="flex-row items-center justify-between px-4 pb-4 w-full pt-4"
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
                        {/* <View className="flex-row pr-4">
                            <Pressable onPress={() => console.log("Llamando...")} className="p-3 mr-2 justify-center items-center" style={{ borderWidth: 1, borderColor: Colors.dark.borderSecondary, borderRadius: 100 }}>
                                <Ionicons name="call" color={Colors.dark.secondary} size={20} />
                            </Pressable>
                            <Pressable onPress={() => console.log("Mensaje...")} className="p-3 justify-center items-center" style={{ borderWidth: 1, borderColor: Colors.dark.borderSecondary, borderRadius: 100 }}>
                                <Ionicons name="chatbubble-ellipses" color={Colors.dark.secondary} size={20} />
                            </Pressable>
                        </View> */}
                    </ThemedView>
                )}
                {session?.vehicle && (
                    <ThemedView className="flex-row gap-x-3 items-center justify-between py-4 mx-4 rounded-2xl px-4"
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}
                        style={{
                            borderColor: Colors.dark.borderSecondary,
                            borderWidth: 1
                        }}
                    >
                        <View className="flex-row items-center flex-1">
                            <View className="justify-center items-center mr-3">
                                <Ionicons name="car-sport" color={Colors.dark.text} size={36} />
                            </View>
                            <View className="flex-col justify-center flex-1">
                                <ThemedText className="text-base font-semibold">
                                    {session.vehicle.brand} {session.vehicle.model} ({session.vehicle.year})
                                </ThemedText>
                                <ThemedText className="text-sm text-textSecondary">
                                    {`Placa: ${session.vehicle.plate}  •  Color: ${session.vehicle.color}`}
                                </ThemedText>
                            </View>
                        </View>
                    </ThemedView>
                )}
                <View className="m-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <ThemedText className="font-semibold text-base">
                            Pasajeros
                        </ThemedText>
                        {session?.status !== 'completed' && (
                            <View className="flex-row items-center bg-blue-500/10 px-2 py-1 rounded-full">
                                <Ionicons name="people" size={14} color={Colors.dark.secondary} />
                                <ThemedText className="text-xs font-bold ml-1" lightColor={Colors.light.secondary} darkColor={Colors.dark.secondary}>
                                    {`${passengers.filter(p => !['left', 'cancelled', 'rejected'].includes(p.status) && ['pending', 'joined', 'completed'].includes(p.status)).length} APROBADOS`}
                                </ThemedText>
                            </View>
                        )}
                    </View>

                    <View className="gap-3">
                        {passengers.length > 0 ? passengers.map((passengerSession) => {
                            const passengerUser = sessionUsers.find(u => u.id === passengerSession.passenger_id);
                            const isDeleted = passengerUser?.status === 'deleted' || passengerUser?.last_name === 'Eliminado';
                            const displayName = isDeleted
                                ? "Usuario Eliminado"
                                : `${passengerUser?.name || "Usuario"} ${passengerUser?.last_name || ''}`.trim();
                            const statusConfig = passengerStatusConfig[passengerSession.status] || {
                                label: passengerSession.status,
                                bg: '#475569',
                                text: '#E2E8F0',
                                icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
                            };

                            return (
                                <View key={`${passengerSession.id}-${passengerSession.passenger_id}`} className="flex-row items-center justify-between rounded-2xl px-3 py-2" style={{ backgroundColor: Colors.dark.primary, borderWidth: 1, borderColor: Colors.dark.borderSecondary }}>
                                    <View className="flex-row items-center flex-1">
                                        <View className="relative mr-3">
                                            {passengerUser?.avatar_profile ? (
                                                <Image source={{ uri: passengerUser.avatar_profile }} className="w-11 h-11 rounded-full border-2" style={{ borderColor: Colors.dark.borderSecondary }} />
                                            ) : (
                                                <View className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: Colors.dark.glassSoft }}>
                                                    <Ionicons name="person" size={20} color={Colors.dark.textSecondary} />
                                                </View>
                                            )}
                                        </View>
                                        <View className="flex-1">
                                            <ThemedText className="text-sm font-semibold" numberOfLines={1}>{displayName}</ThemedText>
                                            <ThemedText className="text-[11px] text-textSecondary" numberOfLines={1}>
                                                {passengerSession.status === 'joined' ? 'Se unió al viaje' : passengerSession.status === 'pending' ? 'Pendiente de recogida' : passengerSession.status === 'completed' ? 'Finalizó el viaje' : passengerSession.status === 'cancelled' ? 'Canceló su participación' : passengerSession.status === 'left' ? 'Abandonó el viaje' : passengerSession.status === 'rejected' ? 'Solicitud rechazada' : passengerSession.status}
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                        <View className="flex-row items-center px-2 py-1 rounded-full" style={{ backgroundColor: statusConfig.bg, opacity: 0.18 }}>
                                            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.text} />
                                            <ThemedText className="text-[10px] font-bold ml-1" style={{ color: statusConfig.text }}>{statusConfig.label}</ThemedText>
                                        </View>
                                    </View>
                                </View>
                            );
                        }) : (
                            <ThemedText className="text-sm text-textSecondary italic">
                                No hay pasajeros registrados en esta sesión
                            </ThemedText>
                        )}
                    </View>
                </View>
            </ScrollView>
            {
                !isReadOnlyView &&
                !isSessionTerminal &&
                (!user?.driver_mode && !user?.is_driver) &&
                isPassengerActive && (
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
                !isReadOnlyView &&
                !isSessionTerminal &&
                user?.driver_mode && (
                    <SwipeTripActions
                        onStart={handleStartTrip}
                        onCancel={handleCancelTrip}
                        isLoading={isActionLoading}
                    />
                )
            }

            {confirmModalConfig && (
                <ConfirmActionModal
                    visible={confirmModalConfig.visible}
                    title={confirmModalConfig.title}
                    description={confirmModalConfig.description}
                    confirmText={confirmModalConfig.confirmText}
                    cancelText={confirmModalConfig.cancelText}
                    confirmType={confirmModalConfig.confirmType}
                    iconName={confirmModalConfig.iconName}
                    loading={confirmModalConfig.loading}
                    onConfirm={confirmModalConfig.onConfirm}
                    onCancel={() => setConfirmModalConfig(null)}
                />
            )}

        </ThemedView>
    );
}
