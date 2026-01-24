import { useAuth } from "@/app/context/AuthContext";
import AvailableRouteCard from "@/components/available-route-card";
import FilterCard from "@/components/FilterCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { AvailableRoute, RouteData, RouteStop, SessionData, SessionStop } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, RefreshControl, ScrollView, View } from "react-native";

export default function AvailableRoutesScreen() {
    const [text, setText] = useState<string>('');
    const [visibleFilters, setVisibleFilters] = useState<boolean>(false);
    const [selectedFilter, setSelectedFilter] = useState<string>('puntoPartida');
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const { user } = useAuth();
    const [routes, setRoutes] = useState<AvailableRoute[]>([]);

    useEffect(() => {
        fetchRoutes();
    }, [user?.driver_mode]);

    // Suscripción en tiempo real para pasajeros
    useEffect(() => {
        if (!user || user.driver_mode) return;

        const subscription = supabase
            .channel('public:trip_sessions')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'trip_sessions',
                filter: 'status=eq.pending'
            }, () => {
                fetchRoutes();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.driver_mode]);

    const fetchRoutes = async () => {
        if (user === null) return;
        setRefreshing(true);

        let query;

        if (user.driver_mode) {
            query = supabase
                .from("routes")
                .select(`
                    id,
                    start_location,
                    end_location,
                    start_latitude,
                    start_longitude,
                    end_latitude,
                    end_longitude,
                    stops (
                        id,
                        location,
                        latitude,
                        longitude,
                        stop_order
                    )
                `);
        } else {
            query = supabase
                .from("trip_sessions")
                .select(`
                    id,
                    route_id,
                    driver_id,
                    status,
                    start_location,
                    end_location,
                    start_latitude,
                    start_longitude,
                    end_latitude,
                    end_longitude,
                    trip_session_stops (
                        id,
                        stop_id,
                        status,
                        visit_time
                    ),
                    passenger_trip_sessions (
                        id,
                        status,
                        rejected
                    )
                `)
                .in('status', ['pending', 'active']);
        }

        const { data, error } = await query;

        if (!error && data) {
            let validRoutes = (data as any[]).filter(route => {
                const associatedPassengers = route.passenger_trip_sessions?.filter((p: any) =>
                    (p.status === 'joined' || p.status === 'pending_approval') && !p.rejected
                ) || [];
                return associatedPassengers.length < 4;
            });

            // Si somos pasajeros, traemos info del conductor y pasajeros
            if (!user.driver_mode && validRoutes.length > 0) {
                const driverIds = validRoutes.map(r => r.driver_id).filter(Boolean);
                const ratingsMap = await ratingsService.getUsersRatings(driverIds);

                // Fetch driver details
                const { data: drivers } = await supabase
                    .from("users")
                    .select("id, name, avatar_profile")
                    .in("id", driverIds);

                // Collect all passenger IDs across all routes
                let allPassengerIds: string[] = [];
                validRoutes.forEach(route => {
                    const joined = route.passenger_trip_sessions?.filter((p: any) => p.status === 'joined') || [];
                    joined.forEach((p: any) => allPassengerIds.push(p.passenger_id));
                });

                // Fetch all passenger avatars
                let passengersMap: Record<string, any> = {};
                if (allPassengerIds.length > 0) {
                    const { data: passengersData } = await supabase
                        .from("users")
                        .select("id, avatar_profile")
                        .in("id", allPassengerIds);

                    passengersData?.forEach(u => {
                        passengersMap[u.id] = u;
                    });
                }

                validRoutes = validRoutes.map(r => {
                    const driver = drivers?.find(d => d.id === r.driver_id);

                    // Map passengers for this route
                    const routePassengers = r.passenger_trip_sessions
                        ?.filter((p: any) => p.status === 'joined')
                        .map((p: any) => {
                            const user = passengersMap[p.passenger_id];
                            return user ? { id: user.id, avatar: user.avatar_profile } : null;
                        })
                        .filter(Boolean) || [];

                    return {
                        ...r,
                        driver_name: driver?.name,
                        driver_avatar: driver?.avatar_profile,
                        driver_rating: ratingsMap[r.driver_id]?.rating || 0,
                        passengers_data: routePassengers
                    };
                });
            }

            setRoutes(validRoutes);
        } else if (error) {
            console.log("ERROR ROUTES:", error);
        }

        setRefreshing(false);
    };

    const onRefresh = () => {
        fetchRoutes();
    };


    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: visibleFilters ? 1 : 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [visibleFilters]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 0]
    })

    const opacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    })

    const switchVisibleFilters = () => setVisibleFilters(visiblePrev => !visiblePrev);

    // Identificar qué filtro usar (si no están visibles, usar 'nombreRuta' por defecto)
    const activeFilter = visibleFilters ? selectedFilter : 'nombreRuta';

    // Lógica de filtrado
    const filteredRoutes = routes.filter(route => {
        if (!text) return true;
        const searchLower = text.toLowerCase();

        switch (activeFilter) {
            case 'puntoPartida':
                return route.start_location.toLowerCase().includes(searchLower);
            case 'puntoFinal':
                return route.end_location.toLowerCase().includes(searchLower);
            case 'nombreRuta':
                // Buscamos si el origen o el destino coinciden (comportamiento por defecto)
                return route.start_location.toLowerCase().includes(searchLower) ||
                    route.end_location.toLowerCase().includes(searchLower);
            default:
                return route.start_location.toLowerCase().includes(searchLower);
        }
    });

    return (
        <View className="flex-1">
            <ThemedView lightColor={Colors.light.primary} className="w-full px-4 py-6 rounded-bl-[40px]">
                <ThemedText
                    lightColor={Colors.light.text}
                    className="font-semibold text-4xl py-3">
                    Hola, {user?.name}
                </ThemedText>
                <View className="flex-row items-center mb-4">
                    <ThemedTextInput
                        lightColor={Colors.light.background}
                        placeholder="Buscar..."
                        onChangeText={setText} value={text}
                        className="flex-1 mr-2"
                    />

                    <Pressable
                        onPress={switchVisibleFilters}
                        style={{ backgroundColor: Colors.light.secondary }} className="rounded-full justify-center items-center w-10 h-10">
                        <Ionicons name="filter" size={30} color="black" />
                    </Pressable>
                </View>
                {visibleFilters && (
                    <Animated.View
                        style={{
                            transform: [{ translateY }],
                            opacity,
                        }}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row"
                        >
                            {[
                                { title: "Salida", value: "puntoPartida" },
                                { title: "Destino", value: "puntoFinal" },
                                { title: "Ruta", value: "nombreRuta" },
                            ]
                                .sort((a, b) => (a.value === selectedFilter ? -1 : b.value === selectedFilter ? 1 : 0))
                                .map((filter) => (
                                    <FilterCard
                                        key={filter.value}
                                        title={filter.title}
                                        value={filter.value}
                                        isSelected={selectedFilter === filter.value}
                                        onPress={setSelectedFilter}
                                    />
                                ))}
                        </ScrollView>
                    </Animated.View>
                )}
            </ThemedView>
            <View className="flex-1 mx-4 mt-4 mb-24">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.secondary]} />
                    }
                >
                    {filteredRoutes.length === 0 ? (
                        <View className="flex-1 items-center justify-center mt-20">
                            <Ionicons name="car-outline" size={80} color={Colors.light.tird} />
                            <ThemedText className="text-xl font-semibold mt-4 text-slate-500">
                                No se encontraron rutas
                            </ThemedText>
                            <ThemedText className="text-slate-400 text-center px-10 mt-2">
                                {text ? "Prueba con otros términos de búsqueda" : "Vuelve a intentarlo más tarde"}
                            </ThemedText>
                        </View>
                    ) : (
                        filteredRoutes.map((item) => {

                            // 🚀 USAR TIPO GUARD (Type Predicate) para acceder a las propiedades específicas

                            const isDriverMode = user?.driver_mode;

                            // Función para verificar si el ítem es una RouteData
                            const isRouteData = (route: AvailableRoute): route is RouteData => {
                                return (route as RouteData).stops !== undefined;
                            };

                            const isSessionData = (route: AvailableRoute): route is SessionData => {
                                return (route as SessionData).trip_session_stops !== undefined;
                            };

                            const stopsData = isDriverMode
                                ? (item as RouteData).stops // Acceso directo para el conductor
                                : (item as SessionData).trip_session_stops; // Acceso directo para el pasajero

                            // O mejor: Basado en la estructura del ítem
                            const currentStops = isRouteData(item) ? item.stops : (item as SessionData).trip_session_stops;


                            return (
                                <AvailableRouteCard
                                    key={item.id}
                                    trip_session_id={item.id}
                                    routeScreen={`/(tabs)/available-routes/route-detail?id=${item.id}`}
                                    start={item.start_location}
                                    end={item.end_location}

                                    // Aquí usamos el operador ternario para acceder a la propiedad correcta
                                    routeId={isRouteData(item) ? item.id : (item as SessionData).route_id}
                                    startLongitude={item.start_longitude}
                                    startLatitude={item.start_latitude}
                                    endLongitude={item.end_longitude}
                                    endLatitude={item.end_latitude}

                                    // Mapeo adaptativo:
                                    stops={currentStops.map(stop => ({
                                        // item.id (para RouteStop) vs item.stop_id (para SessionStop)
                                        stop_id: (stop as RouteStop).id || (stop as SessionStop).stop_id,
                                        status: (stop as SessionStop).status || 'pending'
                                    }))}
                                    driverName={(item as any).driver_name}
                                    driverAvatar={(item as any).driver_avatar}
                                    driverRating={(item as any).driver_rating}
                                    passengersData={(item as any).passengers_data}
                                />
                            );
                        })
                    )}
                </ScrollView>
            </View>
        </View>
    );
}