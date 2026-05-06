import { useAuth } from "@/app/context/AuthContext";
import AvailableRouteCard from "@/components/features/available-route-card";
import FilterCard from "@/components/common/FilterCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { AvailableRoute, RouteData, RouteStop, SessionData, SessionStop } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "@/app/context/SessionContext";
import MasonryGrid from "@/components/common/MasonryGrid";

export default function AvailableRoutesScreen() {
    const [text, setText] = useState<string>('');
    const [visibleFilters, setVisibleFilters] = useState<boolean>(false);
    const [selectedFilter, setSelectedFilter] = useState<string>('puntoPartida');
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const slideAnim = useRef(new Animated.Value(0)).current;

    const { user } = useAuth();
    const [routes, setRoutes] = useState<AvailableRoute[]>([]);

    const secondaryColor = useThemeColor({}, 'secondary');
    const tirdColor = useThemeColor({}, 'tird');

    useEffect(() => {
        fetchRoutes();
    }, [user?.driver_mode]);

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
    }, [user?.id, user?.driver_mode]);

    const fetchRoutes = async () => {
        try {
            if (user?.driver_mode) {
                const { data, error } = await supabase
                    .from('routes')
                    .select('*, stops(*)');

                if (error) throw error;
                setRoutes(data || []);
            } else {
                const { data, error } = await supabase
                    .from('trip_sessions')
                    .select(`
                        *,
                        driver:users!driver_id (
                            name,
                            avatar_profile
                        ),
                        routes (
                            image_url
                        ),
                        trip_session_stops (
                            *,
                            stop:stops (*)
                        ),
                        passengers:passenger_trip_sessions (
                            passenger:users!passenger_id (
                                id,
                                avatar_profile
                            )
                        )
                    `)
                    .eq('status', 'pending');

                if (error) throw error;

                const formattedRoutes = data.map(session => ({
                    ...session,
                    driver_name: session.driver?.name,
                    driver_avatar: session.driver?.avatar_profile,
                    driver_rating: session.driver?.rating,
                    passengers_data: session.passengers?.map((p: any) => ({
                        id: p.passenger?.id,
                        avatar: p.passenger?.avatar_profile
                    })) || []
                }));

                setRoutes(formattedRoutes);
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRoutes();
        setRefreshing(false);
    };

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: visibleFilters ? 1 : 0,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [visibleFilters]);

    const opacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const switchVisibleFilters = () => setVisibleFilters(visiblePrev => !visiblePrev);

    const activeFilter = visibleFilters ? selectedFilter : 'nombreRuta';

    const filteredRoutes = routes.filter(route => {
        if (!text) return true;
        const searchLower = text.toLowerCase();

        switch (activeFilter) {
            case 'puntoPartida':
                return route.start_location.toLowerCase().includes(searchLower);
            case 'puntoFinal':
                return route.end_location.toLowerCase().includes(searchLower);
            default:
                return route.start_location.toLowerCase().includes(searchLower) || 
                       route.end_location.toLowerCase().includes(searchLower);
        }
    });

    return (
        <View style={{ flex: 1 }}>
            <ThemedView lightColor={Colors.light.primary} darkColor={Colors.dark.primary} className="w-full px-4 py-6 rounded-bl-[40px]">
                <ThemedText className="font-semibold text-4xl py-3">
                    Hola, {user?.name}
                </ThemedText>
                <View className="flex-row items-center mb-4">
                    <ThemedTextInput
                        lightColor={Colors.light.background}
                        darkColor={Colors.dark.background}
                        placeholder="Buscar..."
                        onChangeText={setText} value={text}
                        className="flex-1 mr-2"
                    />
                    <Pressable
                        onPress={switchVisibleFilters}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        className="bg-white/20 p-3 rounded-2xl"
                    >
                        <Ionicons name="options-outline" size={24} color="white" />
                    </Pressable>
                </View>

                {visibleFilters && (
                    <Animated.View style={{ opacity, transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-2">
                            {[
                                { title: "Partida", value: "puntoPartida" },
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[secondaryColor]} />
                    }
                >
                    {filteredRoutes.length === 0 ? (
                        <View className="flex-1 items-center justify-center mt-20">
                            <Ionicons name="car-outline" size={80} color={tirdColor} />
                            <ThemedText className="text-xl font-semibold mt-4 text-slate-500">
                                No se encontraron rutas
                            </ThemedText>
                            <ThemedText className="text-slate-400 text-center px-10 mt-2">
                                {text ? "Prueba con otros términos de búsqueda" : "Vuelve a intentarlo más tarde"}
                            </ThemedText>
                        </View>
                    ) : (
                        <MasonryGrid
                            data={filteredRoutes}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={(item) => {
                                const isRouteData = (route: AvailableRoute): route is RouteData =>
                                    (route as RouteData).stops !== undefined;

                                const currentStops = isRouteData(item) ? item.stops : (item as SessionData).trip_session_stops;

                                return (
                                    <AvailableRouteCard
                                        key={item.id}
                                        trip_session_id={item.id}
                                        routeScreen={`/(tabs)/available-routes/route-detail?id=${item.id}`}
                                        start={item.start_location}
                                        end={item.end_location}
                                        routeId={isRouteData(item) ? item.id : (item as SessionData).route_id}
                                        startCoords={item.start_coords}
                                        endCoords={item.end_coords}
                                        stops={currentStops.map(stop => ({
                                            stop_id: (stop as RouteStop).id || (stop as SessionStop).stop_id,
                                            status: (stop as SessionStop).status || 'pending'
                                        }))}
                                        driverName={(item as any).driver_name}
                                        driverAvatar={(item as any).driver_avatar}
                                        driverRating={(item as any).driver_rating}
                                        passengersData={(item as any).passengers_data}
                                        isDriver={user?.driver_mode === true}
                                        imageUrl={
                                            isRouteData(item)
                                                ? (item as any).image_url
                                                : Array.isArray((item as any).routes)
                                                    ? ((item as any).routes[0] as any)?.image_url
                                                    : ((item as any).routes as any)?.image_url
                                        }
                                        onPress={() => {
                                            router.push({
                                                pathname: "/(tabs)/available-routes/route-preview",
                                                params: {
                                                    id: item.id,
                                                    type: isRouteData(item) ? 'route' : 'session'
                                                }
                                            });
                                        }}
                                    />
                                );
                            }}
                        />
                    )}
                </ScrollView>
            </View>
        </View>
    );
}