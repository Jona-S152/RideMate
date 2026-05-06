import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import FilterCard from "@/components/common/FilterCard";
import MasonryGrid from "@/components/common/MasonryGrid";
import AvailableRouteCard from "@/components/features/available-route-card";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { RouteData, RouteStop, UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

export default function DriverRoutesScreen() {
  const { user } = useAuth();
  const [text, setText] = useState<string>("");
  const [visibleFilters, setVisibleFilters] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("puntoPartida");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [myRoutes, setMyRoutes] = useState<RouteData[]>([]);
  const [adminRoutes, setAdminRoutes] = useState<RouteData[]>([]);
  const [userProfile, setUserProfile] = useState<UserData | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const secondaryColor = useThemeColor({}, "secondary");
  const tirdColor = useThemeColor({}, "tird");
  const separatorColor = useThemeColor({ light: "rgba(0,0,0,0.1)", dark: "rgba(255,255,255,0.2)" }, "text");
  const separatorTextColor = useThemeColor({ light: "rgba(0,0,0,0.4)", dark: "rgba(255,255,255,0.6)" }, "text");
  const mainTitleColor = useThemeColor({ light: "#000D3A", dark: "#FFFFFF" }, "text");
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && user && !user.driver_mode) {
      router.replace("/(tabs)/available-routes/passenger");
      return;
    }
    fetchInitialData();
  }, [user?.driver_mode, isFocused]);

  const fetchInitialData = async () => {
    setRefreshing(true);
    await Promise.all([fetchUserProfile(), fetchRoutes()]);
    setRefreshing(false);
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setUserProfile(data as UserData);
  };

  const fetchRoutes = async () => {
    try {
      // Consulta sin alias complejos para evitar errores de relación
      const { data, error } = await supabase
        .from("routes")
        .select(`
          *,
          users!created_by(role_id),
          stops(*)
        `);

      if (error) throw error;

      const allRoutes = data || [];
      
      // Separar rutas
      const userSpecific = allRoutes.filter(r => r.created_by === user?.id);
      const adminSpecific = allRoutes.filter(r => {
        // Accedemos a la relación 'users' que devuelve Supabase por defecto
        const creatorRole = Array.isArray(r.users) ? r.users[0]?.role_id : r.users?.role_id;
        return creatorRole === 1 && r.created_by !== user?.id;
      });

      setMyRoutes(userSpecific);
      setAdminRoutes(adminSpecific);
    } catch (error) {
      console.error("Error fetching driver routes:", error);
    }
  };

  const onRefresh = async () => {
    await fetchInitialData();
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

  const filterRoutes = (routesList: RouteData[]) => {
    return routesList.filter((route) => {
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
  };

  const SectionHeader = ({ title, centered = false }: { title: string; icon?: string; centered?: boolean }) => (
    <View className={`flex-row items-center mt-10 mb-8 px-2 ${centered ? 'justify-center' : ''}`}>
      {centered ? (
        <>
          <View style={{ backgroundColor: separatorColor }} className="flex-1 h-[1px]" />
          <View className="mx-6">
            <ThemedText
              style={{ color: separatorTextColor }}
              className="text-[11px] font-black uppercase tracking-[4px]"
            >
              {title}
            </ThemedText>
          </View>
          <View style={{ backgroundColor: separatorColor }} className="flex-1 h-[1px]" />
        </>
      ) : (
        <>
          <ThemedText
            style={{ color: mainTitleColor }}
            className="text-lg font-bold uppercase tracking-widest"
          >
            {title}
          </ThemedText>
          <View style={{ backgroundColor: separatorColor }} className="flex-1 h-[1px] ml-4" />
        </>
      )}
    </View>
  );

  const filteredMyRoutes = filterRoutes(myRoutes);
  const filteredAdminRoutes = filterRoutes(adminRoutes);

  return (
    <View style={{ flex: 1 }}>
      <ThemedView
        lightColor={Colors.light.primary}
        darkColor={Colors.dark.primary}
        className="w-full px-4 py-6 rounded-bl-[40px]"
      >
        <ThemedText className="font-semibold text-4xl py-3">
          Panel de Rutas
        </ThemedText>
        <View className="flex-row items-center mb-4">
          <ThemedTextInput
            lightColor={Colors.light.background}
            darkColor={Colors.dark.background}
            placeholder="Buscar en mis rutas..."
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
                { title: "Nombre", value: "nombreRuta" },
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

      <View className="flex-1 mx-4 mb-24">
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
          {/* INPUT DE CREACIÓN DE RUTA */}
          <Pressable
            onPress={() => router.push("/(tabs)/available-routes/create-route-screen")}
            className="bg-white mx-2 mt-4 mb-4 p-3 rounded-3xl shadow-sm flex-row items-center justify-between border border-black/5"
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <ThemedText
              lightColor="#000D3A"
              darkColor="#FFFFFF"
              className="text-lg font-medium opacity-60"
            >
              ¿A dónde quieres ir hoy?
            </ThemedText>
            <Ionicons name="search" size={22} color="#000D3A" className="opacity-30" />
          </Pressable>

          {/* SECCIÓN DE MIS RUTAS */}
          {filteredMyRoutes.length > 0 && (
            <MasonryGrid
              data={filteredMyRoutes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={(item: RouteData) => (
                <AvailableRouteCard
                  key={item.id}
                  trip_session_id={item.id}
                  routeScreen={`/(tabs)/available-routes/route-detail?id=${item.id}`}
                  start={item.start_location}
                  end={item.end_location}
                  routeId={item.id}
                  startCoords={item.start_coords}
                  endCoords={item.end_coords}
                  stops={item.stops.map((stop: RouteStop) => ({
                    stop_id: stop.id,
                    status: "pending",
                  }))}
                  isDriver={true}
                  imageUrl={(item as any).image_url}
                  driverName={userProfile?.name || user?.name}
                  driverAvatar={userProfile?.avatar_profile}
                  onPress={() => {
                    router.push({
                      pathname: "/(tabs)/available-routes/route-preview",
                      params: { id: item.id, type: "route" },
                    });
                  }}
                />
              )}
            />
          )}

          {/* SECCIÓN DE RUTAS INSTITUCIONALES */}
          <SectionHeader title="Rutas Institucionales" centered={true} />
          {filteredAdminRoutes.length === 0 ? (
            <View className="items-center justify-center py-10 bg-white/5 rounded-3xl border border-dashed border-white/20">
              <Ionicons name="information-circle-outline" size={40} color={tirdColor} />
              <ThemedText className="text-sm font-semibold mt-2 text-slate-400">
                No hay rutas institucionales disponibles
              </ThemedText>
            </View>
          ) : (
            <MasonryGrid
              data={filteredAdminRoutes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={(item: any) => (
                <AvailableRouteCard
                  key={item.id}
                  trip_session_id={item.id}
                  routeScreen={`/(tabs)/available-routes/route-detail?id=${item.id}`}
                  start={item.start_location}
                  end={item.end_location}
                  routeId={item.id}
                  startCoords={item.start_coords}
                  endCoords={item.end_coords}
                  stops={item.stops.map((stop: RouteStop) => ({
                    stop_id: stop.id,
                    status: "pending",
                  }))}
                  isDriver={true}
                  imageUrl={item.image_url}
                  driverName={undefined} // Anónimo
                  driverAvatar={undefined} // Anónimo
                  onPress={() => {
                    router.push({
                      pathname: "/(tabs)/available-routes/route-preview",
                      params: { id: item.id, type: "route" },
                    });
                  }}
                />
              )}
            />
          )}

          <View className="h-10" />
        </ScrollView>
      </View>
    </View>
  );
}
