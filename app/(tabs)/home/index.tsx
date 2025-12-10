import { useAuth } from "@/app/context/AuthContext";
import { useSession } from "@/app/context/SessionContext";
import RouteCard from "@/components/history-route-card";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { RouteHistory, SessionData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, Switch, View } from "react-native";

export default function HomeScreen() {
    const { user, updateUser } = useAuth();
    const { sessionChanged, setSessionChanged } = useSession();

    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => {setIsEnabled(previousState => !previousState);}

    const [history, setHistory] = useState<RouteHistory[]>([]);
    const [activeSessionData, setActiveSessionData] = useState<SessionData | null>(null);

    const slideStudent = useRef(new Animated.Value(0)).current; // 0 visible, 300 fuera
    const opacityAnimStudent = useRef(new Animated.Value(0)).current;
    const slideCar = useRef(new Animated.Value(300)).current; // 300 fuera, 0 visible
    const opacityAnimCar = useRef(new Animated.Value(0)).current;

    const slideAnim = useRef(new Animated.Value(300)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (sessionChanged) {
            console.log("Detectado cambio de sesión → recargando datos");

            loadActiveSession(); // refresca datos

            setSessionChanged(false); // reset bandera
        }
    }, [sessionChanged, user?.driver_mode]);

    useEffect(() => {
        if (user?.driver_mode !== isEnabled) {
            updateUser({ driver_mode: isEnabled });
        }
        if (isEnabled) {
            // Student se mueve a la derecha y Car entra desde la izquierda
            Animated.timing(slideStudent, {
            toValue: 300, // fuera
            duration: 500,
            useNativeDriver: true,
            }).start();

            Animated.timing(slideCar, {
            toValue: 0, // visible
            duration: 500,
            useNativeDriver: true,
            }).start();
        } else {
            // Student entra y Car sale
            Animated.timing(slideStudent, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            }).start();

            Animated.timing(slideCar, {
            toValue: 300,
            duration: 500,
            useNativeDriver: true,
            }).start();
        }
    }, [isEnabled]);

    useEffect(() => {
        Animated.timing(opacityAnimStudent, {
            toValue: isEnabled ? 0 : 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [isEnabled]);

    useEffect(() => {
        Animated.timing(opacityAnimCar, {
            toValue: isEnabled ? 1 : 0,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [isEnabled]);

    useEffect(() => {
        loadActiveSession();
        fetchHistory();
    }, [user?.id])

    const loadActiveSession = async () => {
        const session = await fetchActiveSession();
        setActiveSessionData(session);
    };

    const fetchHistory = async () => {
        if (!user?.id) return;

        console.log(`Fetching history for user ${user.name}`);

        const { data, error } = await supabase
            .from("passenger_route_history")
            .select('*')
            .eq('user_id', user.id)
            .order('end_time', { ascending: false });

        if (error) {
            console.error("Error fetching route history: ", error);
        } else {
            setHistory(data as RouteHistory[]);
            console.log(history);
        }
    }

    const fetchActiveSession = async (): Promise<SessionData | null> => {
        if (!user?.id) return null;

        try {
            if (user.driver_mode) {
                const { data } = await supabase
                    .from('trip_sessions')
                    .select("*")
                    .eq('driver_id', user.id)
                    .in('status', ["pending", "active"])
                    .is('end_time', null)
                    .order('start_time', { ascending: false })
                    .limit(1)
                    .single();

                return data as SessionData ?? null;
            } else {
                console.log("USER ID: ", user.id);
                const { data: passengerSession } = await supabase
                    .from('passenger_trip_sessions')
                    .select('trip_session_id')
                    .eq('passenger_id', user.id)
                    .in('status', ['joined'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!passengerSession) return null;

                const { data: tripData } = await supabase
                    .from('trip_sessions')
                    .select('*')
                    .eq('id', passengerSession.trip_session_id)
                    .in('status', ['pending', 'active']) // ← corregido
                    .is('end_time', null)
                    .single();

                console.log("TRIP DATA: ", tripData);

                return tripData as SessionData ?? null;
            }
        } catch (error) {
            console.error(error);
            return null;
        }
    };



    return (
        <View className="flex-1">
            <ThemedView lightColor={Colors.light.primary} className="w-full rounded-bl-[40px]">
                <View className="flex-row justify-between px-8 pt-16">
                    <View>
                        <ThemedText
                            lightColor={Colors.light.text}
                            className="font-semibold text-4xl">
                                Hola, {user?.name}
                        </ThemedText>
                        <ThemedText
                            lightColor={Colors.light.text}
                            className="font-light text-sm">
                                ¿Que ruta quieres tomar?
                        </ThemedText>
                    </View>
                    {user?.is_driver &&
                        <Switch
                            trackColor={{ false: Colors.light.tird, true: Colors.light.tird }}
                            thumbColor={isEnabled ? Colors.light.secondary : Colors.light.primary}
                            ios_backgroundColor={Colors.light.text}
                            value={isEnabled}
                            onValueChange={toggleSwitch}>

                        </Switch>
                    }                
                </View>
                <View className="flex-row justify-between mx-8">
                    <View className="flex-col gap-4 mt-4">
                        <ThemedText
                            lightColor={Colors.light.text}
                            className="font-light text-base">
                                {`Te has unido a ${history.length} ruta${history.length > 1 ? 's' : ''}`}
                        </ThemedText>
                        <ThemedText
                            lightColor={Colors.light.text}
                            className="font-light text-base">
                                Has ahorrado $20
                        </ThemedText>
                        <ThemedText
                            lightColor={Colors.light.text}
                            className="font-light text-base">
                                Conociste +1 estudiante
                        </ThemedText>
                    </View>
                    <View className="relative">
                        <View className="w-full h-[270px]"/>
                        <Animated.Image
                            source={require('@/assets/images/studentWalk.png')}
                            resizeMode="contain"
                            className="h-64 absolute right-1"
                            style={{ transform : [{ translateX: slideStudent }], opacity: opacityAnimStudent, }}/>
                        <Animated.Image
                            source={require('@/assets/images/CarHome.png')}
                            resizeMode="contain"
                            className="mt-32 absolute -right-14"
                            style={{ transform : [{ translateX: slideCar }], opacity: opacityAnimCar, }}/>
                    </View>
                </View>
            </ThemedView>

            <View className="flex-1 mx-4 mt-4">
                <ScrollView showsVerticalScrollIndicator={false}>
                    {activeSessionData && (
                        <RouteCard
                            key={activeSessionData.id}
                            title={`${activeSessionData.start_location} - ${activeSessionData.end_location}`}
                            isActive={activeSessionData.status === "active" || activeSessionData.status === "pending"}
                            routeScreen={`/(tabs)/home/route-detail?id=${activeSessionData.id}`}
                            // 🚀 Pasando datos dinámicos
                            startLocation={activeSessionData.start_location.split(',')[0].trim()} 
                            endLocation={activeSessionData.end_location.split(',')[0].trim()}
                            
                            // 🚧 Valor Temporal: DEBES reemplazar '3' con el resultado de una consulta
                            passengerCount={3 }
                        />
                        
                    )}
                    {history.length > 0 ? (
                        history.map((item) => (
                            <RouteCard
                                key={item.id}
                                title={`${item.start_location} - ${item.end_location}`}
                                isActive={item.end_time === null}
                                routeScreen={`/(tabs)/home/route-detail?id=${item.trip_session_id}`}
                                // 🚀 Pasando datos dinámicos
                                startLocation={item.start_location.split(',')[0].trim()} 
                                endLocation={item.end_location.split(',')[0].trim()}
                                
                                // 🚧 Valor Temporal: DEBES reemplazar '3' con el resultado de una consulta
                                passengerCount={3 }
                            />
                        ))
                    ) : (
                        <ThemedText className="text-center mt-10 text-gray-500">
                            No tienes rutas en tu historial.
                        </ThemedText>
                    )}
                </ScrollView>
            </View>
            {/* <View className="h-48 bg-fuchsia-500"/> */}
        </View>
    );
}