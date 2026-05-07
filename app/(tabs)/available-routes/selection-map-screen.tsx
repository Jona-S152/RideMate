import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, {
    Camera,
    LineLayer,
    MapView,
    MarkerView,
    ShapeSource,
    UserLocation
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
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const cameraRef = useRef<Mapbox.Camera>(null);

  // 1. Obtener Permisos y Ubicación Inicial
  useEffect(() => {
    (async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          Alert.alert(
            'GPS Desactivado',
            'Tu ubicación está desactivada. Por favor, actívala para poder usar el mapa correctamente.',
            [{ text: 'OK' }]
          );
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Necesitamos tu ubicación para mostrar el mapa.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        console.log("📍 Ubicación del usuario obtenida:", location.coords);

        const coords = [location.coords.longitude, location.coords.latitude];
        setInitialLocation(coords);
        setSelectedCoords(coords);

      } catch (error) {
        console.error("Error obteniendo ubicación:", error);
      }
    })();
  }, []);

  // Centrar la cámara
  useEffect(() => {
    if (initialLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: initialLocation,
        zoomLevel: 15,
        animationDuration: 1000,
      });
    } else if (sessionData?.start_coords && cameraRef.current) {
      // Fallback: Centrar en el inicio de la ruta si no hay GPS
      cameraRef.current.setCamera({
        centerCoordinate: sessionData.start_coords.coordinates,
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  }, [initialLocation, sessionData]);

  // 2. Obtener Ruta Real desde Supabase
  useEffect(() => {
    const fetchRoute = async () => {
      const sessionId = Number(trip_session_id);

      if (!sessionId || isNaN(sessionId)) {
        console.error("❌ trip_session_id inválido:", trip_session_id);
        return;
      }

      console.log("🚀 Buscando ruta para session ID:", sessionId);

      const { data: sessionData, error: sessionError } = await supabase
        .from("trip_sessions")
        .select("start_coords, end_coords, start_location, end_location")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error("❌ Error session:", sessionError);
        return;
      }

      setSessionData(sessionData);

      const { data: stopsData, error: stopsError } = await supabase
        .from("trip_session_stops")
        .select(`
          *,
          stops (
            coords,
            location
          )
        `)
        .eq("trip_session_id", sessionId);

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

      const coordsString = waypoints
        ? `${origin};${waypoints};${destination}`
        : `${origin};${destination}`;

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          setRouteGeoJSON({
            type: "Feature",
            geometry: data.routes[0].geometry,
            properties: {},
          });
        }
      } catch (e) {
        console.error("❌ Error Mapbox API Fetch:", e);
      }
    };

    if (trip_session_id) fetchRoute();
  }, [trip_session_id]);

  useEffect(() => {
    const checkExistingRequest = async () => {
      const sessionId = Number(trip_session_id);
      if (!user?.id || !sessionId || isNaN(sessionId)) return;

      const { data, error } = await supabase
        .from('passenger_trip_sessions')
        .select('status, rejected, rejection_reason')
        .eq('trip_session_id', sessionId)
        .eq('passenger_id', user.id)
        .in('status', ['joined', 'pending_approval'])
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error verificando solicitud existente:', error);
        return;
      }

      if (data) {
        // Si fue rechazada, permitir reintentar
        if (data.rejected) {
          Alert.alert(
            'Solicitud Rechazada',
            data.rejection_reason 
              ? `Tu solicitud anterior fue rechazada: ${data.rejection_reason}\n\nPuedes seleccionar un nuevo punto de encuentro para intentar nuevamente.`
              : 'Tu solicitud anterior fue rechazada. Puedes seleccionar un nuevo punto de encuentro para intentar nuevamente.'
          );
          return;
        }

        // Si está pendiente (no rechazada), bloquear
        setHasPendingRequest(true);
        Alert.alert(
          'Solicitud existente',
          'Ya has enviado una solicitud para este viaje. No puedes seleccionar otro punto de encuentro.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/available-routes') }]
        );
      }
    };

    checkExistingRequest();
  }, [trip_session_id, user?.id, router]);


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

      const distKm = turf.pointToLineDistance(point, line as any);
      const distM = distKm * 1000;

      setDistanceToRoute(distM);
      setIsValidSelection(distM <= 150);

    } catch (e) {
      console.error("❌ Error Turf:", e);
      setIsValidSelection(true);
    }
  }, [selectedCoords, routeGeoJSON]);

  const confirmPoint = async () => {
    if (!selectedCoords || !isValidSelection || hasPendingRequest) return;
    setLoading(true);

    try {
      const sessionId = Number(trip_session_id);

      const { data: existingRequest, error: existingError } = await supabase
        .from('passenger_trip_sessions')
        .select('status, rejected, rejection_reason')
        .eq('trip_session_id', sessionId)
        .eq('passenger_id', user?.id)
        .in('status', ['joined', 'pending_approval'])
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;
      
      // Si existe una solicitud y NO fue rechazada, está pendiente
      if (existingRequest && !existingRequest.rejected) {
        Alert.alert('Solicitud existente', 'Ya tienes una solicitud en curso para este viaje. No puedes volver a seleccionar otro punto de encuentro.');
        router.replace('/(tabs)/available-routes');
        return;
      }

      // Si fue rechazada, permitir crear una nueva (no bloquear)
      if (existingRequest && existingRequest.rejected) {
        // Permitir continuar, será una nueva solicitud
      }

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

      if (meetingError) throw meetingError;

      Alert.alert("Solicitud Enviada", "Tu solicitud ha sido enviada con éxito. Espera a que el conductor la apruebe.");
      router.replace("/(tabs)/available-routes");
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
        <View className={`p-4 rounded-3xl shadow-2xl border ${isValidSelection ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200'}`}>
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
        styleURL={Mapbox.StyleURL.TrafficNight}
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

        {routeGeoJSON && (
          <ShapeSource id="routeGuide" shape={routeGeoJSON}>
            <LineLayer
              id="guideLine"
              style={{
                lineColor: "#00E5FF",
                lineWidth: 5,
                lineOpacity: 0.7,
                lineJoin: "round",
                lineCap: "round",
              }}
            />
          </ShapeSource>
        )}

        {sessionData && (
          <>
            <MarkerView
              id="originPoint"
              coordinate={sessionData.start_coords.coordinates}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View className="items-center">
                <View className="bg-white p-1 rounded-full shadow-md">
                  <Ionicons name="flag" size={24} color="#22c55e" />
                </View>
                {/* <ThemedText className="bg-white/80 px-1 text-[8px] font-bold">Inicio</ThemedText> */}
              </View>
            </MarkerView>

            {stopsData?.map((stop: any, index: number) => {
              const coords = stop.stops?.coords?.coordinates;
              if (!coords) return null;
              return (
                <MarkerView
                  key={`stop-${index}`}
                  id={`stop-${index}`}
                  coordinate={[coords[0], coords[1]]}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons
                      name="location-sharp"
                      size={24}
                      color="#FCA311"
                    />
                  </View>
                </MarkerView>
              );
            })}

            <MarkerView
              id="destinationPoint"
              coordinate={sessionData.end_coords.coordinates}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View className="items-center">
                <View className="bg-white p-1 rounded-full shadow-md">
                  <Ionicons name="location" size={24} color="#ef4444" />
                </View>
                {/* <ThemedText className="bg-white/80 px-1 text-[8px] font-bold">Fin</ThemedText> */}
              </View>
            </MarkerView>
          </>
        )}
      </MapView>

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

      <View className="absolute bottom-32 left-0 right-0 px-6">
        <Pressable
          onPress={confirmPoint}
          disabled={loading || !isValidSelection || hasPendingRequest}
          className={`h-16 rounded-full flex-row items-center justify-center shadow-2xl ${loading || !isValidSelection || hasPendingRequest ? "bg-gray-400" : "bg-[#FCA311]"
            }`}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-lg text-white`}>
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
