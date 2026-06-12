import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import FilterCard from "@/components/common/FilterCard";
import MasonryGrid from "@/components/common/MasonryGrid";
import AvailableRouteCard from "@/components/features/available-route-card";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { SessionData, SessionStop } from "@/interfaces/available-routes";
import { tripService } from "@/services/trip.service";
import { supabase } from "@/lib/supabase";
import { useAvailableRoutesSubscription } from "@/hooks/useRealTime";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Pressable,
    RefreshControl,
    ScrollView,
    View,
} from "react-native";

export default function PassengerRoutesScreen() {
  const { user } = useAuth();
  const [text, setText] = useState<string>("");
  const [visibleFilters, setVisibleFilters] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("puntoPartida");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [routes, setRoutes] = useState<SessionData[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const secondaryColor = useThemeColor({}, "secondary");
  const tirdColor = useThemeColor({}, "tird");
  const isFocused = useIsFocused();

  useAvailableRoutesSubscription(() => {
    fetchRoutes();
  });

  useEffect(() => {
    if (isFocused && user?.driver_mode) {
      router.replace("/(tabs)/available-routes/driver");
      return;
    }
    fetchRoutes();
  }, [user?.driver_mode, isFocused]);

  const fetchRoutes = async () => {
    if (!user?.id) return;
    try {
      const availableRoutes = await tripService.getPassengerRoutes(user.id);
      setRoutes(availableRoutes);
    } catch (error) {
      console.error("Error fetching passenger routes:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoutes();
    setRefreshing(false);
  };

  const handleRoutePress = async (route: SessionData) => {
    if (!user) return;

    try {
      // 1. Verificar si el usuario ya está unido a este viaje en passenger_trip_sessions
      const existingJoinStatus = await tripService.checkPassengerSessionStatus(user.id, route.id);
      if (existingJoinStatus === 'joined') {
        Alert.alert('Ya estás en este viaje', 'Ya estás participando en este viaje.');
        return;
      }

      // 2. Verificar si el usuario ya tiene una solicitud pendiente en passenger_requests
      const pendingRequest = await tripService.checkPassengerRequestStatus(user.id, route.id);
      if (pendingRequest?.status === 'pending') {
        Alert.alert('Solicitud pendiente', 'Ya has enviado una solicitud para este viaje. Espera a que el conductor la apruebe.');
        return;
      }

      // 3. Verificar si el usuario ya tiene algún viaje activo (cualquiera con status joined)
      const hasActiveSession = await tripService.hasActiveTripSession(user.id);
      if (hasActiveSession) {
        Alert.alert("Error", "Ya tienes un viaje en curso");
        return;
      }

      // Si no hay solicitudes existentes o fue rechazada, permitir navegación
      router.push({
        pathname: "/(tabs)/available-routes/route-preview",
        params: { id: route.id, type: "session" },
      });
    } catch (error) {
      console.error("Error in handleRoutePress:", error);
      Alert.alert("Error", "No se pudo procesar la solicitud");
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

      <View className="flex-1 mx-4 mt-4 mb-24">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[secondaryColor]}
            />
          }
        >
          {filteredRoutes.length === 0 ? (
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
                  stops={item.trip_session_stops.map((stop: SessionStop) => ({
                    stop_id: stop.stop_id,
                    status: stop.status || "pending",
                  }))}
                  driverName={(item as any).driver_name}
                  driverAvatar={(item as any).driver_avatar}
                  driverRating={(item as any).driver_rating}
                  passengersData={(item as any).passengers_data}
                  status={item.status}
                  isDriver={false}
                  imageUrl={
                    Array.isArray((item as any).routes)
                      ? ((item as any).routes[0] as any)?.image_url
                      : ((item as any).routes as any)?.image_url
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
