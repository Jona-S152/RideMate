import BottomSheetRouteDetail from "@/components/BottomSheetRouteDetail";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, AppState, AppStateStatus, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";

// Mapbox Imports
import { useAuth } from "@/app/context/AuthContext";
import { useDriverLocation, useTripRealtimeById, useTripStops } from "@/hooks/useRealTime";
import { PassengerTripSession, StopData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import Mapbox, { Camera, LineLayer, MarkerView, ShapeSource, UserLocation } from "@rnmapbox/maps";

// REEMPLAZA ESTO CON TU CLAVE REAL DE MAPBOX
// Se recomienda manejar esto en un archivo de configuración o variables de entorno.
Mapbox.setAccessToken("pk.eyJ1Ijoiam9uYS1zMTUyIiwiYSI6ImNtaWc0NWw1MDAzMWgzY3E4MzJ6dTVyZngifQ.4LJzkPbbZQufPVGpwk41qA"); 

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Interfaz para el estado de la región (aunque Mapbox usa Camera, mantenemos esto para la ubicación del usuario)
interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function RouteDetail() {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [region, setRegion] = useState<MapRegion | null>(null);
  const [ passengers, setPassengers ] = useState<PassengerTripSession[]>([]);
  const [ stopsData, setStopsData ] = useState<StopData[]>([]);

  // Mapbox usa Mapbox.MapView. Aunque la referencia de tipo es diferente, useRef puede manejarlo.
  const mapRef = useRef<Mapbox.MapView>(null); 
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [showStops, setShowStops] = useState(false);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const { stops } = useTripStops(Number(id));
  const { session } = useTripRealtimeById(Number(id));
  const { driverLocation } = useDriverLocation(Number(id));

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // El usuario volvió a la app. Forzamos una consulta a Supabase
        // para ver si el viaje ya se completó mientras estábamos fuera.
        const { data } = await supabase
          .from('trip_sessions')
          .select('status')
          .eq('id', id)
          .single();

        if (data?.status === 'completed') {
          router.replace("/(tabs)/home");
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [id]);

  useEffect(() => {
    if (session === null) return;

    if (session.status === "completed")
      router.navigate("/(tabs)/home");
  }, [session]);
    
  const fetchStops = async () => {
    try {
      const { data, error } = await supabase
        .from("stops")
        .select("*")
        .in("id", stops.map(s => s.stop_id))
        .order("stop_order", { ascending: true });

      console.log("DATA STOPS: ", data);

      setStopsData(data as StopData[]);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchStops();
  }, [stops]);
  
  // Función para obtener la ruta de Mapbox Directions
  const fetchRouteMap = async () => {
    // Coordenadas para la ruta
    const origin: [number, number] = session !== null ? [session.start_longitude, session.start_latitude] : [stopsData[0].longitude, stopsData[0].latitude];
    const destination: [number, number] = session !== null ? [session.end_longitude, session.end_latitude] : [stopsData[stopsData.length - 1].longitude, stopsData[stopsData.length - 1].latitude];
    const waypoints: [number, number][] = session !== null ? stopsData.map(stop => [stop.longitude, stop.latitude]) : stopsData.slice(1, stopsData.length - 1).map(stop => [stop.longitude, stop.latitude]);
    const allCoordinates: [number, number][] = [origin, ...waypoints, destination];

    // Une las coordenadas en el formato requerido por la API: lng,lat;lng,lat...
    const coordsString = allCoordinates.map(c => c.join(',')).join(';');
    const accessToken = "pk.eyJ1Ijoiam9uYS1zMTUyIiwiYSI6ImNtaWc0NWw1MDAzMWgzY3E4MzJ6dTVyZngifQ.4LJzkPbbZQufPVGpwk41qA"; // Usar el token aquí también

    // Usamos el perfil de manejo ('driving')
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${accessToken}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry; 
        
        // El ShapeSource de Mapbox necesita una FeatureCollection
        const routeFeatureCollection = {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: route, properties: {} }]
        };

        setRouteGeoJSON(routeFeatureCollection as any);
      }
    } catch (error) {
      console.error("Error al obtener la ruta de Mapbox:", error);
    }
  };

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permiso de ubicación denegado");
        return;
      }

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const newRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          setRegion(newRegion);
          
          // Mapbox: mover la cámara
          cameraRef.current?.setCamera({
            centerCoordinate: [ session?.status === "active" ? driverLocation!.longitude : loc.coords.longitude, session?.status === "active" ? driverLocation!.latitude : loc.coords.latitude ],
            zoomLevel: 15,
            animationDuration: 500
          });
        }
      );
    })();

    return () => subscriber?.remove();
  }, []);

  useEffect(() => {
    // Solo intentamos trazar la ruta si tenemos al menos 2 paradas
    if (stopsData && stopsData.length >= 2) {
      fetchRouteMap();
    }
  }, [stopsData]);

  const fetchPassengers = async () => {
    const { data, error } = await supabase
      .from('passenger_trip_sessions')
      .select('*')
      .eq('trip_session_id', id)
      .eq('status', 'joined')
      .is('rejected', false);

    if (error) {
      console.error("Error al obtener pasajeros:", error);
      return null;
    }
    return data as PassengerTripSession[];
  };

  useEffect(() => {
    // 1. Carga inicial
    const loadInitialPassengers = async () => {
      const data = await fetchPassengers();
      if (data) setPassengers(data);
    };

    loadInitialPassengers();

    // 2. Suscripción en tiempo real
    const channel = supabase
      .channel(`passengers-in-session-${id}`) // Canal único por viaje
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchamos INSERT y UPDATE (por si cambian de estado)
          schema: 'public',
          table: 'passenger_trip_sessions',
          filter: `trip_session_id=eq.${id}`, // Filtramos solo para este viaje
        },
        (payload) => {
          console.log("Cambio detectado en pasajeros:", payload);
          
          // Opción recomendada: Refrescar la lista completa para asegurar filtros
          fetchPassengers().then(data => {
            if (data) setPassengers(data);
          });
        }
      )
      .subscribe();

    // 3. Limpieza al desmontar el componente
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Función para cambiar la ubicación y centrar la cámara de Mapbox
  const changeLocation = (lat: number, lng: number) => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [lng, lat], // Mapbox usa [lng, lat]
        zoomLevel: 15,
        animationDuration: 1000
      });
      // Actualiza la región también para mantener el estado coherente si es necesario
      setRegion(prev => prev ? { ...prev, latitude: lat, longitude: lng } : null);
    }
  };

  const toggleStops = () => {
    if (showStops) {
      setShowStops(false)
      // Ocultar → desliza hacia la derecha (fuera de pantalla)
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH, 
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      setShowStops(true);
      // Mostrar → desliza hacia la izquierda (dentro de pantalla)
      Animated.timing(slideAnim, {
        toValue: 0, 
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {region === null ? (
        <View className="flex-1 justify-center items-center">
          <Text>Cargando mapa...</Text>
        </View>
      ) : (
        <>
          {/* Mapa de Mapbox */}
          <Mapbox.MapView
            ref={mapRef}
            styleURL={Mapbox.StyleURL.Street} // Puedes cambiar el estilo aquí
            style={StyleSheet.absoluteFillObject}
            localizeLabels={true}
          >
            {/* Cámara inicial / centrado */}
            <Camera
              ref={cameraRef}
              zoomLevel={15}
              centerCoordinate={[region.longitude, region.latitude]}
              animationMode="flyTo"
              animationDuration={500}
            />

            {driverLocation && (
              <MarkerView
                id="driver"
                coordinate={[
                  driverLocation.longitude,
                  driverLocation.latitude,
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Ionicons
                  name="car-sport"
                  size={30}
                  color="#2563eb"
                />
              </MarkerView>
            )}

            {/* Ubicación del usuario */}
            <UserLocation 
                visible={true}
                showsUserHeadingIndicator={true}
                minDisplacement={5} // Actualizar cada 5 metros
            />
            
            {/* Dibuja la Ruta */}
            {routeGeoJSON && (
              <ShapeSource id="routeSource" shape={routeGeoJSON}>
                <LineLayer
                  id="routeLine"
                  style={{
                    lineColor: Colors.light.secondary,
                    lineWidth: 6,
                    lineJoin: 'round',
                    lineCap: 'round',
                  }}
                />
              </ShapeSource>
            )}

            {session && (
              <MarkerView 
                id="start-point"
                coordinate={[session.start_longitude, session.start_latitude]}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View className="items-center">
                  <View className="bg-white p-1 rounded-full shadow-md">
                    <Ionicons name="flag" size={30} color="#22c55e" /> {/* Verde para inicio */}
                  </View>
                  <Text className="bg-white/80 px-1 text-[10px] font-bold">Inicio</Text>
                </View>
              </MarkerView>
            )}

            {/* Marcadores para las Paradas (usando MarkerView para más control) */}
            {stopsData.map((stop, index) => (
              <MarkerView 
                key={`stop-${index}`}
                coordinate={[stop.longitude, stop.latitude]}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View className="items-center">
                  <Ionicons name="location-sharp" size={24} color={Colors.light.primary} />
                </View>
              </MarkerView>
            ))}

            {session && (
              <MarkerView 
                id="end-point"
                coordinate={[session.end_longitude, session.end_latitude]}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View className="items-center">
                  <View className="bg-white p-1 rounded-full shadow-md">
                    <Ionicons name="location" size={30} color="#ef4444" /> {/* Rojo para fin */}
                  </View>
                  <Text className="bg-white/80 px-1 text-[10px] font-bold">Destino</Text>
                </View>
              </MarkerView>
            )}

          </Mapbox.MapView>

          {/* Botón de Atrás */}
          <View pointerEvents="box-none" className="absolute top-8 left-[14px] z-50">
            <Pressable onPress={() => navigation.goBack()} className="p-2 rounded-full shadow-lg bg-white/70">
              <Ionicons name="arrow-back" size={34} color={Colors.light.primary} />
            </Pressable>
          </View>

          {/* Botón para Mostrar/Ocultar Paradas */}
          <View pointerEvents="box-none" className="absolute top-8 right-[14px] z-50">
            {/* Contenedor del degradado para el fondo del botón (solo si quieres el efecto) */}
            <View className="absolute inset-0 flex-row w-40 h-12 rounded-full overflow-hidden">
              <LinearGradient
                colors={[Colors.light.secondary, "transparent", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </View>

            {/* Botón en sí */}
            <Pressable
              onPress={toggleStops}
              className="p-2 rounded-full shadow-lg"
            >
              {showStops ? (
                <AntDesign name="doubleright" size={30} color="white" />
              ) : (
                <AntDesign name="doubleleft" size={30} color="white" />
              )}
            </Pressable>
          </View>

          {/* Panel Lateral de Paradas (Animation) */}
          <Animated.View 
            style={{ 
              transform: [{ translateX: slideAnim }],
            }} 
            className="absolute top-0 right-0 w-1/2 h-full z-40" // Z-index debe ser menor que los botones
          >
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.7)","rgba(255,255,255,0.95)" ]}
              style={{ flex: 1, paddingTop: 80, paddingHorizontal: 20 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View className="relative flex-1 overflow-hidden rounded-2xl">
                <ScrollView
                  showsVerticalScrollIndicator={false}
                >
                  {stopsData.map((stop, index) => (
                    <View key={index} className="flex-row mb-6">
                      <View className="items-center w-10">
                        <ThemedView 
                          lightColor={ stop.stop_order ? Colors.light.textBlack : "#94a3b8"} 
                          className="w-3 h-3 rounded-full"
                        />

                        {index < stops.length - 1 && (
                          <View className="w-1 flex-1 bg-slate-300 mt-1"/>
                        )}
                      </View>

                      <View className="flex-start mb-6">
                        <Pressable onPress={() => changeLocation(stop.latitude, stop.longitude)}>
                          <ThemedText 
                            lightColor={ stop.stop_order ? Colors.light.textBlack : "#94a3b8"} 
                            className="font-bold"
                          >
                            {stop.location.split(',')[0]}
                          </ThemedText>
                          <ThemedText 
                            lightColor={ stop.stop_order ? Colors.light.textBlack : "#94a3b8"} 
                            className="text-sm"
                          >
                            {stop.location.split(',')[0]}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ))}       
                </ScrollView>
              </View>
            </LinearGradient>
          </Animated.View>
          
          {/* Bottom Sheet */}
          <BottomSheetRouteDetail session={session} passengers={passengers} />
        </>
      )}
    </GestureHandlerRootView>
  );
}

// Estilos necesarios para Mapbox (aunque Tailwind se usa para el resto)
const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
});