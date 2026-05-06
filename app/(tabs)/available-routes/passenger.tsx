import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useIsFocused } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import FilterCard from "@/components/common/FilterCard";
import AvailableRouteCard from "@/components/features/available-route-card";
import MasonryGrid from "@/components/common/MasonryGrid";
import { SessionData, SessionStop } from "@/interfaces/available-routes";

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

  useEffect(() => {
    if (isFocused && user?.driver_mode) {
      router.replace("/(tabs)/available-routes/driver");
      return;
    }
    fetchRoutes();

    const subscription = supabase
      .channel("public:trip_sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_sessions",
          filter: "status=eq.pending",
        },
        () => {
          fetchRoutes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.driver_mode, isFocused]);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("trip_sessions")
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
        .eq("status", "pending");

      if (error) throw error;

      const formattedRoutes = data.map((session) => ({
        ...session,
        driver_name: session.driver?.name,
        driver_avatar: session.driver?.avatar_profile,
        driver_rating: session.driver?.rating,
        passengers_data:
          session.passengers?.map((p: any) => ({
            id: p.passenger?.id,
            avatar: p.passenger?.avatar_profile,
          })) || [],
      }));

      setRoutes(formattedRoutes);
    } catch (error) {
      console.error("Error fetching passenger routes:", error);
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
    <View style={{ flex: 1 }}>
      <ThemedView
        lightColor={Colors.light.primary}
        darkColor={Colors.dark.primary}
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
                  isDriver={false}
                  imageUrl={
                    Array.isArray((item as any).routes)
                      ? ((item as any).routes[0] as any)?.image_url
                      : ((item as any).routes as any)?.image_url
                  }
                  onPress={() => {
                    router.push({
                      pathname: "/(tabs)/available-routes/route-preview",
                      params: { id: item.id, type: "session" },
                    });
                  }}
                />
              )}
            />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
