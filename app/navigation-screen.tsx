import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NavigationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    lat: string;
    lng: string;
    title: string;
    destLat: string;
    destLng: string;
    destName: string;
    startLat: string;
    startLng: string;
  }>();

  const destination = {
    latitude: parseFloat(params.destLat as string),
    longitude: parseFloat(params.destLng as string),
    title: params.destName as string || 'Destino',
  };

  const startCoords = {
    latitude: parseFloat(params.startLat as string) || 0,
    longitude: parseFloat(params.startLng as string) || 0,
  };

  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [distance, setDistance] = useState<string>('--');
  const [duration, setDuration] = useState<string>('--');
  const [instruction, setInstruction] = useState<string>('Obteniendo ruta...');
  const [hasFirstLocation, setHasFirstLocation] = useState(false);
  const [heading, setHeading] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);
  const [snappedCoords, setSnappedCoords] = useState<[number, number] | null>(null);
  const [lastRefetchTime, setLastRefetchTime] = useState(0);
  const [isRefetching, setIsRefetching] = useState(false);
  const [smoothHeading, setSmoothHeading] = useState(0);
  const [eta, setEta] = useState<string>('--:--');
  const [stepDistance, setStepDistance] = useState<string>('');
  const [nextStepCoords, setNextStepCoords] = useState<[number, number] | null>(null);
  const timeoutRef = useRef<any>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const RE_ROUTE_THRESHOLD = 0.0003; // Aproximadamente 30 metros en coordenadas decimales

  // Efecto para mover la cámara de forma fluida siguiendo la ubicación y rotación
  React.useEffect(() => {
    if (isFollowing && snappedCoords && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: snappedCoords,
        heading: heading,
        animationDuration: 400, // Respuesta rápida al giro
      });
    }
  }, [snappedCoords, heading, isFollowing]);

  // Utility to find the closest point on the route (Snap to Route)
  const getSnappedPoint = (point: [number, number], coordinates: [number, number][]) => {
    if (!coordinates || coordinates.length < 2) return point;

    let minDistance = Infinity;
    let snapped = point;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];

      // Simple linear interpolation to find nearest point on segment
      const x = point[0], y = point[1];
      const x1 = p1[0], y1 = p1[1];
      const x2 = p2[0], y2 = p2[1];
      const dx = x2 - x1, dy = y2 - y1;

      if (dx === 0 && dy === 0) continue;

      const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
      let closest: [number, number];

      if (t < 0) closest = [x1, y1];
      else if (t > 1) closest = [x2, y2];
      else closest = [x1 + t * dx, y1 + t * dy];

      const dist = Math.sqrt(Math.pow(x - closest[0], 2) + Math.pow(y - closest[1], 2));
      if (dist < minDistance) {
        minDistance = dist;
        snapped = closest;
      }
    }
    return snapped;
  };


  const fetchRoute = async (userLat: number, userLng: number) => {
    if (isRefetching) return;
    
    if (!hasFirstLocation) {
      setHasFirstLocation(true);
    }

    try {
      setIsRefetching(true);
      const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${destination.longitude},${destination.latitude}?geometries=geojson&steps=true&banner_instructions=true&voice_instructions=true&access_token=${accessToken}&language=es`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteGeoJSON({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: route.geometry,
            properties: {},
          }],
        });

        // Info de distancia y tiempo
        const dist = route.distance > 1000
          ? (route.distance / 1000).toFixed(1) + ' km'
          : Math.round(route.distance) + ' m';
        const dur = Math.round(route.duration / 60) + ' min';

        setDistance(dist);
        setDuration(dur);

        // Calcular ETA
        const arrival = new Date(Date.now() + route.duration * 1000);
        const arrivalStr = arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        setEta(arrivalStr);

        // Lógica de Navegación: El banner debe mostrar la PRÓXIMA maniobra
        const steps = route.legs[0]?.steps;
        const leg = route.legs[0];
        
        if (steps && steps.length > 0) {
          const nextStep = steps.length > 1 ? steps[1] : steps[0];
          const currentStep = steps[0];

          // Estrategia de búsqueda de texto (Múltiples fallbacks)
          const bannerText = nextStep.bannerInstructions?.[0]?.primary?.text 
                          || currentStep.bannerInstructions?.[0]?.primary?.text
                          || nextStep.maneuver?.instruction 
                          || currentStep.maneuver?.instruction
                          || leg.summary
                          || `Hacia ${destination.title}`;
          
          setInstruction(bannerText);
          
          // La distancia al próximo paso
          const distToManeuver = currentStep.distance || 0;
          const sDist = distToManeuver > 1000
            ? (distToManeuver / 1000).toFixed(1) + ' km'
            : Math.round(distToManeuver) + ' m';
          setStepDistance(sDist);
          
          // Guardamos la coordenada de la maniobra
          if (nextStep.maneuver?.location) {
            setNextStepCoords(nextStep.maneuver.location);
          }
        } else if (leg.summary) {
          setInstruction(leg.summary);
        }

        setLastRefetchTime(Date.now());
      }
    } catch (error) {
      console.error('Error fetching navigation route:', error);
    } finally {
      setIsRefetching(false);
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Dark}
        logoEnabled={false}
        attributionEnabled={false}
        onRegionIsChanging={(event) => {
          if (event.properties.isUserInteraction) {
            setIsFollowing(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              setIsFollowing(true);
            }, 5000);
          }
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          followUserLocation={false}
          centerCoordinate={isFollowing ? (snappedCoords || undefined) : undefined}
          heading={isFollowing ? smoothHeading : undefined}
          zoomLevel={16}
          pitch={60}
          animationDuration={1000}
        />

        <Mapbox.UserLocation
          onUpdate={(location) => {
            if (location.coords) {
              const realCoords: [number, number] = [location.coords.longitude, location.coords.latitude];
              const newRawHeading = location.coords.heading || location.coords.course || 0;

              // Filtro de suavizado para el giro (Más responsivo a petición del usuario)
              setSmoothHeading(prev => {
                const alpha = 0.4; // Aumentado de 0.15 para que sea más sensible al giro del celular
                let diff = newRawHeading - prev;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                return prev + alpha * diff;
              });

              let needsRecalculate = !routeGeoJSON;
              let currentSnapped = realCoords;

              if (routeGeoJSON?.features[0]?.geometry?.coordinates) {
                const routeCoords = routeGeoJSON.features[0].geometry.coordinates;
                currentSnapped = getSnappedPoint(realCoords, routeCoords);

                const deviation = Math.sqrt(Math.pow(realCoords[0] - currentSnapped[0], 2) + Math.pow(realCoords[1] - currentSnapped[1], 2));

                if (deviation > RE_ROUTE_THRESHOLD && (Date.now() - lastRefetchTime > 10000)) {
                  needsRecalculate = true;
                }

                setSnappedCoords(currentSnapped);
              } else {
                setSnappedCoords(realCoords);
              }

              // Calcular distancia al siguiente paso en tiempo real
              if (nextStepCoords) {
                const distToStep = Math.sqrt(Math.pow(realCoords[0] - nextStepCoords[0], 2) + Math.pow(realCoords[1] - nextStepCoords[1], 2)) * 111320; // Aprox metros
                const sDist = distToStep > 1000
                  ? (distToStep / 1000).toFixed(1) + ' km'
                  : Math.round(distToStep) + ' m';
                setStepDistance(sDist);
              }

              if (needsRecalculate) {
                fetchRoute(location.coords.latitude, location.coords.longitude);
              }

              setHeading(newRawHeading);
            }
          }}
          visible={false}
        />

        <Mapbox.Images
          images={{
            'nav-arrow': 'https://vjrqpzgqzrgmjpqrvqzv.supabase.co/storage/v1/object/public/assets/nav-arrow-blue.png'
          }}
        />

        {snappedCoords && (
          <Mapbox.ShapeSource
            id="userSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: snappedCoords,
              },
              properties: {},
            }}
          >

            {/* Círculo base blanco (Puck) */}
            <Mapbox.CircleLayer
              id="userPuckOuter"
              style={{
                circleColor: 'white',
                circleRadius: 14,
                circlePitchAlignment: 'map',
                circleStrokeColor: 'rgba(0,0,0,0.1)',
                circleStrokeWidth: 1,
              }}
            />
            {/* Círculo interior azul */}
            <Mapbox.CircleLayer
              id="userPuckInner"
              style={{
                circleColor: '#3B82F6',
                circleRadius: 10,
                circlePitchAlignment: 'map',
              }}
            />
            {/* Flecha de dirección */}
            <Mapbox.SymbolLayer
              id="userArrowLayer"
              style={{
                iconImage: 'nav-arrow',
                iconSize: 0.12,
                iconRotate: heading,
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
                iconRotationAlignment: 'map',
              }}
            />
          </Mapbox.ShapeSource>
        )}



        {routeGeoJSON && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <Mapbox.LineLayer
              id="routeLayer"
              style={{
                lineColor: Colors.dark.secondary,
                lineWidth: 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Solo mostramos el marcador del destino actual de este segmento */}
        <Mapbox.PointAnnotation
          id="destination"
          coordinate={[destination.longitude, destination.latitude]}
        >
          <View style={styles.destinationMarker}>
            <Ionicons name="location" size={24} color="#EF4444" />
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>

      {/* Header con instrucciones */}
      <SafeAreaView style={styles.headerContainer}>
        <LinearGradient
          colors={[Colors.dark.background, 'rgba(0,10,28,0.8)']}
          style={styles.instructionBanner}
        >
          <View style={styles.instructionIcon}>
            <Ionicons name="arrow-up-outline" size={32} color="white" />
          </View>
          <View style={styles.instructionTextContainer}>
            <Text 
                style={styles.instructionTitle} 
                numberOfLines={2} 
                ellipsizeMode="tail"
            >
                {instruction || 'Sigue la ruta'}
            </Text>
            <Text style={styles.instructionSubtitle}>en {stepDistance}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* Footer con info de llegada */}
      <View style={styles.footer}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{duration}</Text>
            <Text style={styles.statLabel}>TIEMPO</Text>
          </View>
          <View style={[styles.statBox, styles.statBorder]}>
            <Text style={styles.statValue}>{distance}</Text>
            <Text style={styles.statLabel}>DISTANCIA</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{eta}</Text>
            <Text style={styles.statLabel}>LLEGADA</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => router.back()}
        >
          <Text style={styles.exitButtonText}>SALIR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  map: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  instructionIcon: {
    width: 50,
    height: 50,
    backgroundColor: Colors.dark.secondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  instructionSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: Colors.dark.background,
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
  },
  exitButton: {
    backgroundColor: Colors.dark.secondary,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
  },
  exitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  destinationMarker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowShadow: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
