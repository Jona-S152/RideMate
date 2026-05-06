import BottomSheetRouteDetail from "@/components/BottomSheetRouteDetail";
import { Colors } from "@/constants/Colors";
import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, AppState, AppStateStatus, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  GestureHandlerRootView
} from "react-native-gesture-handler";

// Mapbox Imports
import { useAuth } from "@/app/context/AuthContext";
import { MeetingPoint, PassengerTripSession, StopData, UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import Mapbox, {
  Camera,
  LineLayer,
  MarkerView,
  PointAnnotation,
  ShapeSource,
  UserLocation,
} from "@rnmapbox/maps";

// REEMPLAZA ESTO CON TU CLAVE REAL DE MAPBOX
Mapbox.setAccessToken(
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || ""
);

import DriverRatingListModal from "@/components/DriverRatingListModal";
import PassengerActionModal from "@/components/PassengerActionModal";
import PassengerDropOffModal from "@/components/PassengerDropOffModal";
import WaypointCheckInModal from "@/components/WaypointCheckInModal";
import { useDriverLocation, useTripRealtimeById, useTripStops } from "@/hooks/useRealTime";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import { calculateDistance, formatDistance } from "@/utils/geo";



const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Interfaz para el estado de la región
interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Waypoint {
  id: string;
  type: 'stop' | 'meeting_point' | 'origin' | 'destination';
  location: string;
  coords: { latitude: number, longitude: number };
  order: number;
  passengerId?: string;
  stopId?: number;
  status?: string;
  visitTime?: string | null;
}

export default function RouteDetail() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    trip_session_id: string;
    passenger_id: string;
    autoOpenModal: string;
    id?: string;
  }>();

  // Unify the ID: prefer 'id' from params or fallback to 'trip_session_id'
  const idParam = params.id || params.trip_session_id;
  const id = idParam;

  const { user } = useAuth();

  // Mapbox refs & State
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [showStops, setShowStops] = useState(false);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Custom Hooks
  const { stops } = useTripStops(Number(id));
  const { session } = useTripRealtimeById(Number(id));
  const { driverLocation } = useDriverLocation(Number(id));

  const [region, setRegion] = useState<MapRegion | null>(null);
  const [passengers, setPassengers] = useState<PassengerTripSession[]>([]);
  const [stopsData, setStopsData] = useState<StopData[]>([]);
  const [meetingPoints, setMeetingPoints] = useState<MeetingPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState<number>(-1);
  const [distanceToNextPoint, setDistanceToNextPoint] = useState<string>("0m");
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [passengerIdToProcess, setPassengerIdToProcess] = useState<string | null>(null);
  const [sessionUsers, setSessionUsers] = useState<UserData[]>([]);

  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [waypointToCheckIn, setWaypointToCheckIn] = useState<Waypoint | null>(null);
  const [checkedInWaypoints, setCheckedInWaypoints] = useState<Set<string>>(new Set());

  // Drop-off Modal State
  const [dropOffModalVisible, setDropOffModalVisible] = useState(false);
  const [dropOffTitle, setDropOffTitle] = useState("¿Quiénes se bajan aquí?");

  // Rating Modal State
  const [driverRatingModalVisible, setDriverRatingModalVisible] = useState(false);

  // ... existing code

  useEffect(() => {
    // 🛡️ SEGURIDAD: Solo abrir el modal de acción si el usuario actual es el CONDUCTOR
    const isDriver = session && user && session.driver_id === user.id;

    if (params.autoOpenModal === "true" && params.passenger_id && isDriver) {
      // Abrir modal automáticamente
      setPassengerIdToProcess(params.passenger_id);
      setModalVisible(true);
    }
  }, [params.autoOpenModal, params.passenger_id, session, user]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log("AppState changed to:", nextAppState);
      // Disable auto-redirect on app state change for debugging
      /* 
      if (nextAppState === "active") {
        const { data } = await supabase
          .from("trip_sessions")
          .select("status")
          .eq("id", id)
          .single();

        if (data?.status === "completed") {
          router.replace("/(tabs)/home");
        }
      } 
      */
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [id]);

  useEffect(() => {
    if (session === null) return;

    // console.log("Checking session status for ID:", id, "Status:", session.status);

    if (session.status === "completed") {
      // Temporary Debug Alert to catch why it redirects on start
      // Alert.alert("DEBUG", `Session ${id} is completed. Redirecting.`);
      router.navigate("/(tabs)/home");
    }
  }, [session]);

  const fetchStops = async () => {
    try {
      const { data, error } = await supabase
        .from("stops")
        .select("*")
        .in(
          "id",
          stops.map((s) => s.stop_id),
        )
        .order("stop_order", { ascending: true });

      const formattedData = (data || []).map((stop: any) => ({
        ...stop,
        coords: {
          latitude: Number(stop.coords?.coordinates?.[1] ?? stop.coords?.latitude ?? 0),
          longitude: Number(stop.coords?.coordinates?.[0] ?? stop.coords?.longitude ?? 0),
        }
      }));

      setStopsData(formattedData as StopData[]);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStops();
  }, [stops]);

  const buildWaypoints = async () => {
    if (!session) return;

    const allWaypoints: Waypoint[] = [];

    // Add origin
    allWaypoints.push({
      id: 'origin',
      type: 'origin',
      location: session.start_location,
      coords: { 
        latitude: Number(session.start_coords?.coordinates?.[1] ?? 0), 
        longitude: Number(session.start_coords?.coordinates?.[0] ?? 0) 
      },
      order: 0,
    });

    // 4. Fetch stop statuses
    const { data: stopStatuses } = await supabase
      .from('trip_session_stops')
      .select('stop_id, status, visit_time')
      .eq('trip_session_id', Number(id));

    // 5. Fetch meeting point statuses
    const { data: meetingStatuses } = await supabase
      .from('trip_session_meeting_points')
      .select('passenger_id, status, visit_time')
      .eq('trip_session_id', Number(id));

    // Combine stops and meeting points
    const combined = [
      ...stopsData.map((stop) => {
        const statusInfo = stopStatuses?.find(s => s.stop_id === stop.id);
        return {
          ...stop,
          type: 'stop' as const,
          stopId: stop.id,
          status: statusInfo?.status || 'pending',
          visitTime: statusInfo?.visit_time,
        };
      }),
      ...meetingPoints.map((mp) => {
        const statusInfo = meetingStatuses?.find(m => m.passenger_id === mp.passenger_id);
        return {
          ...mp,
          type: 'meeting_point' as const,
          passengerId: mp.passenger_id,
          status: statusInfo?.status || 'pending',
          visitTime: statusInfo?.visit_time,
        };
      }),
    ];

    // Sort by distance from origin (same logic as route calculation)
    const sorted = combined.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.coords.longitude - session.start_coords.coordinates[0], 2) +
        Math.pow(a.coords.latitude - session.start_coords.coordinates[1], 2),
      );
      const distB = Math.sqrt(
        Math.pow(b.coords.longitude - session.start_coords.coordinates[0], 2) +
        Math.pow(b.coords.latitude - session.start_coords.coordinates[1], 2),
      );
      return distA - distB;
    });

    // Add to waypoints with order
    sorted.forEach((item, index) => {
      allWaypoints.push({
        id:
          item.type === 'stop'
            ? `stop-${item.id}`
            : `meeting-${item.passenger_id}`,
        type: item.type,
        location: item.location,
        coords: { latitude: item.coords.latitude, longitude: item.coords.longitude },
        order: index + 1,
        stopId: item.type === 'stop' ? item.stopId : undefined,
        passengerId:
          item.type === 'meeting_point' ? item.passengerId : undefined,
        status: item.status,
        visitTime: item.visitTime,
      });
    });

    // Add destination
    allWaypoints.push({
      id: 'destination',
      type: 'destination',
      location: session.end_location,
      coords: { 
        latitude: Number(session.end_coords?.coordinates?.[1] ?? 0), 
        longitude: Number(session.end_coords?.coordinates?.[0] ?? 0) 
      },
      order: allWaypoints.length,
    });

    setWaypoints(allWaypoints);
    setSessionLoaded(true);
  };

  const PROXIMITY_THRESHOLD = 50; // meters

  const detectCurrentWaypoint = () => {
    if (!driverLocation || waypoints.length === 0) return;

    // Buscar el primer waypoint que no esté completado/visitado
    const nextTarget = waypoints.find(wp => {
      if (wp.type === 'origin') return false;
      const isCompleted = wp.status === 'completed' || wp.status === 'visited' || wp.status === 'dropped_off';
      return !isCompleted;
    });

    if (nextTarget) {
      const distKm = calculateDistance(
        driverLocation.coords.latitude,
        driverLocation.coords.longitude,
        nextTarget.coords.latitude,
        nextTarget.coords.longitude
      );
      setDistanceToNextPoint(formatDistance(distKm));
    } else {
      setDistanceToNextPoint("0m");
    }
  };

  const handleWaypointCheckIn = async (status: 'visited' | 'skipped') => {
    if (!waypointToCheckIn) return;

    try {
      if (waypointToCheckIn.type === 'stop') {
        const { error } = await supabase
          .from('trip_session_stops')
          .update({
            status,
            visit_time: status === 'visited' ? new Date().toISOString() : null,
          })
          .eq('trip_session_id', Number(id))
          .eq('stop_id', waypointToCheckIn.stopId);

        if (error) throw error;

        // If visited a stop, show drop-off modal
        if (status === 'visited') {
          setDropOffTitle("¿Quiénes se bajan en esta parada?");
          setDropOffModalVisible(true);
        }
      } else if (waypointToCheckIn.type === 'meeting_point') {
        const { error } = await supabase
          .from('passenger_meeting_points')
          .update({
            status,
            visit_time: status === 'visited' ? new Date().toISOString() : null,
          })
          .eq('trip_session_id', Number(id))
          .eq('passenger_id', waypointToCheckIn.passengerId);

        if (error) throw error;
      } else if (waypointToCheckIn.type === 'destination') {
        if (status === 'visited') {
          setDropOffTitle("¿Quiénes completaron el viaje?");
          setDropOffModalVisible(true);
        }
      }

      setCheckedInWaypoints((prev) => new Set(prev).add(waypointToCheckIn.id));
      setCheckInModalVisible(false);
      setWaypointToCheckIn(null);
      buildWaypoints();
    } catch (error) {
      console.error('Error updating waypoint status:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del punto');
    }
  };

  const handleFinishTrip = async () => {
    if (!session) return;

    try {
      // 1. Actualizar estado de la sesión de viaje
      const { error: sessionError } = await supabase
        .from("trip_sessions")
        .update({ status: "completed" })
        .eq("id", session.id);

      if (sessionError) throw sessionError;

      // 2. Actualizar pasajeros unidos a 'completed'
      const { error: passengersError } = await supabase
        .from("passenger_trip_sessions")
        .update({ status: "completed" })
        .eq("trip_session_id", session.id)
        .eq("status", "joined");

      if (passengersError) throw passengersError;

      // 3. Detener el tracking de ubicación
      await useTripTrackingStore.getState().stopTracking();

      // 4. Obtener datos frescos para el modal
      const latestPassengers = await fetchPassengers();
      if (latestPassengers) {
        setPassengers(latestPassengers);
        await fetchSessionUsers(latestPassengers);

        const participants = latestPassengers.filter(p => p.status === 'joined' || p.status === 'completed');
        if (participants.length > 0) {
          setDriverRatingModalVisible(true);
          return;
        }
      }

      Alert.alert("¡Viaje finalizado!", "Has llegado al destino y completado el viaje.");
      router.replace("/(tabs)/home");

    } catch (error) {
      console.error("Error finishing trip:", error);
      Alert.alert("Error", "No se pudo finalizar el viaje correctamente.");
    }
  };

  const handleLeaveTrip = async () => {
    if (!session || !user) return;

    Alert.alert(
      "Abandonar viaje",
      "¿Estás seguro de que quieres salirte de este viaje?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, salir",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("passenger_trip_sessions")
                .update({ status: "left" })
                .eq("trip_session_id", session.id)
                .eq("passenger_id", user.id);

              if (error) throw error;

              router.replace("/(tabs)/available-routes");
            } catch (error) {
              console.error("Error leaving trip:", error);
              Alert.alert("Error", "No se pudo abandonar el viaje.");
            }
          }
        }
      ]
    );
  };

  const handleDropOffPassengers = async (passengerIds: string[]) => {
    if (!session || passengerIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("passenger_trip_sessions")
        .update({ status: "completed" })
        .eq("trip_session_id", session.id)
        .in("passenger_id", passengerIds);

      if (error) throw error;

      setDropOffModalVisible(false);

      // Actualizar la lista de pasajeros localmente
      const updatedPassengers = await fetchPassengers();
      if (updatedPassengers) {
        setPassengers(updatedPassengers);
      }

      if (dropOffTitle === "¿Quiénes completaron el viaje?") {
        await handleFinishTrip();
      } else {
        Alert.alert("Éxito", "Los pasajeros han sido marcados como viaje completado.");
      }
    } catch (error) {
      console.error("Error dropping off passengers:", error);
      Alert.alert("Error", "No se pudo actualizar el estado de los pasajeros.");
    }
  };

  // Función para obtener la ruta de Mapbox Directions
  const fetchRouteMap = async () => {
    // 1. Validar que tengamos los datos mínimos necesarios
    if (!session || !stopsData || stopsData.length < 2) {
      console.log("⏳ Esperando datos suficientes para trazar la ruta...", {
        hasSession: !!session,
        stopsCount: stopsData?.length
      });
      return;
    }

    try {
      // 2. Extraer origen y destino de la sesión de forma segura (GeoJSON Point: [lng, lat])
      const origin: [number, number] | null = session.start_coords?.coordinates
        ? [session.start_coords.coordinates[0], session.start_coords.coordinates[1]]
        : null;

      const destination: [number, number] | null = session.end_coords?.coordinates
        ? [session.end_coords.coordinates[0], session.end_coords.coordinates[1]]
        : null;

      if (!origin || !destination) {
        console.warn("⚠️ No se pudieron obtener las coordenadas de origen o destino de la sesión.", { origin, destination });
        return;
      }

      // 3. Procesar las paradas de la ruta
      // Nota: Si cambiaste a geometry, asegúrate de que stop.coords tenga {longitude, latitude} o usa la estructura de GeoJSON
      const stopWaypoints: [number, number][] = stopsData
        .filter(s => s.coords && (s.coords.longitude !== undefined || (s.coords as any).coordinates))
        .map(s => {
          // Soporte tanto para objeto {lat, lng} como para GeoJSON [lng, lat]
          if ((s.coords as any).coordinates) {
            return [(s.coords as any).coordinates[0], (s.coords as any).coordinates[1]];
          }
          return [s.coords.longitude, s.coords.latitude];
        });

      // 4. Procesar los puntos de encuentro de los pasajeros
      const meetingWaypoints: [number, number][] = meetingPoints
        .filter(mp => mp.coords && (mp.coords.longitude !== undefined || (mp.coords as any).coordinates))
        .map(mp => {
          if ((mp.coords as any).coordinates) {
            return [(mp.coords as any).coordinates[0], (mp.coords as any).coordinates[1]];
          }
          return [mp.coords.longitude, mp.coords.latitude];
        });

      // Unir todos los puntos intermedios
      const allWaypoints = [...stopWaypoints, ...meetingWaypoints];

      // Ordenar los puntos intermedios por cercanía al origen para una ruta lógica
      const sortedWaypoints = allWaypoints.sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a[0] - origin[0], 2) + Math.pow(a[1] - origin[1], 2));
        const distB = Math.sqrt(Math.pow(b[0] - origin[0], 2) + Math.pow(b[1] - origin[1], 2));
        return distA - distB;
      });

      const allCoordinates: [number, number][] = [origin, ...sortedWaypoints, destination];

      // 5. Validar que no haya valores indefinidos en la lista final
      if (allCoordinates.some(c => c.includes(undefined as any) || c.includes(null as any))) {
        console.error("❌ Hay coordenadas inválidas en la lista de ruta:", allCoordinates);
        return;
      }

      const coordsString = allCoordinates.map((c) => c.join(",")).join(";");
      const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

      console.log("🗺️ Pidiendo ruta Mapbox:", coordsString);

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${accessToken}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;

        setRouteGeoJSON({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: route, properties: {} }],
        } as any);
      } else {
        console.warn("Map routes no pudo encontrar un camino exacto:", data.message || "Sin mensaje");
      }
    } catch (error) {
      console.error("❌ Error al obtener la ruta de Mapbox:", error);
    }
  };

  useEffect(() => {
    // Solo centrar automáticamente si el viaje acaba de activarse o es la primera vez que tenemos ubicación
    if (session?.status === "active" && driverLocation && !region) {
      cameraRef.current?.setCamera({
        centerCoordinate: [driverLocation.coords.longitude, driverLocation.coords.latitude],
        zoomLevel: 15,
        animationDuration: 1000,
      });
    }
  }, [session?.status]); // Quitamos driverLocation de las dependencias para evitar el snap constante

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
          timeInterval: 5000,
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
        },
      );
    })();

    return () => subscriber?.remove();
  }, []);

  useEffect(() => {
    // Solo intentamos trazar la ruta si tenemos al menos 2 paradas
    if (stopsData && stopsData.length >= 2) {
      fetchRouteMap();
    }
  }, [stopsData, meetingPoints]);

  const fetchPassengers = async () => {
    const { data, error } = await supabase
      .from("passenger_trip_sessions")
      .select("*")
      .eq("trip_session_id", Number(id))
      .in("status", ["joined", "pending_approval", "completed"])
      .is("rejected", false);

    if (error) {
      console.error("Error al obtener pasajeros:", error);
      return null;
    }
    return data as PassengerTripSession[];
  };

  const fetchSessionUsers = async (passengerSessions: PassengerTripSession[]) => {
    if (!passengerSessions.length) {
      setSessionUsers([]);
      return [];
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in('id', passengerSessions.map(p => p.passenger_id));

    if (error) {
      console.error("Error fetching session users:", error);
      return [];
    }

    // Fetch ratings for all these users
    const userIds = data.map(u => u.id);
    const ratingsMap = await ratingsService.getUsersRatings(userIds);

    const userData = data.map(u => ({
      ...(u as UserData),
      rating: ratingsMap[u.id]?.rating || 0,
      rating_count: ratingsMap[u.id]?.count || 0
    }));

    setSessionUsers(userData);
    return userData;
  };

  const fetchMeetingPoints = async () => {
    const { data, error } = await supabase
      .from("passenger_meeting_points")
      .select("*")
      .eq("trip_session_id", Number(id));

    if (error) {
      console.error("Error fetching meeting points:", error);
      return;
    }

    const formattedData = (data || []).map((mp: any) => ({
      ...mp,
      coords: {
        latitude: Number(mp.coords?.coordinates?.[1] ?? mp.coords?.latitude ?? 0),
        longitude: Number(mp.coords?.coordinates?.[0] ?? mp.coords?.longitude ?? 0),
      }
    }));

    setMeetingPoints(formattedData as MeetingPoint[]);
  };

  useEffect(() => {
    // 1. Carga inicial
    const loadInitialPassengers = async () => {
      const data = await fetchPassengers();
      if (data) {
        setPassengers(data);
        fetchSessionUsers(data);
      }
    };

    loadInitialPassengers();

    // 2. Suscripción en tiempo real
    const channel = supabase
      .channel(`passengers-in-session-${id}`) // Canal único por viaje
      .on(
        "postgres_changes",
        {
          event: "*", // Escuchamos INSERT y UPDATE (por si cambian de estado)
          schema: "public",
          table: "passenger_trip_sessions",
          filter: `trip_session_id=eq.${id}`, // Filtramos solo para este viaje
        },
        (payload) => {
          console.log("Cambio detectado en pasajeros:", payload);

          // Opción recomendada: Refrescar la lista completa para asegurar filtros
          fetchPassengers().then((data) => {
            if (data) {
              setPassengers(data);
              fetchSessionUsers(data);
              // Also refresh meeting points when passengers change
              fetchMeetingPoints();
            }
          });
        },
      )
      .subscribe();

    // 3. Limpieza al desmontar el componente
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Fetch meeting points when passengers change
  useEffect(() => {
    if (passengers.length > 0) {
      fetchMeetingPoints();
    }
  }, [passengers]);

  // Build waypoints when session, stops, or meeting points change
  useEffect(() => {
    if (session && stopsData.length > 0) {
      buildWaypoints();
    }
  }, [session, stopsData, meetingPoints]);

  // Detect current waypoint when driver location or waypoints change
  useEffect(() => {
    detectCurrentWaypoint();
  }, [driverLocation, waypoints]);

  // Función para cambiar la ubicación y centrar la cámara de Mapbox
  const changeLocation = (lat: number, lng: number) => {
    const safeLat = Number(lat);
    const safeLng = Number(lng);

    if (isNaN(safeLat) || isNaN(safeLng) || (safeLat === 0 && safeLng === 0)) {
      console.warn("⚠️ Intentando mover la cámara a una ubicación inválida:", { lat, lng });
      return;
    }

    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [safeLng, safeLat], // Mapbox usa [lng, lat]
        zoomLevel: 15,
        animationDuration: 1000,
      });
      // Actualiza la región también para mantener el estado coherente
      setRegion((prev) =>
        prev ? { ...prev, latitude: safeLat, longitude: safeLng } : null,
      );
    }
  };

  const toggleStops = () => {
    if (showStops) {
      setShowStops(false);
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
      <View style={{ flex: 1 }}>
        {/* Mapa de Mapbox - Siempre montado */}
        <Mapbox.MapView
          ref={mapRef}
          styleURL={Mapbox.StyleURL.Street}
          style={StyleSheet.absoluteFillObject}
          localizeLabels={true}
        >
          {/* Cámara inicial */}
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [-79.9424633, -2.2035283],
              zoomLevel: 15,
            }}
          />

          {region && !user?.driver_mode && (
            <UserLocation
              visible={true}
              showsUserHeadingIndicator={true}
              minDisplacement={5}
            />
          )}

            {driverLocation?.coords ? (
              <MarkerView
                id="driver"
                coordinate={[
                  isNaN(Number(driverLocation.coords.longitude)) ? 0 : Number(driverLocation.coords.longitude),
                  isNaN(Number(driverLocation.coords.latitude)) ? 0 : Number(driverLocation.coords.latitude)
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="car-sport" size={30} color="#000D3A" />
                </View>
              </MarkerView>
            ) : null}



            {/* Dibuja la Ruta */}
            {sessionLoaded && routeGeoJSON && (
              <ShapeSource id="routeSource" shape={routeGeoJSON}>
                <LineLayer
                  id="routeLine"
                  style={{
                    lineColor: "#FCA311",
                    lineWidth: 6,
                    lineJoin: "round",
                    lineCap: "round",
                  }}
                />
              </ShapeSource>
            )}

            {sessionLoaded && session?.start_coords?.coordinates ? (() => {
              const lng = Number(session.start_coords.coordinates[0]);
              const lat = Number(session.start_coords.coordinates[1]);
              if (isNaN(lng) || isNaN(lat) || (lng === 0 && lat === 0)) return null;
              
              return (
                <MarkerView
                  id="start-point"
                  coordinate={[lng, lat]}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                    <View className="items-center">
                      <View className="bg-white p-1 rounded-full shadow-md">
                        <Ionicons name="flag" size={24} color="#22c55e" />
                      </View>
                      <Text className="bg-white/80 px-1 text-[8px] font-bold">Inicio</Text>
                    </View>
                  </View>
                </MarkerView>
              );
            })() : null}

            {/* Marcadores para las Paradas */}
            {sessionLoaded && stopsData?.map((stop, index) => {
              const coords = stop.coords as any;
              const lng = Number(coords?.longitude ?? coords?.coordinates?.[0] ?? 0);
              const lat = Number(coords?.latitude ?? coords?.coordinates?.[1] ?? 0);
              
              if (isNaN(lng) || isNaN(lat) || (lng === 0 && lat === 0)) return null;

              return (
                <MarkerView
                  key={`stop-${index}`}
                  id={`stop-${index}`}
                  coordinate={[lng, lat]}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons
                      name="location-sharp"
                      size={24}
                      color={Colors.light.primary}
                    />
                  </View>
                </MarkerView>
              );
            })}

            {/* Meeting Point Markers */}
            {sessionLoaded && meetingPoints?.map((mp, index) => {
              const coords = mp.coords as any;
              const lng = Number(coords?.longitude ?? coords?.coordinates?.[0] ?? 0);
              const lat = Number(coords?.latitude ?? coords?.coordinates?.[1] ?? 0);

              if (isNaN(lng) || isNaN(lat) || (lng === 0 && lat === 0)) return null;

              return (
                <MarkerView
                  key={`meeting-${mp.passenger_id}-${index}`}
                  id={`meeting-${mp.passenger_id}-${index}`}
                  coordinate={[lng, lat]}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                    <View className="items-center">
                      <View className="bg-[#000D3A] p-1 rounded-full shadow-md">
                        <Ionicons name="person" size={18} color="white" />
                      </View>
                      <Text className="bg-white/80 px-1 text-[8px] font-bold">Pasajero</Text>
                    </View>
                  </View>
                </MarkerView>
              );
            })}

            {sessionLoaded && session?.end_coords?.coordinates ? (() => {
              const lng = Number(session.end_coords.coordinates[0]);
              const lat = Number(session.end_coords.coordinates[1]);
              if (isNaN(lng) || isNaN(lat) || (lng === 0 && lat === 0)) return null;

              return (
                <MarkerView
                  id="end-point"
                  coordinate={[lng, lat]}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                    <View className="items-center">
                      <View className="bg-white p-1 rounded-full shadow-md">
                        <Ionicons name="location" size={24} color="#ef4444" />
                      </View>
                      <Text className="bg-white/80 px-1 text-[8px] font-bold">Destino</Text>
                    </View>
                  </View>
                </MarkerView>
              );
            })() : null}
        </Mapbox.MapView>

        {/* Overlay de Carga */}
        {!region && (
          <View className="absolute inset-0 bg-white/80 items-center justify-center z-[60]">
            <Text className="font-bold text-slate-500">Cargando ubicación...</Text>
          </View>
        )}

        {/* Botón de Atrás */}
        <View
          pointerEvents="box-none"
          className="absolute top-8 left-[14px] z-50"
        >
          <Pressable
            onPress={() => navigation.goBack()}
            className="p-2 rounded-full shadow-lg bg-white/70"
          >
            <Ionicons
              name="arrow-back"
              size={34}
              color={Colors.light.primary}
            />
          </Pressable>
        </View>

          {/* Botón para Mostrar/Ocultar Paradas */}
          <View
            pointerEvents="box-none"
            className="absolute top-8 right-[14px] z-50"
          >
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
            className="absolute top-0 right-0 w-1/2 h-full z-40"
          >
            <LinearGradient
              colors={[
                "transparent",
                "rgba(255,255,255,0.7)",
                "rgba(255,255,255,0.95)",
              ]}
              style={{ flex: 1, paddingTop: 80, paddingHorizontal: 20 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View className="relative flex-1 overflow-hidden rounded-2xl">
                <ScrollView showsVerticalScrollIndicator={false}>
                  {(() => {
                    const firstUnvisitedIndex = waypoints.findIndex(w => {
                      if (w.type === 'origin') return false; // El inicio no cuenta como pendiente de visita una vez arrancado
                      return !(w.status === 'completed' || w.status === 'visited' || w.status === 'dropped_off');
                    });

                    return waypoints.map((waypoint, index) => {
                      const isVisited = waypoint.status === 'completed' || waypoint.status === 'visited' || waypoint.status === 'dropped_off' || (waypoint.type === 'origin');
                      const isCurrent = index === firstUnvisitedIndex;
                      const isNext = index === firstUnvisitedIndex + 1;

                      return (
                        <View key={waypoint.id} className="flex-row mb-6">
                        {/* Progress Line */}
                        <View className="items-center w-10">
                          {/* Dot/Icon */}
                          <View
                            className={`w-8 h-8 rounded-full items-center justify-center ${isVisited
                              ? "bg-green-500"
                              : isCurrent
                                ? "bg-blue-500"
                                : "bg-slate-300"
                              }`}
                          >
                            {isVisited ? (
                              <Ionicons name="checkmark" size={16} color="white" />
                            ) : isCurrent ? (
                              <Ionicons
                                name={
                                  waypoint.type === "meeting_point"
                                    ? "person"
                                    : "location"
                                }
                                size={16}
                                color="white"
                              />
                            ) : (
                              <View className="w-3 h-3 rounded-full bg-white" />
                            )}
                          </View>

                          {/* Connecting Line */}
                          {index < waypoints.length - 1 && (
                            <View
                              className={`w-1 flex-1 mt-1 ${isVisited ? "bg-green-500" : "bg-slate-300"
                                }`}
                            />
                          )}
                        </View>

                        {/* Waypoint Info */}
                        <Pressable
                          onPress={() => {
                            if (!isVisited) {
                              setWaypointToCheckIn(waypoint);
                              setCheckInModalVisible(true);
                            }
                            changeLocation(waypoint.coords.latitude, waypoint.coords.longitude);
                          }}
                          className="flex-1"
                        >
                          <View
                            className={`${isCurrent ? "bg-blue-50 p-2 rounded-lg" : ""}`}
                          >
                            {/* Type Badge */}
                            <View className="flex-row items-center mb-1">
                              {waypoint.type === "origin" && (
                                <Text className="text-xs font-bold text-green-600">
                                  INICIO
                                </Text>
                              )}
                              {waypoint.type === "destination" && (
                                <Text className="text-xs font-bold text-red-600">
                                  DESTINO
                                </Text>
                              )}
                              {waypoint.type === "stop" && (
                                <Text className="text-xs font-bold text-purple-600">
                                  PARADA
                                </Text>
                              )}
                              {waypoint.type === "meeting_point" && (
                                <Text className="text-xs font-bold text-blue-600">
                                  PASAJERO
                                </Text>
                              )}
                              {isCurrent && (
                                <Text className="text-xs font-bold text-blue-600 ml-2">
                                  ← ACTUAL
                                </Text>
                              )}
                              {isNext && (
                                <Text className="text-xs font-bold text-orange-600 ml-2">
                                  SIGUIENTE
                                </Text>
                              )}
                            </View>

                            {/* Location */}
                            <Text
                              className={`font-bold ${isVisited
                                ? "text-slate-400 line-through"
                                : isCurrent
                                  ? "text-blue-800"
                                  : "text-slate-800"
                                }`}
                            >
                              {waypoint.location.split(",")[0]}
                            </Text>
                            <Text
                              className={`text-sm ${isVisited ? "text-slate-300" : "text-slate-500"
                                }`}
                            >
                              {waypoint.location.split(",").slice(1).join(",")}
                            </Text>
                          </View>
                        </Pressable>
                        </View>
                      );
                    });
                  })()}
                </ScrollView>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Bottom Sheet */}
          <BottomSheetRouteDetail
            passengers={passengers}
            users={sessionUsers}
            session={session}
            onFinishTrip={handleFinishTrip}
            onLeaveTrip={handleLeaveTrip}
            onPassengerPress={(pId) => {
              const p = passengers.find(px => px.passenger_id === pId);
              if (p?.status === 'pending_approval') {
                setPassengerIdToProcess(pId);
                setModalVisible(true);
              } else if (p?.status === 'joined') {
                setDropOffTitle("Finalizar viaje para pasajero");
                setDropOffModalVisible(true);
              }
            }}
            distanceRemaining={distanceToNextPoint}
          />

          <PassengerActionModal
            visible={modalVisible}
            passengerId={passengerIdToProcess}
            tripSessionId={Number(id)}
            onClose={() => {
              setModalVisible(false);
              setPassengerIdToProcess(null);
            }}
            onActionComplete={() => {
              fetchPassengers().then(data => {
                if (data) setPassengers(data);
              });
            }}
          />

          <WaypointCheckInModal
            visible={checkInModalVisible}
            waypoint={waypointToCheckIn}
            onConfirm={handleWaypointCheckIn}
            onClose={() => {
              setCheckInModalVisible(false);
              setWaypointToCheckIn(null);
            }}
          />

          <PassengerDropOffModal
            visible={dropOffModalVisible}
            passengers={passengers}
            users={sessionUsers}
            title={dropOffTitle}
            onConfirm={handleDropOffPassengers}
            onClose={() => setDropOffModalVisible(false)}
          />
      <DriverRatingListModal
        visible={driverRatingModalVisible}
        onClose={() => {
          setDriverRatingModalVisible(false);
          router.replace("/(tabs)/home");
        }}
        passengers={sessionUsers.filter(u =>
          passengers.some(p => p.passenger_id === u.id && (p.status === 'joined' || p.status === 'completed'))
        )}
        onSubmit={async (ratings) => {
          try {
            await ratingsService.saveMultipleRatings(
              ratings.map(r => ({
                trip_session_id: Number(id),
                rater_id: user?.id || '',
                ratee_id: r.passenger_id,
                rating: r.rating,
                comment: r.comment
              }))
            );
            Alert.alert("Éxito", "¡Gracias por tus calificaciones!");
          } catch (error) {
            console.error("Error saving ratings:", error);
            throw error;
          }
        }}
      />
    </View>
  </GestureHandlerRootView>
  );
}

// Estilos necesarios para Mapbox (aunque Tailwind se usa para el resto)
const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
