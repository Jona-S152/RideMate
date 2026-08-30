import { useAuth } from "@/app/context/AuthContext";
import CustomDateRangePickerModal from "@/components/Modals/CustomDateRangePickerModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useSafeBackHandler } from "@/hooks/useSafeBackHandler";
import { ActivityItem, userService } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, RefreshControl, View } from "react-native";

export default function ActivityScreen() {
    const { user } = useAuth();
    useSafeBackHandler("/(tabs)/profile");
    const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
    const [history, setHistory] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

    const PAGE_SIZE = 10;

    // Animation Constants
    const HEADER_EXPANDED = 250;
    const HEADER_COLLAPSED = 100;
    const scrollY = useRef(new Animated.Value(0)).current;

    const headerHeight = scrollY.interpolate({
        inputRange: [0, HEADER_EXPANDED - HEADER_COLLAPSED],
        outputRange: [HEADER_EXPANDED, HEADER_COLLAPSED],
        extrapolate: 'clamp'
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_EXPANDED - HEADER_COLLAPSED],
        outputRange: [1, 0.95],
        extrapolate: 'clamp'
    });

    const loadFirstPage = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const result = await userService.getActivityHistory({
                userId: user.id,
                role,
                page: 1,
                limit: PAGE_SIZE,
                startDate,
                endDate,
            });
            setHistory(result.data);
            setPage(1);
            setHasMore(result.hasMore);
        } catch (error: any) {
            console.error("Error fetching activity:", error.message);
        } finally {
            setLoading(false);
        }
    }, [endDate, role, startDate, user?.id]);

    useEffect(() => {
        void loadFirstPage();
    }, [loadFirstPage]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadFirstPage();
        setRefreshing(false);
    };

    const loadMore = async () => {
        if (!user?.id || loading || loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const result = await userService.getActivityHistory({
                userId: user.id,
                role,
                page: nextPage,
                limit: PAGE_SIZE,
                startDate,
                endDate,
            });
            setHistory((current) => {
                const knownIds = new Set(current.map((item) => item.id));
                return [...current, ...result.data.filter((item) => !knownIds.has(item.id))];
            });
            setPage(nextPage);
            setHasMore(result.hasMore);
        } catch (error: any) {
            console.error("Error loading more activity:", error.message);
        } finally {
            setLoadingMore(false);
        }
    };

    const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completed':
                return { label: 'Finalizado', bg: 'rgba(16,185,129,0.15)', text: '#10B981', border: 'rgba(16,185,129,0.3)' };
            case 'cancelled':
                return { label: 'Cancelado', bg: 'rgba(239,68,68,0.15)', text: '#EF4444', border: 'rgba(239,68,68,0.3)' };
            case 'left':
                return { label: 'Abandonado', bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', border: 'rgba(245,158,11,0.3)' };
            case 'rejected':
                return { label: 'Rechazado', bg: 'rgba(239,68,68,0.15)', text: '#EF4444', border: 'rgba(239,68,68,0.3)' };
            default:
                return { label: status, bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', border: 'rgba(59,130,246,0.3)' };
        }
    };

    const totalMoney = history.reduce((sum, item) => sum + (item.price || 0), 0);

    const dateFilterLabel = startDate || endDate
        ? `${startDate?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) ?? 'Inicio'} - ${endDate?.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) ?? 'Fin'}`
        : 'Filtrar por fecha';

    const handleItemPress = (item: ActivityItem) => {
        if (item.trip_session_id) {
            router.push(`/(tabs)/available-routes/route-detail?id=${item.trip_session_id}`);
        }
    };

    const renderTripItem = ({ item }: { item: ActivityItem }) => {
        const statusConfig = getStatusConfig(item.status);
        const formattedDate = new Date(item.start_time).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        return (
            <Pressable
                onPress={() => handleItemPress(item)}
                className="mx-4 mb-4 p-5 rounded-3xl"
                style={{
                    backgroundColor: Colors.dark.glassSoft,
                    borderColor: Colors.dark.border,
                    borderWidth: 1,
                }}
            >
                {/* Header Row: Date & Status */}
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={16} color={Colors.dark.textSecondary} />
                        <ThemedText className="ml-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: Colors.dark.textSecondary }}>
                            {formattedDate}
                        </ThemedText>
                    </View>

                    <View
                        className="px-3 py-1 rounded-full border"
                        style={{ backgroundColor: statusConfig.bg, borderColor: statusConfig.border }}
                    >
                        <ThemedText className="text-[11px] font-bold uppercase" style={{ color: statusConfig.text }}>
                            {statusConfig.label}
                        </ThemedText>
                    </View>
                </View>

                {/* Timeline Route (Start -> End) */}
                <View className="mb-4 pl-1">
                    <View className="flex-row items-center mb-3">
                        <View className="w-3 h-3 rounded-full bg-blue-500 mr-3" />
                        <ThemedText className="font-bold text-base flex-1" style={{ color: "white" }} numberOfLines={1}>
                            {item.start_location.split(',')[0]}
                        </ThemedText>
                    </View>

                    <View className="w-0.5 h-4 bg-slate-700 ml-1.5 -my-2 mb-1" />

                    <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-emerald-500 mr-3" />
                        <ThemedText className="font-semibold text-sm flex-1 opacity-90" style={{ color: Colors.dark.textSecondary }} numberOfLines={1}>
                            {item.end_location.split(',')[0]}
                        </ThemedText>
                    </View>
                </View>

                {/* Footer Metrics Row: Price & Passenger Count */}
                <View
                    className="flex-row justify-between items-center pt-3.5"
                    style={{ borderTopColor: Colors.dark.border, borderTopWidth: 1 }}
                >
                    <View className="flex-row items-center gap-3">
                        {/* Price Badge */}
                        <View className="flex-row items-center px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10">
                            <Ionicons name="cash-outline" size={16} color={Colors.dark.secondary} />
                            <ThemedText className="ml-1.5 text-sm font-bold" style={{ color: Colors.dark.secondary }}>
                                ${item.price.toFixed(2)}
                            </ThemedText>
                        </View>

                        {/* Passenger Count Badge */}
                        <View className="flex-row items-center px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/50">
                            <Ionicons name="people-outline" size={16} color="#94A3B8" />
                            <ThemedText className="ml-1.5 text-xs font-semibold text-slate-300">
                                {item.passenger_count} {item.passenger_count === 1 ? 'pasajero' : 'pasajeros'}
                            </ThemedText>
                        </View>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={Colors.dark.textSecondary} />
                </View>
            </Pressable>
        );
    };

    return (
        <View className="flex-1" style={{ backgroundColor: Colors.dark.background }}>
            <AnimatedThemedView
                style={{ height: headerHeight, opacity: headerOpacity }}
                lightColor={Colors.dark.glass}
                darkColor={Colors.dark.glass}
                className="w-full px-6 pt-12 rounded-bl-[40px] z-10 border-b border-slate-800"
            >
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-x-3">
                        <Pressable
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace("/(tabs)/profile");
                                }
                            }}
                            className="p-2 -ml-2 rounded-full"
                            style={({ pressed }) => [{
                                backgroundColor: pressed ? "rgba(255, 255, 255, 0.15)" : "transparent"
                            }]}
                        >
                            <Ionicons name="arrow-back" size={26} color="white" />
                        </Pressable>
                        <ThemedText lightColor="white" className="text-2xl font-bold">
                            Mi Actividad
                        </ThemedText>
                    </View>

                    {/* Stats pill */}
                    <View className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <ThemedText className="text-xs font-bold" style={{ color: Colors.dark.secondary }}>
                            {history.length} {history.length === 1 ? 'viaje' : 'viajes'} • ${totalMoney.toFixed(2)}
                        </ThemedText>
                    </View>
                </View>

                {/* Role Switcher (Passenger / Driver) - Only if user is a Driver */}
                {user?.is_driver && (
                    <View className="flex-row p-1 rounded-full mb-3" style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}>
                        <Pressable
                            onPress={() => setRole('passenger')}
                            className="flex-1 py-2 rounded-full items-center"
                            style={{ backgroundColor: role === "passenger" ? Colors.dark.secondary : "transparent" }}
                        >
                            <ThemedText className="font-bold text-xs uppercase" style={{ color: role === "passenger" ? "#FFFFFF" : Colors.dark.textSecondary }}>
                                Pasajero
                            </ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={() => setRole('driver')}
                            className="flex-1 py-2 rounded-full items-center"
                            style={{ backgroundColor: role === "driver" ? Colors.dark.secondary : "transparent" }}
                        >
                            <ThemedText className="font-bold text-xs uppercase" style={{ color: role === "driver" ? "#FFFFFF" : Colors.dark.textSecondary }}>
                                Conductor
                            </ThemedText>
                        </Pressable>
                    </View>
                )}

                <View className="flex-row items-center gap-2">
                    <Pressable
                        onPress={() => setIsDatePickerVisible(true)}
                        className="flex-1 flex-row items-center px-3 py-2 rounded-2xl border"
                        style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border }}
                    >
                        <Ionicons name="calendar-outline" size={16} color={Colors.dark.secondary} />
                        <ThemedText className="ml-2 text-xs font-semibold flex-1" style={{ color: Colors.dark.textSecondary }} numberOfLines={1}>
                            {dateFilterLabel}
                        </ThemedText>
                        <Ionicons name="chevron-down" size={15} color={Colors.dark.textSecondary} />
                    </Pressable>
                    {(startDate || endDate) && (
                        <Pressable
                            accessibilityLabel="Limpiar filtro de fecha"
                            onPress={() => {
                                setStartDate(null);
                                setEndDate(null);
                            }}
                            className="p-2 rounded-xl border"
                            style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border }}
                        >
                            <Ionicons name="close" size={18} color={Colors.dark.textSecondary} />
                        </Pressable>
                    )}
                </View>
            </AnimatedThemedView>

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={Colors.dark.secondary} />
                    <ThemedText className="text-slate-400 mt-3 text-sm">Cargando actividad...</ThemedText>
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.secondary} />
                    }
                    onEndReached={() => void loadMore()}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-5 items-center">
                                <ActivityIndicator color={Colors.dark.secondary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center pt-20 px-8">
                            <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: "rgba(37,99,235,0.12)" }}>
                                <Ionicons name="document-text-outline" size={40} color={Colors.dark.secondary} />
                            </View>
                            <ThemedText className="text-lg font-bold text-white text-center">
                                Sin registros de actividad
                            </ThemedText>
                            <ThemedText className="text-slate-400 mt-2 text-sm text-center leading-5">
                                No tienes viajes {role === 'passenger' ? 'como pasajero' : 'como conductor'} en tu historial aún.
                            </ThemedText>
                        </View>
                    }
                />
            )}
            <CustomDateRangePickerModal
                visible={isDatePickerVisible}
                startDate={startDate}
                endDate={endDate}
                onClose={() => setIsDatePickerVisible(false)}
                onApply={(nextStartDate, nextEndDate) => {
                    setStartDate(nextStartDate);
                    setEndDate(nextEndDate);
                }}
            />
        </View>
    );
}
