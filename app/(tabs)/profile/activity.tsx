import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, RefreshControl, View } from "react-native";

interface TripHistoryItem {
    id: string;
    start_location: string;
    end_location: string;
    start_time: string;
    status: string;
    price?: number;
    passenger_count?: number;
    role: 'passenger' | 'driver';
}

export default function ActivityScreen() {
    const { user } = useAuth();
    const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
    const [history, setHistory] = useState<TripHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Animation Constants
    const HEADER_EXPANDED = 200;
    const HEADER_COLLAPSED = 100;
    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, HEADER_EXPANDED - HEADER_COLLAPSED],
        outputRange: [HEADER_EXPANDED, HEADER_COLLAPSED],
        extrapolate: 'clamp'
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_EXPANDED - HEADER_COLLAPSED],
        outputRange: [1, 0.9],
        extrapolate: 'clamp'
    });

    useEffect(() => {
        fetchHistory();
    }, [role]);

    const fetchHistory = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            if (role === 'passenger') {
                const { data, error } = await supabase
                    .from('passenger_route_history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('end_time', { ascending: false });

                if (error) throw error;

                const formatted: TripHistoryItem[] = data.map((item: any) => ({
                    id: `h-${item.id}`, // Use the unique record ID with a prefix
                    start_location: item.start_location,
                    end_location: item.end_location,
                    start_time: item.start_time,
                    status: 'completed',
                    price: 2,
                    role: 'passenger'
                }));
                setHistory(formatted);
            } else {
                const { data, error } = await supabase
                    .from('passenger_route_history')
                    .select('*')
                    .eq('driver_id', user.id)
                    .order('end_time', { ascending: false });

                if (error) throw error;

                // Group by trip_session_id to avoid duplicate trips in driver view
                // Use a Map to preserve insertion order (which is sorted by end_time DESC)
                const uniqueTripsMap = new Map<number, any>();
                data.forEach((item: any) => {
                    if (!uniqueTripsMap.has(item.trip_session_id)) {
                        uniqueTripsMap.set(item.trip_session_id, {
                            ...item,
                            p_count: 0
                        });
                    }
                    if (item.user_id !== item.driver_id) {
                        const trip = uniqueTripsMap.get(item.trip_session_id);
                        if (trip) trip.p_count += 1;
                    }
                });

                const formatted: TripHistoryItem[] = Array.from(uniqueTripsMap.values()).map((item: any) => ({
                    id: `s-${item.trip_session_id}`, // Use trip_session_id with a different prefix
                    start_location: item.start_location,
                    end_location: item.end_location,
                    start_time: item.start_time,
                    status: 'completed',
                    price: 2,
                    passenger_count: item.p_count,
                    role: 'driver'
                }));
                setHistory(formatted);
            }
        } catch (error: any) {
            console.error("Error fetching activity:", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

    const renderTripItem = ({ item }: { item: TripHistoryItem }) => (
        <View
            className="mx-4 mb-4 p-4 rounded-3xl"
            style={{
                backgroundColor: Colors.dark.glassSoft,
                borderColor: Colors.dark.border,
                borderWidth: 1,
            }}
        >
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                        <Ionicons name="location" size={16} color={Colors.light.primary} />
                        <ThemedText className="ml-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(item.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </ThemedText>
                    </View>
                    <ThemedText className="font-bold text-base" style={{ color: Colors.dark.text }} numberOfLines={1}>
                        {item.start_location.split(',')[0]}
                    </ThemedText>
                </View>
                <View className={`px-3 py-1 rounded-full ${item.status === 'completed' ? 'bg-green-100' : item.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-50'}`}>
                    <ThemedText className={`text-[10px] font-bold uppercase ${item.status === 'completed' ? 'text-green-600' : item.status === 'cancelled' ? 'text-red-800' : 'text-primary'}`}>
                        {item.status === 'completed' ? 'Finalizado' : item.status === 'joined' ? 'En curso' : item.status}
                    </ThemedText>
                </View>
            </View>

            <View className="flex-row items-center mb-3">
                <View className="w-1 h-6 mx-2 rounded-full" style={{ backgroundColor: Colors.dark.border }} />
                <ThemedText className="text-sm" style={{ color: Colors.dark.textSecondary }} numberOfLines={1}>
                    {item.end_location.split(',')[0]}
                </ThemedText>
            </View>

            <View className="flex-row justify-between items-center pt-3" style={{ borderTopColor: Colors.dark.border, borderTopWidth: 1 }}>
                <View className="flex-row items-center">
                    <Ionicons name={item.role === 'driver' ? 'people' : 'wallet'} size={18} color="#64748b" />
                    <ThemedText className="ml-2 font-medium" style={{ color: Colors.dark.textSecondary }}>
                        {item.role === 'driver' ? `${item.passenger_count} pasajeros` : `$${item.price}`}
                    </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </View>
        </View>
    );

    return (
        <View className="flex-1" style={{ backgroundColor: Colors.dark.background }}>
            <AnimatedThemedView
                style={{ height: headerHeight, opacity: headerOpacity }}
                lightColor={Colors.dark.glass}
                darkColor={Colors.dark.glass}
                className="w-full px-6 pt-12 rounded-bl-[40px] z-10"
            >
                <ThemedText lightColor="white" className="text-3xl font-bold mb-6">
                    Mi Actividad
                </ThemedText>

                {user?.is_driver && (
                    <View className="flex-row p-1 rounded-full mb-4" style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}>
                        <Pressable
                            onPress={() => setRole('passenger')}
                            className="flex-1 py-2 rounded-full items-center"
                            style={{ backgroundColor: role === "passenger" ? Colors.dark.secondary : "transparent" }}
                        >
                            <ThemedText className="font-bold" style={{ color: role === "passenger" ? Colors.dark.primary : Colors.dark.text }}>
                                Pasajero
                            </ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={() => setRole('driver')}
                            className="flex-1 py-2 rounded-full items-center"
                            style={{ backgroundColor: role === "driver" ? Colors.dark.secondary : "transparent" }}
                        >
                            <ThemedText className="font-bold" style={{ color: role === "driver" ? Colors.dark.primary : Colors.dark.text }}>
                                Conductor
                            </ThemedText>
                        </Pressable>
                    </View>
                )}
            </AnimatedThemedView>

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
            ) : (
                <Animated.FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTripItem}
                    contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.primary} />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center pt-20">
                            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
                            <ThemedText className="text-slate-400 mt-4 text-center px-10">
                                No tienes actividades registradas como {role === 'passenger' ? 'pasajero' : 'conductor'} aún.
                            </ThemedText>
                        </View>
                    }
                />
            )}
        </View>
    );
}
