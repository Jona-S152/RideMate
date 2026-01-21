import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, {
  Camera,
  LineLayer,
  MapView,
  ShapeSource,
  UserLocation,
} from "@rnmapbox/maps";
import * as turf from "@turf/turf";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Token recuperado de route-detail.tsx
const MAPBOX_TOKEN = "pk.eyJ1Ijoiam9uYS1zMTUyIiwiYSI6ImNtaWc0NWw1MDAzMWgzY3E4MzJ6dTVyZngifQ.4LJzkPbbZQufPVGpwk41qA";
Mapbox.setAccessToken(MAPBOX_TOKEN);

export default function SelectionMapScreen() {
  const { trip_session_id, start_name, end_name } = useLocalSearchParams();
  const router = useRouter();

  const { user } = useAuth();

  // Estado para coordenadas seleccionadas (centro del mapa)
  const [selectedCoords, setSelectedCoords] = useState<number[] | null>(null);

  // Estado para la ubicación inicial del usuario (para centrar la cámara al inicio)
  const [initialLocation, setInitialLocation] = useState<number[] | null>(null);

  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isValidSelection, setIsValidSelection] = useState(true);
  const [distanceToRoute, setDistanceToRoute] = useState(0);

  const cameraRef = useRef<Mapbox.Camera>(null);

  // 1. Obtener Permisos y Ubicación Inicial (Solo una vez)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Necesitamos tu ubicación para mostrar el mapa.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        console.log("📍 Ubicación inicial obtenida:", location.coords);

        const coords = [location.coords.longitude, location.coords.latitude];
        setInitialLocation(coords);
        setSelectedCoords(coords);

      } catch (error) {
        console.error("Error obteniendo ubicación:", error);
      }
    })();
  }, []);

  // 2. Obtener Ruta Real desde Supabase
  useEffect(() => {
    const fetchRoute = async () => {
      const sessionId = Number(trip_session_id);

      if (!sessionId || isNaN(sessionId)) {
        console.error("❌ trip_session_id inválido:", trip_session_id);
        return;
      }

      console.log("🚀 Buscando ruta para session ID:", sessionId);

      // Obtener inicio/fin del viaje
      const { data: sessionData, error: sessionError } = await supabase
        .from("trip_sessions")
        .select("start_longitude, start_latitude, end_longitude, end_latitude")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error("❌ Error session:", sessionError);
        return;
      }

      // Obtener paradas (stops)
      const { data: stopsData } = await supabase
        .from("trip_session_stops")
        .select("stops(longitude, latitude)")
        .eq("trip_session_id", sessionId)
        .order("visit_time", { ascending: true });

      const origin = `${sessionData.start_longitude},${sessionData.start_latitude}`;
      const destination = `${sessionData.end_longitude},${sessionData.end_latitude}`;

      const waypoints = stopsData
        ?.map((s: any) => `${s.stops?.longitude},${s.stops?.latitude}`)
        .filter(Boolean)
        .join(";");

      const coordsString = waypoints
        ? `${origin};${waypoints};${destination}`
        : `${origin};${destination}`;

      console.log("🗺️ Pidiendo ruta Mapbox:", coordsString);

      // Usar el token localmente para la petición fetch
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          console.log("✅ Ruta Mapbox recibida. Puntos:", data.routes[0].geometry.coordinates.length);
          setRouteGeoJSON({
            type: "Feature",
            geometry: data.routes[0].geometry,
            properties: {},
          });
        } else {
          console.warn("⚠️ Mapbox no devolvió rutas:", data.code);
        }
      } catch (e) {
        console.error("❌ Error Mapbox API Fetch:", e);
      }
    };

    if (trip_session_id) fetchRoute();
  }, [trip_session_id]);


  // 3. Validar Proximidad (Turf.js)
  useEffect(() => {
    if (!selectedCoords || !routeGeoJSON) return;

    try {
      const point = turf.point(selectedCoords);
      let line;

      if (routeGeoJSON.geometry.type === 'LineString') {
        line = turf.lineString(routeGeoJSON.geometry.coordinates);
      } else if (routeGeoJSON.geometry.type === 'MultiLineString') {
        line = turf.multiLineString(routeGeoJSON.geometry.coordinates);
      } else {
        line = routeGeoJSON.geometry;
      }

      // Calcular distancia (Turf default = KM)
      const distKm = turf.pointToLineDistance(point, line as any);
      const distM = distKm * 1000; // Convertir a metros

      console.log(`📏 Distancia al usuario: ${distM.toFixed(2)} metros`);
      setDistanceToRoute(distM);

      if (distM > 150) {
        setIsValidSelection(false);
      } else {
        setIsValidSelection(true);
      }

    } catch (e) {
      console.error("❌ Error Turf:", e);
      setIsValidSelection(true);
    }
  }, [selectedCoords, routeGeoJSON]);

  // Confirmar Selección
  const confirmPoint = async () => {
    if (!selectedCoords || !isValidSelection) return;
    setLoading(true);

    try {
      const sessionId = Number(trip_session_id);

      const { error: sessionError } = await supabase
        .from("passenger_trip_sessions")
        .insert([
          {
            trip_session_id: sessionId,
            status: "pending_approval",
            passenger_id: user?.id,
          },
        ]);

      if (sessionError) throw sessionError;

      const { error: meetingError } = await supabase.from("passenger_meeting_points").insert([
        {
          trip_session_id: sessionId,
          passenger_id: user?.id,
          latitude: selectedCoords[1],
          longitude: selectedCoords[0],
          location: start_name || "Punto Seleccionado",
        },
      ]);

      if (meetingError) console.error("❌ Error al guardar el punto de encuentro:", meetingError);

      Alert.alert("Solicitud Enviada", "Espera a que el conductor la apruebe.");
      router.replace("/(tabs)/home");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Información Superior */}
      <View className="absolute top-28 left-0 right-0 z-40 px-5">
        <View className={`p-4 rounded-2xl shadow-xl border ${isValidSelection ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200'}`}>
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            {isValidSelection ? "Punto de Encuentro" : "Demasiado Lejos"}
          </Text>
          <Text className={`text-sm mt-1 font-semibold ${isValidSelection ? 'text-slate-800' : 'text-red-600'}`}>
            {isValidSelection
              ? "Arrastra el mapa para ajustar"
              : `Acércate ${Math.round(distanceToRoute - 150)}m más a la ruta`}
          </Text>
        </View>
      </View>

      <MapView
        style={{ flex: 1 }}
        onRegionDidChange={(e) => setSelectedCoords(e.geometry.coordinates)}
        logoEnabled={false}
        compassEnabled={false}
      >
        {initialLocation && (
          <Camera
            ref={cameraRef}
            zoomLevel={15}
            centerCoordinate={initialLocation}
            animationMode="flyTo"
            animationDuration={1000}
          />
        )}

        <UserLocation visible={true} />

        {/* Línea de Ruta */}
        {routeGeoJSON && (
          <ShapeSource id="routeGuide" shape={routeGeoJSON}>
            <LineLayer
              id="guideLine"
              style={{
                lineColor: Colors.light.secondary,
                lineWidth: 5,
                lineOpacity: 0.7,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </ShapeSource>
        )}
      </MapView>

      {/* MARCADOR CENTRAL FIJO */}
      <View pointerEvents="none" style={styles.markerFixed}>
        <View style={styles.markerContainer}>
          <View className={`px-3 py-1 rounded-full mb-2 shadow-sm ${isValidSelection ? 'bg-slate-800' : 'bg-red-600'}`}>
            <Text className="text-white text-[10px] font-bold">
              {isValidSelection ? "RECOGER AQUÍ" : `MUY LEJOS (${Math.round(distanceToRoute)}m)`}
            </Text>
          </View>
          <Ionicons name="location" size={45} color={isValidSelection ? "#2563eb" : "#ef4444"} />
          <View style={styles.shadow} />
        </View>
      </View>

      {/* BOTONES */}
      <View className="absolute bottom-32 left-0 right-0 px-6">
        <Pressable
          onPress={confirmPoint}
          disabled={loading || !isValidSelection}
          className={`h-16 rounded-full flex-row items-center justify-center shadow-2xl ${loading || !isValidSelection ? "bg-gray-400" : "bg-[#FCA311]"
            }`}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-lg ${isValidSelection ? "text-black" : "text-white"}`}>
              {isValidSelection ? "Confirmar Ubicación" : "Ubicación Inválida"}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.back()}
        className="absolute top-14 left-6 w-10 h-10 rounded-full items-center justify-center shadow-md z-50 bg-[#FCA311]"
      >
        <Ionicons name="close" size={24} color="black" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  markerFixed: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -50,
    marginTop: -85,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  markerContainer: {
    alignItems: "center",
  },
  shadow: {
    width: 8,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 4,
    marginTop: -2,
  },
});
