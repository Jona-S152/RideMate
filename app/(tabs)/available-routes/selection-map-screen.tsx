import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { tripService } from "@/services/trip.service";
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

  // NUEVOS ESTADOS PARA DOS PASOS
  const [step, setStep] = useState<'pickup' | 'destination'>('pickup');
  const [pickupCoords, setPickupCoords] = useState<number[] | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>("");

  const cameraRef = useRef<Mapbox.Camera>(null);

  const getPlaceName = async (coords: number[]) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${MAPBOX_TOKEN}&language=es`
      );
      const data = await response.json();
      return data.features?.[0]?.place_name || "Ubicación en el mapa";
    } catch {
      return "Ubicación en el mapa";
    }
  };

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

      // Consultamos la nueva tabla passenger_requests
      const { data, error } = await supabase
        .from('passenger_requests')
        .select('status, rejection_reason')
        .eq('trip_session_id', sessionId)
        .eq('passenger_id', user.id)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error verificando solicitud existente:', error);
        return;
      }

      if (data) {
        if (data.status === 'approved') {
          Alert.alert(
            'Ya estás en este viaje',
            'Tu solicitud ha sido aprobada. Ya estás participando en este viaje.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/available-routes') }]
          );
        } else if (data.status === 'pending') {
          setHasPendingRequest(true);
          Alert.alert(
            'Solicitud existente',
            'Ya has enviado una solicitud para este viaje. Espera a que el conductor la apruebe.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/available-routes') }]
          );
        }
      }
    };

    checkExistingRequest();
  }, [trip_session_id, user?.id, router]);


  // 3. Validar Proximidad (Turf.js)
  useEffect(() => {
    if (!selectedCoords || !routeGeoJSON) return;

    if (step === 'destination') {
      setIsValidSelection(true);
      return;
    }

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
  }, [selectedCoords, routeGeoJSON, step]);

  const confirmPoint = async () => {
    if (!selectedCoords || hasPendingRequest) return;

    if (step === 'pickup') {
      if (!isValidSelection) {
        Alert.alert("Selección Inválida", "El punto de encuentro debe estar a menos de 150 metros de la ruta.");
        return;
      }
      setLoading(true);
      try {
        const address = await getPlaceName(selectedCoords);
        setPickupCoords(selectedCoords);
        setPickupAddress(address);
        setStep('destination');
        Alert.alert("Punto de Encuentro Fijado", "Ahora selecciona en el mapa tu punto de destino/bajada.");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const address = await getPlaceName(selectedCoords);
        const destCoords = selectedCoords;
        const sessionId = Number(trip_session_id);

        await tripService.submitPassengerRequest(
          sessionId,
          user!.id,
          { latitude: pickupCoords![1], longitude: pickupCoords![0] },
          { latitude: destCoords[1], longitude: destCoords[0] },
          pickupAddress || "Punto de Encuentro",
          address || "Punto de Destino"
        );

        Alert.alert("Solicitud Enviada", "Tu solicitud ha sido enviada con éxito. Espera a que el conductor la apruebe.");
        router.replace("/(tabs)/available-routes");
      } catch (error: any) {
        console.error(error);
        Alert.alert("Error", error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      {/* Información Superior */}
      <View className="absolute top-28 left-0 right-0 z-40 px-5">
        <View
          className="p-4 rounded-3xl shadow-2xl border"
          style={{
            backgroundColor: isValidSelection ? Colors.dark.glass : "rgba(245,158,11,0.22)",
            borderColor: isValidSelection ? Colors.dark.border : "rgba(245,158,11,0.45)",
          }}
        >
          <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: Colors.dark.textSecondary }}>
            {step === 'pickup' 
              ? (isValidSelection ? "Paso 1/2: Punto de Encuentro" : "Demasiado Lejos de la Ruta")
              : "Paso 2/2: Punto de Destino"}
          </Text>
          <Text className="text-sm mt-1 font-semibold" style={{ color: isValidSelection ? Colors.dark.text : Colors.dark.warning }}>
            {step === 'pickup'
              ? (isValidSelection ? "Arrastra el mapa para ajustar el encuentro" : `Acércate ${Math.round(distanceToRoute - 150)}m más a la ruta`)
              : "Arrastra el mapa para ajustar el destino"}
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
                lineColor: Colors.light.secondary,
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
                <View className="p-1 rounded-full shadow-md" style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}>
                  <Ionicons name="flag" size={24} color={Colors.light.success} />
                </View>
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
                      color={Colors.light.secondary}
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
                <View className="p-1 rounded-full shadow-md" style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}>
                  <Ionicons name="location" size={24} color={Colors.light.warning} />
                </View>
              </View>
            </MarkerView>
          </>
        )}
      </MapView>

      <View pointerEvents="none" style={styles.markerFixed}>
        <View style={styles.markerContainer}>
          <View
            className="px-3 py-1 rounded-full mb-2 shadow-sm"
            style={{ backgroundColor: isValidSelection ? Colors.dark.glassStrong : Colors.dark.warning }}
          >
            <Text className="text-white text-[10px] font-bold">
              {step === 'pickup' 
                ? (isValidSelection ? "RECOGER AQUÍ" : `MUY LEJOS (${Math.round(distanceToRoute)}m)`)
                : "BAJAR AQUÍ"}
            </Text>
          </View>
          <Ionicons 
            name="location" 
            size={40} 
            color={step === 'pickup' 
              ? (isValidSelection ? Colors.dark.primary : Colors.dark.warning)
              : Colors.light.secondary} 
          />
          <View style={styles.shadow} />
        </View>
      </View>

      <View className="absolute bottom-32 left-0 right-0 px-6">
        <Pressable
          onPress={confirmPoint}
          disabled={loading || (step === 'pickup' && !isValidSelection) || hasPendingRequest}
          className={`h-16 rounded-full flex-row items-center justify-center shadow-2xl ${
            loading || (step === 'pickup' && !isValidSelection) || hasPendingRequest 
              ? "bg-gray-400" 
              : step === 'pickup' ? "bg-secondary" : "bg-primary"
          }`}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-lg text-white`}>
              {step === 'pickup' ? "Fijar Punto de Encuentro" : "Confirmar e Iniciar Solicitud"}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          if (step === 'destination') {
            setStep('pickup');
          } else {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/available-routes");
            }
          }
        }}
        className="absolute top-14 left-6 w-10 h-10 rounded-full items-center justify-center shadow-md z-50 bg-secondary"
      >
        <Ionicons name={step === 'destination' ? "arrow-back" : "close"} size={24} color="white" />
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
