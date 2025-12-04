import { useAuth } from "@/app/context/AuthContext";
import AvailableRouteCard from "@/components/available-route-card";
import FilterCard from "@/components/FilterCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { AvailableRoute, RouteData, RouteStop, SessionData, SessionStop } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, View } from "react-native";

export default function AvailableRoutesScreen() {
    const [ text, setText ] = useState<string>('');
    const [ visibleFilters, setVisibleFilters ] = useState<boolean>(false);
    const slideAnim = useRef(new Animated.Value(0)).current; 

    
    const { user } = useAuth();
    const [routes, setRoutes] = useState<AvailableRoute[]>([]);

    useEffect(() => {
        fetchRoutes();
    }, [user?.driver_mode]);

    const fetchRoutes = async () => {
        if (user === null) return;

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
                    )
                `)
                .eq('status', 'pending')
        }

        const { data, error } = await query;

        if (!error) setRoutes(data);
        else console.log("ERROR ROUTES:", error);
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
                {visibleFilters ?
                <Animated.View
                    style={{
                        transform: [{translateY}],
                        opacity,
                    }}>
                    <View className="flex-row items-center">
                        <FilterCard title="Punto de partida" value="puntoPartida" isSelected={true}/>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            >
                            <FilterCard title="Punto Final" value="puntoFinal" />
                            <FilterCard title="Ruta" value="nombreRuta"/>
                            <FilterCard title="Conductor" value="nombreRuta"/>
                            <FilterCard title="2 pasajeros" value="nombreRuta"/>
                        </ScrollView>
                    </View>
                </Animated.View>
                :
                <></>
                }
            </ThemedView>
            <View className="flex-1 mx-4 mt-4 mb-24">
                <ScrollView
                    showsVerticalScrollIndicator={false}
                >
                    {routes.map((item) => {
                        
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
                            />
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}