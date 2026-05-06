import { useAuth } from "@/app/context/AuthContext";
import { TripSessionStops } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, {
  Camera,
  LineLayer,
  MapView,
  MarkerView,
  PointAnnotation,
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

// Token recuperado de variables de entorno
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
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
  const [sessionData, setSessionData] = useState<any>(null);
  const [stopsData, setStopsData] = useState<any[]>([]);

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

  // Centrar la cámara solo la primera vez que tenemos la ubicación
  useEffect(() => {
    if (initialLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: initialLocation,
        zoomLevel: 15,
        animationDuration: 1000,
      });
    }
  }, [initialLocation]);

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
        .select("start_coords, end_coords")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error("❌ Error session:", sessionError);
        return;
      }

      setSessionData(sessionData);

      // Obtener paradas (stops) con join a la tabla stops para obtener las coordenadas
      const { data: stopsData, error: stopsError } = await supabase
        .from("trip_session_stops")
        .select(`
          *,
          stops (
            coords
          )
        `)
        .eq("trip_session_id", sessionId)
        .order("visit_time", { ascending: true });

      if (stopsError) {
        console.error("Error fetching stops data:", stopsError);
        return;
      }

      setStopsData(stopsData || []);

      const origin = `${sessionData.start_coords.coordinates[0]},${sessionData.start_coords.coordinates[1]}`;
      const destination = `${sessionData.end_coords.coordinates[0]},${sessionData.end_coords.coordinates[1]}`;

      const waypoints = stopsData
        ?.map((s: any) => {
          const coords = s.stops?.coords?.coordinates;
          return coords ? `${coords[0]},${coords[1]}` : null;
        })
        .filter(Boolean)
        .join(";");

      console.log("📍 Ubicación inicial obtenida:", sessionData.start_coords.coordinates);
      console.log("📍 Ubicación final obtenida:", sessionData.end_coords.coordinates);
      console.log("📍 Paradas con coordenadas:", stopsData?.map(s => (s as any).stops?.coords));

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
          coords: {
            type: "Point",
            coordinates: [selectedCoords[0], selectedCoords[1]],
          },
          location: start_name || "Punto Seleccionado",
        },
      ]);

      if (meetingError) {
        console.error("❌ Error al guardar el punto de encuentro:", meetingError);
        throw new Error("No se pudo guardar tu punto de encuentro. Por favor, inténtalo de nuevo.");
      }

      Alert.alert("Solicitud Enviada", "Tu solicitud ha sido enviada con éxito. Espera a que el conductor la apruebe.");
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
        onRegionDidChange={(e) => {
          if (e.geometry && e.geometry.coordinates) {
            setSelectedCoords(e.geometry.coordinates);
          }
        }}
        logoEnabled={false}
        compassEnabled={false}
      >
        <Camera
          ref={cameraRef}
        />

        <UserLocation visible={true} />

        {/* Línea de Ruta */}
        {routeGeoJSON && (
          <ShapeSource id="routeGuide" shape={routeGeoJSON}>
            <LineLayer
              id="guideLine"
              style={{
                lineColor: "#FCA311",
                lineWidth: 5,
                lineOpacity: 0.7,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </ShapeSource>
        )}

        {/* Marcadores de Ubicaciones con PointAnnotation para estabilidad total */}
        {sessionData && (
          <>
            {/* Inicio (Origen) */}
            <PointAnnotation
              id="originPoint"
              coordinate={[sessionData.start_coords.coordinates[0], sessionData.start_coords.coordinates[1]]}
            >
              <View style={{ width: 30, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ 
                  backgroundColor: '#4CAF50', 
                  padding: 5, 
                  borderRadius: 20, 
                  borderWidth: 2,
                  borderColor: 'white'
                }}>
                  <Ionicons name="car" size={16} color="white" />
                </View>
              </View>
            </PointAnnotation>

            {/* Paradas intermedias representadas como Pickups (Recogida) */}
            {stopsData?.map((stop: any, index: number) => {
              const coords = stop.stops?.coords?.coordinates;
              if (!coords) return null;
              return (
                <PointAnnotation
                  key={`stop-${index}`}
                  id={`stop-${index}`}
                  coordinate={[coords[0], coords[1]]}
                >
                  <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ 
                      backgroundColor: '#000D3A', 
                      width: 22, height: 22,
                      borderRadius: 11, 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderWidth: 2, 
                      borderColor: 'white'
                    }}>
                      <Ionicons name="person" size={12} color="white" />
                    </View>
                  </View>
                </PointAnnotation>
              );
            })}

            {/* Fin (Destino) */}
            <PointAnnotation
              id="destinationPoint"
              coordinate={[sessionData.end_coords.coordinates[0], sessionData.end_coords.coordinates[1]]}
            >
              <View style={{ width: 30, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ 
                  backgroundColor: '#F44336', 
                  padding: 5, 
                  borderRadius: 20, 
                  borderWidth: 2,
                  borderColor: 'white'
                }}>
                  <Ionicons name="flag" size={16} color="white" />
                </View>
              </View>
            </PointAnnotation>
          </>
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
          <Ionicons name="location" size={40} color={isValidSelection ? "#000D3A" : "#ef4444"} />
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
            <Text className={`font-bold text-lg ${isValidSelection ? "text-white" : "text-white"}`}>
              {isValidSelection ? "Confirmar Ubicación" : "Ubicación Inválida"}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.back()}
        className="absolute top-14 left-6 w-10 h-10 rounded-full items-center justify-center shadow-md z-50 bg-[#FCA311]"
      >
        <Ionicons name="close" size={24} color="white" />
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
