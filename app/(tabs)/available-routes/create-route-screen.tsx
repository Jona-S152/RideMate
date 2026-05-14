import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import Mapbox, {
  Camera,
  MapView,
  PointAnnotation,
  UserLocation,
} from "@rnmapbox/maps";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View
} from "react-native";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
Mapbox.setAccessToken(MAPBOX_TOKEN);

export default function CreateRouteScreen() {
  const { user } = useAuth();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const { activeModeP } = useLocalSearchParams();

  // Estados de ubicación
  const [initialLocation, setInitialLocation] = useState<number[] | null>(null);
  const [currentCoords, setCurrentCoords] = useState<number[] | null>(null);
  const [currentName, setCurrentName] = useState<string>("Buscando ubicación...");

  // Puntos fijados
  const [startPoint, setStartPoint] = useState<{ coords: number[]; name: string } | null>(null);
  const [endPoint, setEndPoint] = useState<{ coords: number[]; name: string } | null>(null);

  // Estados de interfaz
  const [activeMode, setActiveMode] = useState<'start' | 'end'>('start');
  const [isSelectionMode, setIsSelectionMode] = useState(true); // Controla si el marcador central es visible

  // Geometría de la ruta
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (activeModeP === 'start')
      setActiveMode('start');
    else
      setActiveMode('end');
  }, [activeModeP]);

  // 1. Obtener ubicación inicial
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let location = await Location.getCurrentPositionAsync({});
      const coords = [location.coords.longitude, location.coords.latitude];
      setInitialLocation(coords);
      setCurrentCoords(coords);

      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: 15,
        animationDuration: 1000,
      });
    })();
  }, []);

  // 2. Recalcular ruta y ajustar cámara
  useEffect(() => {
    if (startPoint && endPoint) {
      fetchRoute();
      if (!isSelectionMode) {
        // Ajustar cámara para mostrar toda la ruta cuando no estamos editando
        setTimeout(() => {
          cameraRef.current?.fitBounds(
            startPoint.coords,
            endPoint.coords,
            [150, 80, 250, 80], // Padding para no chocar con UI
            1000
          );
        }, 300);
      }
    }
  }, [startPoint, endPoint, isSelectionMode]);

  const getPlaceName = async (coords: number[]) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${MAPBOX_TOKEN}&language=es`
      );
      const data = await response.json();
      return data.features?.[0]?.place_name || "Ubicación en el mapa";
    } catch {
      return "Cargando dirección...";
    }
  };

  const fetchRoute = async () => {
    if (!startPoint || !endPoint) return;
    try {
      const query = `${startPoint.coords[0]},${startPoint.coords[1]};${endPoint.coords[0]},${endPoint.coords[1]}`;
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${query}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      setRouteGeometry(data.routes?.[0]?.geometry || null);

      const polyResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${query}?geometries=polyline&access_token=${MAPBOX_TOKEN}`
      );
      const polyData = await polyResponse.json();
      setRoutePolyline(polyData.routes?.[0]?.geometry || null);
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  const handleMapIdle = async (e: any) => {
    if (!isMapReady || !isSelectionMode) return;
    const coords = e.geometry?.coordinates || e.properties?.center;
    if (!coords) return;

    setCurrentCoords(coords);
    const name = await getPlaceName(coords);
    setCurrentName(name);
  };

  const fixPoint = () => {
    if (!currentCoords) return;

    if (activeMode === 'start') {
      setStartPoint({ coords: [...currentCoords], name: currentName });
      if (!endPoint) {
        setActiveMode('end');
      } else {
        setIsSelectionMode(false);
      }
    } else {
      setEndPoint({ coords: [...currentCoords], name: currentName });
      setIsSelectionMode(false);
    }
  };

  const handleInputPress = (mode: 'start' | 'end') => {
    setActiveMode(mode);
    setIsSelectionMode(true);

    // Mover cámara al punto ya seleccionado si existe
    const point = mode === 'start' ? startPoint : endPoint;
    if (point) {
      cameraRef.current?.setCamera({
        centerCoordinate: point.coords,
        zoomLevel: 15,
        animationDuration: 1000,
      });
    }
  };

  const saveRoute = async () => {
    if (!startPoint || !endPoint) return;
    setLoading(true);
    try {
      const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/traffic-night-v2/static/${routePolyline ? `path-5+FCA311-0.8(${encodeURIComponent(routePolyline)})` : ""},pin-s-a+2ecc71(${startPoint.coords[0]},${startPoint.coords[1]}),pin-s-b+e74c3c(${endPoint.coords[0]},${endPoint.coords[1]})/auto/600x600?padding=110,110,110,110&access_token=${MAPBOX_TOKEN}`;

      const { error } = await supabase.from("routes").insert([
        {
          created_by: user?.id,
          start_location: startPoint.name,
          end_location: endPoint.name,
          start_coords: { type: "Point", coordinates: startPoint.coords },
          end_coords: { type: "Point", coordinates: endPoint.coords },
          image_url: staticMapUrl
        }
      ]);

      if (error) throw error;
      Alert.alert("¡Éxito!", "Ruta creada correctamente.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      {/* PANEL DE SELECCIÓN SUPERIOR */}
      <View className="absolute top-16 left-0 right-0 z-50 px-5">
        <View
          className="p-5 rounded-[35px] shadow-2xl"
          style={{
            backgroundColor: Colors.dark.glass,
            borderColor: Colors.dark.border,
            borderWidth: 1,
          }}
        >
          <View className="flex-row items-center">
            <View className="items-center mr-4">
              <View className={`w-3 h-3 rounded-full ${startPoint ? 'bg-green-500' : 'bg-slate-300'}`} />
              <View className="w-[2px] h-10 my-1" style={{ backgroundColor: Colors.dark.border }} />
              <View className={`w-3 h-3 ${endPoint ? 'bg-red-500' : 'bg-slate-300'}`} />
            </View>

            <View className="flex-1">
              <Pressable
                onPress={() => handleInputPress('start')}
                className={`p-3 rounded-2xl mb-2 flex-row items-center ${activeMode === 'start' && isSelectionMode ? '' : 'bg-transparent'}`}
                style={
                  activeMode === "start" && isSelectionMode
                    ? {
                      backgroundColor: "rgba(16,185,129,0.16)",
                      borderColor: "rgba(16,185,129,0.4)",
                      borderWidth: 1,
                    }
                    : undefined
                }
              >
                <ThemedText
                  numberOfLines={1}
                  className={`text-sm flex-1 ${(activeMode === 'start' && isSelectionMode) ? 'font-bold text-textPrimary' : 'text-textSecondary'}`}
                >
                  {(activeMode === 'start' && isSelectionMode) ? currentName : (startPoint?.name || "Selecciona origen...")}
                </ThemedText>
                {startPoint && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
              </Pressable>

              <Pressable
                onPress={() => handleInputPress('end')}
                className={`p-3 rounded-2xl flex-row items-center ${activeMode === 'end' && isSelectionMode ? '' : 'bg-transparent'}`}
                style={
                  activeMode === "end" && isSelectionMode
                    ? {
                      backgroundColor: "rgba(239,68,68,0.16)",
                      borderColor: "rgba(239,68,68,0.4)",
                      borderWidth: 1,
                    }
                    : undefined
                }
              >
                <ThemedText
                  numberOfLines={1}
                  className={`text-sm flex-1 ${(activeMode === 'end' && isSelectionMode) ? 'font-bold text-textPrimary' : 'text-textSecondary'}`}
                >
                  {(activeMode === 'end' && isSelectionMode) ? currentName : (endPoint?.name || "¿A dónde vamos?")}
                </ThemedText>
                {endPoint && <Ionicons name="checkmark-circle" size={16} color={Colors.dark.warning} />}
              </Pressable>
            </View>
          </View>
        </View>
      </View>

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

        {/* Marcadores fijados en el mapa */}
        {startPoint && (
          <PointAnnotation id="start-fixed" coordinate={startPoint.coords}>
            <View className="w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-md" />
          </PointAnnotation>
        )}
        {endPoint && (
          <PointAnnotation id="end-fixed" coordinate={endPoint.coords}>
            <View className="w-6 h-6 bg-red-500 rounded-full border-4 border-white shadow-md" />
          </PointAnnotation>
        )}

        {/* Trazo de la ruta */}
        {routeGeometry && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeometry}>
            <Mapbox.LineLayer
              id="routeLine"
              style={{
                lineColor: Colors.light.secondary,
                lineWidth: 5,
                lineOpacity: 0.8,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </MapView>

      {/* MARCADOR CENTRAL (Solo en modo selección) */}
      {isSelectionMode && (
        <View pointerEvents="none" style={styles.markerFixed}>
          <View style={styles.markerContainer}>
            <View className={`px-4 py-1 rounded-full mb-2 shadow-sm ${activeMode === 'start' ? 'bg-green-600' : 'bg-red-600'}`}>
              <ThemedText className="text-white text-[10px] font-black uppercase tracking-widest">
                {activeMode === 'start' ? "Mover Inicio" : "Mover Destino"}
              </ThemedText>
            </View>
            <Ionicons name="location" size={45} color={activeMode === "start" ? Colors.dark.success : Colors.dark.warning} />
          </View>
        </View>
      )}

      {/* BOTONES DE ACCIÓN */}
      <View className="absolute bottom-12 left-0 right-0 px-6">
        {/* Botón para Fijar Punto */}
        {isSelectionMode && (
          <Pressable
            onPress={fixPoint}
            className={`h-16 rounded-full flex-row items-center justify-center shadow-2xl mb-4 ${activeMode === 'start' ? 'bg-green-600' : 'bg-red-600'}`}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="checkmark-done" size={20} color="white" style={{ marginRight: 10 }} />
            <ThemedText className="text-white font-black text-lg uppercase tracking-widest">
              {activeMode === 'start' ? "Fijar Inicio" : "Fijar Destino"}
            </ThemedText>
          </Pressable>
        )}

        {/* Botón para Guardar Ruta (Solo visible si no estamos editando y ambos existen) */}
        {!isSelectionMode && startPoint && endPoint && (
          <Pressable
            onPress={saveRoute}
            disabled={loading}
            className="h-16 rounded-full flex-row items-center justify-center shadow-2xl"
            style={({ pressed }) => [
              { backgroundColor: Colors.dark.secondary },
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {loading ? <ActivityIndicator color={Colors.dark.primary} /> : (
              <>
                <ThemedText className="text-primary font-black text-lg uppercase tracking-widest">
                  Confirmar y Crear Ruta
                </ThemedText>
                <Ionicons name="arrow-forward" size={20} color={Colors.dark.primary} style={{ marginLeft: 10 }} />
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Botón Cerrar */}
      <Pressable
        onPress={() => router.back()}
        className="absolute top-14 left-6 w-10 h-10 rounded-full items-center justify-center shadow-lg z-[60]"
        style={{
          backgroundColor: Colors.dark.glassSoft,
          borderColor: Colors.dark.border,
          borderWidth: 1,
        }}
      >
        <Ionicons name="close" size={24} color={Colors.dark.text} />
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
});
