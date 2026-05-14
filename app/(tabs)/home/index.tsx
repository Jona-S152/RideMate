import { useAuth } from "@/app/context/AuthContext";
import { useSession } from "@/app/context/SessionContext";
import RouteCard from "@/components/features/history-route-card";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useActiveSession } from "@/hooks/useRealTime";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Switch, View } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { registerDeviceToken } from "@/services/notifications.service";
import { ratingsService } from "@/services/ratings.service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
// ... imports

export default function HomeScreen() {
  const { user, updateUser } = useAuth();
  const { sessionChanged, setSessionChanged } = useSession();
  const { activeSession, loading } = useActiveSession(user);

  // Theme hooks
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const tirdColor = useThemeColor({}, 'tird');
  const secondaryColor = useThemeColor({}, 'secondary');
  const dangerColor = useThemeColor({}, 'danger');

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => {
    setIsEnabled((previousState) => !previousState);
  };

  const [history, setHistory] = useState<any[]>([]);

  const slideStudent = useRef(new Animated.Value(0)).current; // 0 visible, 300 fuera
  const opacityAnimStudent = useRef(new Animated.Value(0)).current;
  const slideCar = useRef(new Animated.Value(300)).current; // 300 fuera, 0 visible
  const opacityAnimCar = useRef(new Animated.Value(0)).current;

  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkUser = async () => {
      if (user) {
        await registerDeviceToken(user.id);
      }
    };

    checkUser();
  }, [user]);

  useEffect(() => {
    if (sessionChanged) {
      console.log("Detectado cambio de sesión → recargando datos");

      setSessionChanged(false); // reset bandera
    }
  }, [sessionChanged]);

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
    fetchHistory();
  }, [user?.id, user?.driver_mode]);



  const fetchHistory = async () => {
    if (!user?.id) return;

    console.log(`Fetching history for user ${user.name}`);

    const { data: historyData, error } = await supabase
      .from("passenger_route_history")
      .select("*")
      .eq("user_id", user.id)
      .order("end_time", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching route history: ", error);
      return;
    }

    // Enrich history data with driver and passengers
    const enrichedHistory = await Promise.all(historyData.map(async (item) => {
      // 1. Fetch Driver info for this trip
      // Note: passenger_route_history might not have driver_id directly if it's a view or simple table.
      // If it doesn't, we need to join or fetch from trip_sessions.
      // Assuming item.trip_session_id exists.

      // Fetch trip session to get Driver ID (if not in history)
      const { data: session } = await supabase
        .from('trip_sessions')
        .select('driver_id, route_id, routes(image_url)')
        .eq('id', item.trip_session_id)
        .single();

      let driverInfo = undefined;
      if (session?.driver_id) {
        const { data: driverUser } = await supabase
          .from('users')
          .select('name, avatar_profile')
          .eq('id', session.driver_id)
          .single();

        if (driverUser) {
          const ratingInfo = await ratingsService.getUserRating(session.driver_id);
          driverInfo = {
            name: driverUser.name,
            avatar: driverUser.avatar_profile,
            rating: ratingInfo.rating
          };
        }
      }

      // 2. Fetch Passengers for this trip
      // We want passengers who were part of this COMPLETED session
      const { data: passengers } = await supabase
        .from('passenger_trip_sessions')
        .select('passenger_id')
        .eq('trip_session_id', item.trip_session_id)
        .in('status', ['completed', 'joined']); // Include completed as well

      let passengersData: any[] = [];
      if (passengers && passengers.length > 0) {
        const pIds = passengers.map(p => p.passenger_id);
        const { data: users } = await supabase
          .from('users')
          .select('id, avatar_profile')
          .in('id', pIds);

        if (users) {
          passengersData = users.map(u => ({ id: u.id, avatar: u.avatar_profile }));
        }
      }

      return {
        ...item,
        driver_details: driverInfo,
        passengers_data: passengersData,
        route_id: session?.route_id,
        image_url: Array.isArray(session?.routes)
          ? (session.routes[0] as any)?.image_url
          : (session?.routes as any)?.image_url
      };
    }));

    setHistory(enrichedHistory);
  };

  const [driverDetails, setDriverDetails] = useState<{ name: string; avatar: string; rating: number } | undefined>(undefined);
  const [passengerDetails, setPassengerDetails] = useState<{ id: string; avatar: string }[]>([]);

  // Fetch details for active session
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!activeSession) {
        setDriverDetails(undefined);
        setPassengerDetails([]);
        return;
      }

      try {
        // 1. Fetch Driver Details
        if (activeSession.driver_id) {
          const { data: driverUser } = await supabase
            .from("users")
            .select("name, avatar_profile")
            .eq("id", activeSession.driver_id)
            .single();

          if (driverUser) {
            const ratingInfo = await ratingsService.getUserRating(activeSession.driver_id);
            setDriverDetails({
              name: driverUser.name,
              avatar: driverUser.avatar_profile,
              rating: ratingInfo.rating,
            });
          }
        }

        // 2. Fetch Passenger Details (only joined)
        const { data: passengers } = await supabase
          .from("passenger_trip_sessions")
          .select("passenger_id")
          .eq("trip_session_id", activeSession.id)
          .eq("status", "joined");

        if (passengers && passengers.length > 0) {
          const passengerIds = passengers.map(p => p.passenger_id);
          const { data: usersData } = await supabase
            .from("users")
            .select("id, avatar_profile")
            .in("id", passengerIds);

          if (usersData) {
            setPassengerDetails(usersData.map(u => ({
              id: u.id,
              avatar: u.avatar_profile
            })));
          }
        } else {
          setPassengerDetails([]);
        }

      } catch (error) {
        console.error("Error fetching session details:", error);
      }
    };

    fetchSessionDetails();
  }, [activeSession]);

  function handleInputPress(activeMode: string): void {
    console.log('Modo activo: ', activeMode);
    router.push({
      pathname: "/(tabs)/available-routes/create-route-screen",
      params: {
        activeModeP: activeMode,
      }
    })
  }

  return (
    <View className="flex-1"
      style={{
        backgroundColor: Colors.dark.background,
      }}
    >
      <ThemedView
        lightColor={Colors.light.secondary}
        darkColor={Colors.dark.secondary}
        className="flex-col mx-4 mt-12 mb-4 rounded-2xl"
      >
        <View className="flex-row justify-between mx-4 mt-4">
          <View>
            <ThemedText
              className="font-semibold text-4xl"
            >
              Hola, {user?.name}
            </ThemedText>
            <ThemedText
              className="font-light text-sm"
            >
              ¿A dónde vamos hoy?
            </ThemedText>
          </View>
          {user?.is_driver && (
            <View className="justify-center items-center">
              <Switch
                trackColor={{ false: tirdColor, true: tirdColor }}
                thumbColor={
                  isEnabled ? dangerColor : primaryColor // Dynamic colors
                }
                ios_backgroundColor={textColor}
                value={isEnabled}
                onValueChange={toggleSwitch}
              ></Switch>
            </View>
          )}
        </View>
        <View className="flex-col m-4">
          <Pressable
            onPress={() => handleInputPress('start')}
            className={`p-3 rounded-t-2xl flex-row items-center`}
            style={{
              backgroundColor: Colors.dark.background,
              borderBottomColor: Colors.dark.primary,
              borderBottomWidth: 1,
            }}
          >
            {<Ionicons name="location-sharp" size={18} color="#2563EB" />}
            <ThemedText
              numberOfLines={1}
              className={`text-base flex-1 text-textSecondary ml-2`}
            >
              {"Ubicación actual"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleInputPress('end')}
            className={`p-3 rounded-b-2xl flex-row items-center`}
            style={{
              backgroundColor: Colors.dark.background,
              // borderBottomColor: Colors.dark.background,
              // borderBottomWidth: 1,
            }}
          >
            {<Ionicons name="location-sharp" size={18} color="#EF4444" />}
            <ThemedText
              numberOfLines={1}
              className={`text-base flex-1 text-textSecondary ml-2`}
            >
              {"¿A dónde vas?"}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <View className="flex-1 mx-4">
        <ScrollView className="flex-col gap-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="flex-row mb-2 justify-between items-center">
            <ThemedText className="text-xl font-semibold">
              Próximos viajes
            </ThemedText>
            <Pressable onPress={() => router.push('/(tabs)/profile/activity')}>
              <ThemedText className="text-base font-semibold"
                lightColor={Colors.light.secondary}
                darkColor={Colors.dark.secondary}
              >
                Ver todos
              </ThemedText>
            </Pressable>
          </View>
          {activeSession ? (
            <View>
              <RouteCard
                key={`active-${activeSession.id}`}
                sessionId={activeSession.id}
                routeId={activeSession.route_id}
                title={`${activeSession.start_location} - ${activeSession.end_location}`}
                isActive={activeSession.status}
                routeScreen={activeSession.status == 'active' ? `/(tabs)/home/route-detail?id=${activeSession.id}` : `/(tabs)/available-routes/route-detail?id=${activeSession.route_id}&sessionId=${activeSession.id}`}
                startLocation={activeSession.start_location.split(",")[0].trim()}
                endLocation={activeSession.end_location.split(",")[0].trim()}
                passengerCount={passengerDetails.length}
                driver={driverDetails}
                passengersData={passengerDetails}
                imageUrl={(activeSession as any).routes?.image_url}
              />
            </View>
          ) :
            (
              history.length > 0 ? (
                <View>
                  <RouteCard
                    sessionId={history[0].id}
                    routeId={(history[0] as any).route_id}
                    title={`${history[0].start_location} - ${history[0].end_location}`}
                    isActive={"completed"}
                    routeScreen={`/(tabs)/available-routes/route-detail?id=${history[0].route_id}&sessionId=${history[0].trip_session_id}`}
                    startLocation={history[0].start_location.split(",")[0].trim()}
                    endLocation={history[0].end_location.split(",")[0].trim()}
                    passengerCount={(history[0] as any).passengers_data?.length || 0}
                    driver={(history[0] as any).driver_details}
                    passengersData={(history[0] as any).passengers_data}
                    imageUrl={(history[0] as any).image_url}
                  />
                </View>
              )
                : (
                  <ThemedText className="text-center mt-10 text-textSecondary">
                    No tienes rutas en tu historial.
                  </ThemedText>
                )
            )
          }

          {/* Botones de Acción Rápidos (Crear/Buscar) */}
          <View className="flex-row gap-2 justify-between items-center">
            <Pressable className="flex-1 pr-1"
              onPress={() => handleInputPress('start')}
            >
              <ThemedView
                className="flex-row items-center rounded-2xl gap-x-2 py-4"
                style={{
                  backgroundColor: Colors.dark.primary,
                  borderColor: Colors.dark.borderSecondary,
                  borderWidth: 1
                }}
              >
                <View>
                  <Ionicons name="car-sport" size={30} color="#2563EB" />
                </View>
                <View className="flex-col">
                  <ThemedText className="text-base font-semibold">
                    Crear viaje
                  </ThemedText>
                  <ThemedText className="text-sm text-textsecondary">
                    Como conductor
                  </ThemedText>
                </View>
              </ThemedView>
            </Pressable>
            <Pressable
              className="flex-1 pl-1"
              onPress={() => router.push('/(tabs)/available-routes')}
            >
              <ThemedView className="flex-row items-center gap-x-2 rounded-2xl py-4"
                style={{
                  backgroundColor: Colors.dark.primary,
                  borderColor: Colors.dark.borderSecondary,
                  borderWidth: 1
                }}
              >
                <View>
                  <Ionicons name="people" size={30} color="#2563EB" />
                </View>
                <View className="flex-col">
                  <ThemedText className="text-base font-semibold">
                    Buscar viaje
                  </ThemedText>
                  <ThemedText className="text-sm text-textsecondary">
                    Como pasajero
                  </ThemedText>
                </View>
              </ThemedView>
            </Pressable>
          </View>

          {/* Sección de seguridad */}
          <View className="flex-row gap-x-2 items-center py-4 mb-4 rounded-2xl"
            style={{
              backgroundColor: Colors.dark.warning,
              borderColor: Colors.dark.borderWarning,
              borderWidth: 1
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={50} color="#2563EB" />
            <View className="flex-1">
              <ThemedText className="text-base font-bold">
                Tu seguridad es prioridad
              </ThemedText>
              <ThemedText className="text-xs text-textSecondary leading-4">
                Comparte tu viaje en tiempo real con tus contactos de confianza.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </View>
      {/* <View className="h-48 bg-fuchsia-500"/> */}
    </View>
  );
}
