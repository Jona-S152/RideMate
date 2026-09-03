import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import FilterCard from "@/components/common/FilterCard";
import MasonryGrid from "@/components/common/MasonryGrid";
import AvailableRouteCard from "@/components/features/available-route-card";
import { Colors } from "@/constants/Colors";
import { useAvailableRoutesSubscription } from "@/hooks/useRealTime";
import { useAppInsets } from "@/hooks/useAppInsets";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { useThemeColor } from "@/hooks/useThemeColor";
import { SessionData } from "@/interfaces/available-routes";
import { tripService } from "@/services/trip.service";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function PassengerRoutesScreen() {
  const { user } = useAuth();
  const insets = useAppInsets();
  const tabOverflow = useBottomTabOverflow();
  const [text, setText] = useState<string>("");
  const [visibleFilters, setVisibleFilters] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("puntoPartida");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [routes, setRoutes] = useState<SessionData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const requestIdRef = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const secondaryColor = useThemeColor({}, "secondary");
  const tirdColor = useThemeColor({}, "tird");
  const isFocused = useIsFocused();

  const fetchRoutes = useCallback(async () => {
    if (!user?.id) return;
    const requestId = ++requestIdRef.current;
    try {
      const availableRoutes = await tripService.getPassengerRoutes(user.id);
      if (requestId !== requestIdRef.current) return;
      console.log("Fetch Passenger routes:", JSON.stringify(availableRoutes, null, 2));
      setRoutes(availableRoutes);
    } catch (error) {
      if (requestId === requestIdRef.current) {
        console.error("Error fetching passenger routes:", error);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setInitialLoading(false);
      }
    }
  }, [user?.id]);

  const handleRoutesUpdate = useCallback(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useAvailableRoutesSubscription(handleRoutesUpdate);

  useEffect(() => {
    if (isFocused && user?.driver_mode) {
      router.replace("/(tabs)/available-routes/driver");
      return;
    }
    if (isFocused) fetchRoutes();
  }, [user?.driver_mode, isFocused, fetchRoutes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoutes();
    setRefreshing(false);
  };

  const handleRoutePress = async (route: SessionData) => {
    if (!user) return;

    try {
      // 0. Verificar si el usuario ya abandonó este viaje anteriormente
      const hasLeft = await tripService.hasLeftTripSession(user.id, route.id);
      if (hasLeft) {
        Toast.show({
          type: "warning",
          text1: "No puedes unirte",
          text2: "Has abandonado este viaje anteriormente y no puedes volver a solicitar unirte.",
        });
        return;
      }

      // 1. Verificar si el usuario ya tiene un viaje activo o solicitud activa en el sistema
      const activeState = await tripService.hasAnyActiveTripOrRequest(user.id);
      if (activeState.hasActive) {
        if (activeState.reason === 'driver') {
          Toast.show({
            type: "warning",
            text1: "No puedes unirte",
            text2: "Tienes un viaje activo como conductor. Finalízalo antes de unirte a otra ruta.",
          });
          return;
        } else if (activeState.reason === 'pending_request') {
          Toast.show({
            type: "info",
            text1: "Solicitud en curso",
            text2: "Ya tienes una solicitud pendiente de aprobación por el conductor.",
          });
          return;
        } else if (activeState.reason === 'passenger_active') {
          Toast.show({
            type: "warning",
            text1: "Viaje en curso",
            text2: "Ya estás participando en un viaje activo.",
          });
          return;
        }
      }

      // 3. Verificar si el usuario ya tiene el viaje completado pero la sesión sigue activa
      const hasCompletedSession = await tripService.hasCompletedTripSession(user.id, route.id);
      if (hasCompletedSession) {
        Toast.show({
          type: "warning",
          text1: "Viaje completado",
          text2: "Ya tienes el viaje completado.",
        });
        return;
      }

      // Si no hay solicitudes existentes o fue rechazada, permitir navegación
      router.push({
        pathname: "/(tabs)/available-routes/route-preview",
        params: { id: route.id, type: "session" },
      });
    } catch (error) {
      console.error("Error in handleRoutePress:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No se pudo procesar la solicitud",
      });
    }
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

  const activeFilter = visibleFilters ? selectedFilter : "nombreRuta";

  const filteredRoutes = routes.filter((route) => {
    if (!text) return true;
    const searchLower = text.toLowerCase();

    switch (activeFilter) {
      case "puntoPartida":
        return route.start_location.toLowerCase().includes(searchLower);
      case "puntoFinal":
        return route.end_location.toLowerCase().includes(searchLower);
      default:
        return (
          route.start_location.toLowerCase().includes(searchLower) ||
          route.end_location.toLowerCase().includes(searchLower)
        );
    }
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <ThemedView
        lightColor={Colors.light.glass}
        darkColor={Colors.dark.glass}
        className="w-full px-4 py-6 rounded-bl-[40px]"
        style={{ paddingTop: insets.top + 16 }}
      >
        <ThemedText className="font-semibold text-4xl py-3">
          Hola, {user?.name}
        </ThemedText>
        <View className="flex-row items-center mb-4">
          <ThemedTextInput
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
            placeholder="Buscar ruta..."
            onChangeText={setText}
            value={text}
            className="flex-1 mr-2"
          />
          <Pressable
            onPress={() => setVisibleFilters(!visibleFilters)}
            className="bg-white/20 p-3 rounded-2xl"
          >
            <Ionicons name="options-outline" size={24} color="white" />
          </Pressable>
        </View>

        {visibleFilters && (
          <Animated.View
            style={{
              opacity,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mb-2"
            >
              {[
                { title: "Partida", value: "puntoPartida" },
                { title: "Destino", value: "puntoFinal" },
                { title: "Ruta", value: "nombreRuta" },
              ].map((filter) => (
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

      <View className="flex-1 mx-4 mt-4">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabOverflow }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[secondaryColor]}
            />
          }
        >
          {initialLoading ? (
            <View className="flex-1 items-center justify-center mt-20">
              <ThemedText className="text-sm text-textSecondary">
                Cargando rutas...
              </ThemedText>
            </View>
          ) : filteredRoutes.length === 0 ? (
            <View className="flex-1 items-center justify-center mt-20">
              <Ionicons name="car-outline" size={80} color={tirdColor} />
              <ThemedText className="text-xl font-semibold mt-4 text-slate-500">
                No hay rutas disponibles
              </ThemedText>
              <ThemedText className="text-slate-400 text-center px-10 mt-2">
                {text
                  ? "Prueba con otros términos"
                  : "Vuelve a intentarlo más tarde"}
              </ThemedText>
            </View>
          ) : (
            <MasonryGrid
              data={filteredRoutes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={(item: SessionData) => (
                <AvailableRouteCard
                  key={item.id}
                  trip_session_id={item.id}
                  routeScreen={`/(tabs)/available-routes/route-detail?id=${item.id}`}
                  start={item.start_location}
                  end={item.end_location}
                  routeId={item.route_id}
                  startCoords={item.start_coords}
                  endCoords={item.end_coords}
                  driverName={(item as any).driver_name}
                  driverAvatar={(item as any).driver_avatar}
                  driverRating={(item as any).driver_rating}
                  passengersData={(item as any).passengers_data}
                  status={item.status}
                  user_pending_request={(item as any).user_pending_request}
                  pendingRequestsCount={(item as any).pending_requests_count || 0}
                  isDriver={false}
                  seatsCapacity={(item as any).vehicle?.seats_capacity}
                  imageUrl={
                    (item as any).image_url ||
                    (Array.isArray((item as any).routes)
                      ? ((item as any).routes[0] as any)?.image_url
                      : ((item as any).routes as any)?.image_url)
                  }
                  onPress={() => handleRoutePress(item)}
                />
              )}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
