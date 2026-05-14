import { useAuth } from "@/app/context/AuthContext";
import { useSession } from "@/app/context/SessionContext";
import { ThemedText } from "@/components/ui/ThemedText";
import { Colors } from "@/constants/Colors";
import { Coords } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Mapbox, { Camera, LineLayer, MapView, MarkerView, ShapeSource } from "@rnmapbox/maps";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RoutePreviewScreen() {
    const { id, type } = useLocalSearchParams<{ id: string; type: 'route' | 'session' }>();
    const { user } = useAuth();
    const { setSessionChanged } = useSession();

    const [loading, setLoading] = useState(true);
    const [routeData, setRouteData] = useState<any>(null);
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const bottomSheetRef = useRef<BottomSheet>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);
    const snapPoints = useMemo(() => ["45%", "85%"], []);

    useEffect(() => {
        fetchRouteDetails();
    }, [id, type]);

    const fetchRouteDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            if (type === 'route') {
                const { data, error } = await supabase
                    .from('routes')
                    .select('*, stops(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                console.log("Route Data (Driver):", data.id, "Stops count:", data.stops?.length);
                setRouteData(data);
                if (data.start_coords && data.end_coords) {
                    fetchMapboxRoute(data.start_coords, data.end_coords, data.stops || []);
                }
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
                    .eq('id', id)
                    .single();

                if (error) throw error;

                const formatted = {
                    ...data,
                    driver_name: data.driver?.name,
                    driver_avatar: data.driver?.avatar_profile,
                    driver_rating: data.driver?.rating,
                    passengers_data: data.passengers?.map((p: any) => ({
                        id: p.passenger?.id,
                        avatar: p.passenger?.avatar_profile
                    })) || [],
                    stops: data.trip_session_stops?.map((s: any) => s.stop) || []
                };
                console.log("Formatted Route Data (Passenger):", formatted.id, "Stops count:", formatted.stops.length);
                setRouteData(formatted);
                if (data.start_coords && data.end_coords) {
                    fetchMapboxRoute(data.start_coords, data.end_coords, formatted.stops);
                }
            }
        } catch (error) {
            console.error("Error fetching route details:", error);
            Alert.alert("Error", "No se pudieron cargar los detalles de la ruta");
        } finally {
            setLoading(false);
        }
    };

    const fetchMapboxRoute = async (start: Coords, end: Coords, stops: any[]) => {
        const origin = `${start.coordinates[0]},${start.coordinates[1]}`;
        const destination = `${end.coordinates[0]},${end.coordinates[1]}`;
        const sortedStops = [...stops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));

        const waypoints = sortedStops
            .map(s => `${s.longitude || s.coords?.coordinates[0]},${s.latitude || s.coords?.coordinates[1]}`)
            .join(';');

        const coordsString = waypoints ? `${origin};${waypoints};${destination}` : `${origin};${destination}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                setRouteGeoJSON({
                    type: "Feature",
                    geometry: data.routes[0].geometry,
                    properties: {},
                });

                if (cameraRef.current) {
                    cameraRef.current.fitBounds(
                        [Math.max(start.coordinates[0], end.coordinates[0]), Math.max(start.coordinates[1], end.coordinates[1])],
                        [Math.min(start.coordinates[0], end.coordinates[0]), Math.min(start.coordinates[1], end.coordinates[1])],
                        [100, 100, 450, 100],
                        1000
                    );
                }
            }
        } catch (e) {
            console.error("Mapbox error:", e);
        }
    };

    const handleAction = async () => {
        if (!user || !routeData) return;
        setActionLoading(true);

        try {
            if (user.driver_mode) {
                const { data: activeSession } = await supabase
                    .from("trip_sessions")
                    .select("*")
                    .eq("driver_id", user.id)
                    .in("status", ["pending", "active"])
                    .limit(1)
                    .maybeSingle();

                if (activeSession) {
                    Alert.alert("Error", "Ya tienes un viaje en curso");
                    return;
                }

                const { data: session, error: sError } = await supabase
                    .from('trip_sessions')
                    .insert([{
                        route_id: routeData.id,
                        driver_id: user.id,
                        status: 'pending',
                        start_location: routeData.start_location,
                        end_location: routeData.end_location,
                        start_time: new Date().toISOString(),
                        start_coords: routeData.start_coords,
                        end_coords: routeData.end_coords,
                        is_active: true,
                    }])
                    .select()
                    .single();

                if (sError) throw sError;

                if (routeData.stops?.length > 0) {
                    const stopsToInsert = routeData.stops.map((stop: any) => ({
                        trip_session_id: session.id,
                        stop_id: stop.id,
                        status: 'pending'
                    }));
                    await supabase.from('trip_session_stops').insert(stopsToInsert);
                }

                setSessionChanged(true);
                router.replace("/(tabs)/home");
            } else {
                router.push({
                    pathname: "/(tabs)/available-routes/selection-map-screen",
                    params: {
                        trip_session_id: routeData.id,
                        start_name: routeData.start_location,
                        end_name: routeData.end_location
                    }
                });
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "No se pudo procesar la solicitud");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: Colors.dark.background }}>
                <ActivityIndicator size="large" color={Colors.dark.secondary} />
            </View>
        );
    }

    const stops = routeData?.stops || [];
    const sortedStops = [...stops].sort((a: any, b: any) => (a.stop_order || 0) - (b.stop_order || 0));

    const CustomHandle = () => (
        <View style={styles.handleContainer}>
            <View style={styles.handleLine} />
            <ThemedText className="font-bold text-3xl pt-2 px-6">
                {user?.driver_mode ? "Iniciar Nueva Ruta" : "Viaje Disponible"}
            </ThemedText>
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <MapView style={styles.map} styleURL={Mapbox.StyleURL.TrafficNight} logoEnabled={false} compassEnabled={false}>
                    <Camera
                        ref={cameraRef}
                        zoomLevel={12}
                        centerCoordinate={routeData?.start_coords?.coordinates || [0, 0]}
                    />
                    {routeGeoJSON && (
                        <ShapeSource id="routeLine" shape={routeGeoJSON}>
                            <LineLayer
                                id="lineLayer"
                                style={{
                                    lineColor: Colors.dark.secondary,
                                    lineWidth: 5,
                                    lineJoin: 'round',
                                    lineCap: 'round',
                                }}
                            />
                        </ShapeSource>
                    )}
                    {routeData?.start_coords && (
                        <MarkerView id="origin" coordinate={routeData.start_coords.coordinates} anchor={{ x: 0.5, y: 1 }}>
                            <View className="items-center">
                                <View className="bg-slate-800 p-1 rounded-full shadow-md">
                                    <Ionicons name="flag" size={24} color={Colors.light.success} />
                                </View>
                                {/* <ThemedText className="bg-white/80 px-1 text-[8px] font-bold">Inicio</ThemedText> */}
                            </View>
                        </MarkerView>
                    )}
                    {sortedStops.map((stop: any, index: number) => {
                        const lng = stop.longitude || stop.coords?.coordinates[0];
                        const lat = stop.latitude || stop.coords?.coordinates[1];
                        return (
                            <MarkerView
                                key={`stop-${index}`}
                                id={`stop-${index}`}
                                coordinate={[lng, lat]}
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons
                                        name="location-sharp"
                                        size={24}
                                        color={Colors.dark.secondary}
                                    />
                                </View>
                            </MarkerView>
                        );
                    })}
                    {routeData?.end_coords && (
                        <MarkerView id="destination" coordinate={routeData.end_coords.coordinates} anchor={{ x: 0.5, y: 1 }}>
                            <View className="items-center">
                                <View className="bg-slate-800 p-1 rounded-full shadow-md">
                                    <Ionicons name="location" size={24} color={Colors.light.danger} />
                                </View>
                                {/* <ThemedText className="bg-white/80 px-1 text-[8px] font-bold">Fin</ThemedText> */}
                            </View>
                        </MarkerView>
                    )}
                </MapView>

                <Pressable onPress={() => router.back()} style={styles.backButton as ViewStyle}>
                    <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
                </Pressable>

                <BottomSheet
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={snapPoints}
                    backgroundStyle={{
                        backgroundColor: Colors.dark.background,
                        borderTopLeftRadius: 55,
                    }}
                    handleComponent={CustomHandle}
                >
                    <BottomSheetScrollView 
                        style={{ backgroundColor: Colors.dark.background }}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Visual Route Timeline */}
                        <View style={styles.timelineContainer}>
                            {/* Origin */}
                            <View style={styles.timelineItem}>
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.dot, { backgroundColor: Colors.light.success }]} />
                                    <View style={styles.line} />
                                </View>
                                <View style={styles.timelineRight}>
                                    <ThemedText className="text-xs font-bold opacity-50 uppercase">Origen</ThemedText>
                                    <ThemedText className="text-lg font-semibold">{routeData?.start_location?.split(',')[0]}</ThemedText>
                                </View>
                            </View>

                            {/* Stops */}
                            {sortedStops.map((stop: any, index: number) => (
                                <View key={`stop-list-${index}`} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[styles.dotSmall, { backgroundColor: Colors.dark.secondary }]} />
                                        <View style={styles.line} />
                                    </View>
                                    <View style={styles.timelineRight}>
                                        <ThemedText className="text-[10px] font-bold opacity-50 uppercase">Parada {index + 1}</ThemedText>
                                        <ThemedText className="text-base font-medium">{stop.location?.split(',')[0]}</ThemedText>
                                    </View>
                                </View>
                            ))}

                            {/* Destination */}
                            <View style={styles.timelineItem}>
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.dot, { backgroundColor: Colors.light.danger }]} />
                                </View>
                                <View style={styles.timelineRight}>
                                    <ThemedText className="text-xs font-bold opacity-50 uppercase">Destino</ThemedText>
                                    <ThemedText className="text-lg font-semibold">{routeData?.end_location?.split(',')[0]}</ThemedText>
                                </View>
                            </View>
                        </View>

                        {routeData?.driver_name && (
                            <View className="flex-row items-center my-6 bg-white/10 p-4 rounded-3xl">
                                <Image source={{ uri: routeData.driver_avatar }} className="w-12 h-12 rounded-full border border-white/20" />
                                <View className="ml-3">
                                    <ThemedText className="font-bold">{routeData.driver_name}</ThemedText>
                                    <ThemedText className="text-xs font-light">Conductor • ★ {routeData.driver_rating?.toFixed(1) || "0.0"}</ThemedText>
                                </View>
                            </View>
                        )}

                        <Pressable
                            onPress={handleAction}
                            disabled={actionLoading}
                            style={({ pressed }) => [
                                styles.actionButton,
                                { backgroundColor: Colors.dark.secondary, opacity: pressed || actionLoading ? 0.8 : 1 }
                            ]}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color={Colors.light.text} />
                            ) : (
                                <ThemedText className="font-bold text-lg text-white">
                                    {user?.driver_mode ? "Confirmar e Iniciar" : "Solicitar este Viaje"}
                                </ThemedText>
                            )}
                        </Pressable>
                        <View className="h-10" />
                    </BottomSheetScrollView>
                </BottomSheet>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    map: { flex: 1 },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.dark.background,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 5,
    },
    handleContainer: {
        backgroundColor: Colors.dark.background,
        borderTopLeftRadius: 55,
        paddingTop: 12,
        paddingBottom: 8,
    },
    handleLine: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        alignSelf: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 60,
    },
    timelineContainer: {
        marginVertical: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 60,
    },
    timelineLeft: {
        width: 30,
        alignItems: 'center',
    },
    timelineRight: {
        flex: 1,
        paddingBottom: 20,
        paddingLeft: 10,
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 1,
    },
    dotSmall: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 1,
        marginTop: 4,
    },
    line: {
        position: 'absolute',
        top: 10,
        bottom: 0,
        width: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    markerContainer: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    marker: { padding: 5, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
    actionButton: {
        borderRadius: 30,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        elevation: 3,
    }
});
