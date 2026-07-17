import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useTripStops } from "@/hooks/useRealTime";
import { supabase } from "@/lib/supabase";
import { tripService } from "@/services/trip.service";
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

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
Mapbox.setAccessToken(MAPBOX_TOKEN);

export default function SelectionMapScreen() {
  const { trip_session_id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { stops: sessionStatusStops } = useTripStops(Number(trip_session_id));

  // ── Mapa ────────────────────────────────────────────────────────────────────
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // ── Datos de sesión ─────────────────────────────────────────────────────────
  const [sessionData, setSessionData] = useState<any>(null);
  const [stopsData, setStopsData] = useState<any[]>([]);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

  // ── Ubicación ───────────────────────────────────────────────────────────────
  const [initialLocation, setInitialLocation] = useState<number[] | null>(null);
  const [currentCoords, setCurrentCoords] = useState<number[] | null>(null);
  const [currentName, setCurrentName] = useState<string>("Buscando ubicación...");

  // ── Puntos fijados ──────────────────────────────────────────────────────────
  const [pickupPoint, setPickupPoint] = useState<{ coords: number[]; name: string } | null>(null);
  const [destPoint, setDestPoint] = useState<{ coords: number[]; name: string } | null>(null);

  // ── Modo de interfaz ────────────────────────────────────────────────────────
  // activeMode: qué punto estamos editando ahora
  const [activeMode, setActiveMode] = useState<"pickup" | "destination">("pickup");
  // isSelectionMode: si el crosshair central está activo (false = ambos puntos fijados, revisión)
  const [isSelectionMode, setIsSelectionMode] = useState(true);

  // ── Validación pickup ───────────────────────────────────────────────────────
  const [isValidPickup, setIsValidPickup] = useState(true);
  const [distanceToRoute, setDistanceToRoute] = useState(0);

  // ── Misc ────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getPlaceName = async (coords: number[]) => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${MAPBOX_TOKEN}&language=es`
      );
      const data = await res.json();
      return data.features?.[0]?.place_name || "Ubicación en el mapa";
    } catch {
      return "Ubicación en el mapa";
    }
  };

  // ── 1. GPS inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          Alert.alert("GPS Desactivado", "Activa tu ubicación para usar el mapa correctamente.", [{ text: "OK" }]);
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso denegado", "Necesitamos tu ubicación para mostrar el mapa.");
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = [location.coords.longitude, location.coords.latitude];
        setInitialLocation(coords);
        setCurrentCoords(coords);
      } catch (e) {
        console.error("Error obteniendo ubicación:", e);
      }
    })();
  }, []);

  // ── 2. Centrar cámara al obtener GPS ─────────────────────────────────────────
  useEffect(() => {
    if (initialLocation && cameraRef.current) {
      cameraRef.current.setCamera({ centerCoordinate: initialLocation, zoomLevel: 15, animationDuration: 1000 });
    } else if (sessionData?.start_coords && cameraRef.current) {
      cameraRef.current.setCamera({ centerCoordinate: sessionData.start_coords.coordinates, zoomLevel: 14, animationDuration: 1000 });
    }
  }, [initialLocation, sessionData]);

  // ── 3. Obtener ruta y stops de Supabase ──────────────────────────────────────
  useEffect(() => {
    const fetchRoute = async () => {
      const sessionId = Number(trip_session_id);
      if (!sessionId || isNaN(sessionId)) return;

      const { data: sd, error: se } = await supabase
        .from("trip_sessions")
        .select("start_coords, end_coords, start_location, end_location")
        .eq("id", sessionId)
        .single();

      if (se || !sd) { console.error("❌ Error session:", se); return; }
      setSessionData(sd);

      const passengerStopsData = await tripService.getSessionStops(sessionId);
      const sessionStops = passengerStopsData.filter((s) =>
        sessionStatusStops.some(
          (sst) => sst.passenger_stop_id === s.id && ["pending", "visited"].includes(sst.status)
        )
      );
      setStopsData(sessionStops || []);

      const origin = `${sd.start_coords.coordinates[0]},${sd.start_coords.coordinates[1]}`;
      const destination = `${sd.end_coords.coordinates[0]},${sd.end_coords.coordinates[1]}`;
      const waypoints = sessionStops
        ?.map((s: any) => (s.coords ? `${s.coords.latitude},${s.coords.longitude}` : null))
        .filter(Boolean)
        .join(";");

      const coordsString = waypoints ? `${origin};${waypoints};${destination}` : `${origin};${destination}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.length > 0) {
          setRouteGeoJSON({ type: "Feature", geometry: data.routes[0].geometry, properties: {} });
        }
      } catch (e) {
        console.error("❌ Error Mapbox API:", e);
      }
    };

    if (trip_session_id) fetchRoute();
  }, [trip_session_id]);

  // ── 4. Verificar solicitud existente ─────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const sessionId = Number(trip_session_id);
      if (!user?.id || !sessionId || isNaN(sessionId)) return;

      const { data, error } = await supabase
        .from("passenger_requests")
        .select("status")
        .eq("trip_session_id", sessionId)
        .eq("passenger_id", user.id)
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) { console.error("Error verificando solicitud:", error); return; }

      const joinedStatus = await tripService.checkPassengerSessionStatus(user.id, sessionId);

      if (data) {
        if (data.status === "approved" && joinedStatus) {
          Alert.alert("Ya estás en este viaje", "Tu solicitud fue aprobada.", [{ text: "OK", onPress: () => router.replace("/(tabs)/available-routes") }]);
        } else if (data.status === "pending") {
          setHasPendingRequest(true);
          Alert.alert("Solicitud existente", "Ya enviaste una solicitud. Espera la respuesta del conductor.", [{ text: "OK", onPress: () => router.replace("/(tabs)/available-routes") }]);
        }
      }
    };
    check();
  }, [trip_session_id, user?.id]);

  // ── 5. Validar proximidad del pickup a la ruta ────────────────────────────────
  useEffect(() => {
    if (!currentCoords || !routeGeoJSON || activeMode !== "pickup" || !isSelectionMode) return;
    try {
      const point = turf.point(currentCoords);
      let line: any;
      if (routeGeoJSON.geometry.type === "LineString") {
        line = turf.lineString(routeGeoJSON.geometry.coordinates);
      } else if (routeGeoJSON.geometry.type === "MultiLineString") {
        line = turf.multiLineString(routeGeoJSON.geometry.coordinates);
      } else {
        line = routeGeoJSON.geometry;
      }
      const distM = turf.pointToLineDistance(point, line) * 1000;
      setDistanceToRoute(distM);
      setIsValidPickup(distM <= 150);
    } catch (e) {
      setIsValidPickup(true);
    }
  }, [currentCoords, routeGeoJSON, activeMode, isSelectionMode]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleMapIdle = async (e: any) => {
    if (!isMapReady || !isSelectionMode) return;
    const coords = e.geometry?.coordinates || e.properties?.center;
    if (!coords) return;
    setCurrentCoords(coords);
    const name = await getPlaceName(coords);
    setCurrentName(name);
  };

  const handleLabelPress = (mode: "pickup" | "destination") => {
    // Si todavía no fijamos pickup, no permitir saltar a destination
    if (mode === "destination" && !pickupPoint) return;
    setActiveMode(mode);
    setIsSelectionMode(true);
    const existingPoint = mode === "pickup" ? pickupPoint : destPoint;
    if (existingPoint) {
      cameraRef.current?.setCamera({ centerCoordinate: existingPoint.coords, zoomLevel: 15, animationDuration: 800 });
    }
  };

  const fixPoint = async () => {
    if (!currentCoords || hasPendingRequest) return;

    if (activeMode === "pickup") {
      if (!isValidPickup) {
        Alert.alert("Selección Inválida", "El punto de encuentro debe estar a menos de 150 metros de la ruta.");
        return;
      }
      setLoading(true);
      try {
        const name = await getPlaceName(currentCoords);
        setPickupPoint({ coords: [...currentCoords], name });
        // Si ya hay destino fijado, volver a revisión; si no, pasar a destino
        if (destPoint) {
          setIsSelectionMode(false);
        } else {
          setActiveMode("destination");
        }
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const name = await getPlaceName(currentCoords);
        setDestPoint({ coords: [...currentCoords], name });
        setIsSelectionMode(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const submitRequest = async () => {
    if (!pickupPoint || !destPoint || loading || hasPendingRequest) return;
    setLoading(true);
    try {
      const sessionId = Number(trip_session_id);
      await tripService.submitPassengerRequest(
        sessionId,
        user!.id,
        { latitude: pickupPoint.coords[1], longitude: pickupPoint.coords[0] },
        { latitude: destPoint.coords[1], longitude: destPoint.coords[0] },
        pickupPoint.name || "Punto de Encuentro",
        destPoint.name || "Punto de Destino"
      );
      Alert.alert("Solicitud Enviada", "Tu solicitud fue enviada. Espera la aprobación del conductor.");
      router.replace("/(tabs)/available-routes");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Colores por modo ──────────────────────────────────────────────────────────
  const pickupColor = isValidPickup ? "#10B981" : Colors.dark.warning; // verde o naranja
  const destColor = Colors.light.secondary; // azul/secundario

  const activeModeColor = activeMode === "pickup" ? pickupColor : destColor;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>

      {/* ── PANEL SUPERIOR ─────────────────────────────────────────────────── */}
      <View className="absolute top-16 left-0 right-0 z-50 px-5">
        <View
          style={{
            backgroundColor: Colors.dark.glass,
            borderColor: Colors.dark.border,
            borderWidth: 1,
            borderRadius: 32,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Línea de progreso visual */}
            <View style={{ alignItems: "center", marginRight: 14 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: pickupPoint ? "#10B981" : (activeMode === "pickup" && isSelectionMode ? "#10B981" : Colors.dark.border),
                  borderWidth: pickupPoint ? 0 : 2,
                  borderColor: "#10B981",
                }}
              />
              <View style={{ width: 2, height: 36, marginVertical: 4, backgroundColor: Colors.dark.border }} />
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: destPoint ? destColor : (activeMode === "destination" && isSelectionMode ? destColor : Colors.dark.border),
                  borderWidth: destPoint ? 0 : 2,
                  borderColor: destColor,
                }}
              />
            </View>

            {/* Labels presionables */}
            <View style={{ flex: 1 }}>
              {/* Pickup */}
              <Pressable
                onPress={() => handleLabelPress("pickup")}
                style={[
                  styles.labelBtn,
                  activeMode === "pickup" && isSelectionMode
                    ? { backgroundColor: "rgba(16,185,129,0.16)", borderColor: "rgba(16,185,129,0.4)", borderWidth: 1 }
                    : undefined,
                ]}
              >
                <ThemedText
                  numberOfLines={1}
                  style={[
                    styles.labelText,
                    { color: activeMode === "pickup" && isSelectionMode ? "#fff" : Colors.dark.textSecondary },
                  ]}
                >
                  {activeMode === "pickup" && isSelectionMode
                    ? currentName
                    : (pickupPoint?.name || "Selecciona tu punto de encuentro...")}
                </ThemedText>
                {pickupPoint && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
              </Pressable>

              {/* Destination */}
              <Pressable
                onPress={() => handleLabelPress("destination")}
                style={[
                  styles.labelBtn,
                  { marginTop: 4 },
                  activeMode === "destination" && isSelectionMode
                    ? { backgroundColor: `${destColor}26`, borderColor: `${destColor}66`, borderWidth: 1 }
                    : undefined,
                  !pickupPoint ? { opacity: 0.4 } : undefined,
                ]}
              >
                <ThemedText
                  numberOfLines={1}
                  style={[
                    styles.labelText,
                    { color: activeMode === "destination" && isSelectionMode ? "#fff" : Colors.dark.textSecondary },
                  ]}
                >
                  {activeMode === "destination" && isSelectionMode
                    ? currentName
                    : (destPoint?.name || "¿Dónde te bajas?")}
                </ThemedText>
                {destPoint && <Ionicons name="checkmark-circle" size={16} color={destColor} />}
              </Pressable>
            </View>
          </View>

          {/* Indicador de distancia (sólo si pickup activo e inválido) */}
          {activeMode === "pickup" && isSelectionMode && !isValidPickup && (
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="warning" size={14} color={Colors.dark.warning} />
              <Text style={{ color: Colors.dark.warning, fontSize: 11, fontWeight: "600" }}>
                {`Acércate ${Math.round(distanceToRoute - 150)}m más a la ruta del viaje`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── MAPA ────────────────────────────────────────────────────────────── */}
      <MapView
        style={{ flex: 1 }}
        styleURL={Mapbox.StyleURL.TrafficNight}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        onMapIdle={handleMapIdle}
        logoEnabled={false}
        compassEnabled={false}
      >
        <Camera ref={cameraRef} />
        <UserLocation visible={true} />

        {/* Trazado de la ruta */}
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

        {/* Marcadores de la sesión */}
        {sessionData && (
          <>
            {/* Origen */}
            <MarkerView id="originPoint" coordinate={sessionData.start_coords.coordinates} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.routeMarker}>
                <Ionicons name="flag" size={20} color="#10B981" />
              </View>
            </MarkerView>

            {/* Stops de pasajeros */}
            {stopsData?.map((stop: any, index: number) => {
              const lat = stop.coords?.latitude;
              const lng = stop.coords?.longitude;
              if (!lat || !lng) return null;
              return (
                <MarkerView
                  key={`stop-${stop.id ?? index}`}
                  id={`stop-${stop.id ?? index}`}
                  coordinate={[lng, lat]}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={{ alignItems: "center" }}>
                    <View style={styles.stopBadge}>
                      <Ionicons name="flag" size={11} color={Colors.light.secondary} />
                      <Text style={styles.stopBadgeText}>P{index + 1}</Text>
                    </View>
                    <View style={styles.stopPin} />
                  </View>
                </MarkerView>
              );
            })}

            {/* Destino de la ruta */}
            <MarkerView id="destinationPoint" coordinate={sessionData.end_coords.coordinates} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.routeMarker}>
                <Ionicons name="location" size={20} color={Colors.light.warning} />
              </View>
            </MarkerView>
          </>
        )}

        {/* Marcador fijado: pickup */}
        {pickupPoint && (
          <PointAnnotation id="pickup-fixed" coordinate={pickupPoint.coords}>
            <View style={[styles.fixedDot, { backgroundColor: "#10B981" }]} />
          </PointAnnotation>
        )}

        {/* Marcador fijado: destino */}
        {destPoint && (
          <PointAnnotation id="dest-fixed" coordinate={destPoint.coords}>
            <View style={[styles.fixedDot, { backgroundColor: destColor }]} />
          </PointAnnotation>
        )}
      </MapView>

      {/* ── CROSSHAIR CENTRAL (solo en selección) ──────────────────────────── */}
      {isSelectionMode && (
        <View pointerEvents="none" style={styles.markerFixed}>
          <View style={styles.markerContainer}>
            <View
              style={[
                styles.markerLabel,
                {
                  backgroundColor:
                    activeMode === "pickup"
                      ? isValidPickup ? "rgba(16,185,129,0.9)" : Colors.dark.warning
                      : `${destColor}E6`,
                },
              ]}
            >
              <Text style={styles.markerLabelText}>
                {activeMode === "pickup"
                  ? isValidPickup ? "RECOGER AQUÍ" : `MUY LEJOS (${Math.round(distanceToRoute)}m)`
                  : "BAJAR AQUÍ"}
              </Text>
            </View>
            <Ionicons
              name="location"
              size={44}
              color={activeMode === "pickup" ? (isValidPickup ? "#10B981" : Colors.dark.warning) : destColor}
            />
            <View style={styles.shadow} />
          </View>
        </View>
      )}

      {/* ── BOTONES INFERIORES ──────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        {/* En modo selección: botón "Fijar punto" */}
        {isSelectionMode && (
          <Pressable
            onPress={fixPoint}
            disabled={loading || (activeMode === "pickup" && !isValidPickup) || hasPendingRequest}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor:
                  (activeMode === "pickup" && !isValidPickup) || hasPendingRequest
                    ? Colors.dark.border
                    : activeModeColor,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>
                  {activeMode === "pickup" ? "Fijar Punto de Encuentro" : "Fijar Punto de Destino"}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Fuera de selección (ambos fijados): botón "Confirmar y Enviar" */}
        {!isSelectionMode && pickupPoint && destPoint && (
          <Pressable
            onPress={submitRequest}
            disabled={loading || hasPendingRequest}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: Colors.dark.secondary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={Colors.dark.primary} />
            ) : (
              <>
                <Text style={[styles.actionBtnText, { color: Colors.dark.text }]}>
                  Confirmar y Enviar Solicitud
                </Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.dark.text} style={{ marginLeft: 8 }} />
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* ── BOTÓN CERRAR / VOLVER ───────────────────────────────────────────── */}
      <Pressable
        onPress={() => {
          if (!isSelectionMode) {
            // Volver a modo selección del punto activo
            setIsSelectionMode(true);
          } else if (activeMode === "destination" && pickupPoint) {
            // Volver al modo pickup
            setActiveMode("pickup");
          } else {
            router.canGoBack() ? router.back() : router.replace("/(tabs)/available-routes");
          }
        }}
        style={[
          styles.closeBtn,
          { backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border },
        ]}
      >
        <Ionicons
          name={!isSelectionMode || (activeMode === "destination" && pickupPoint) ? "arrow-back" : "close"}
          size={22}
          color={Colors.dark.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  labelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  labelText: {
    fontSize: 13,
    flex: 1,
    marginRight: 6,
  },
  routeMarker: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(15,20,30,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  stopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(15,20,35,0.85)",
    borderWidth: 1.5,
    borderColor: Colors.light.secondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  stopBadgeText: {
    color: Colors.light.secondary,
    fontSize: 10,
    fontWeight: "bold",
  },
  stopPin: {
    width: 2,
    height: 6,
    backgroundColor: Colors.light.secondary,
    opacity: 0.8,
  },
  fixedDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  markerFixed: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -50,
    marginTop: -88,
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  markerContainer: {
    alignItems: "center",
  },
  markerLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 4,
  },
  markerLabelText: {
    color: "white",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  shadow: {
    width: 10,
    height: 5,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 5,
    marginTop: -3,
  },
  bottomBar: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  actionBtn: {
    height: 60,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 60,
  },
});
