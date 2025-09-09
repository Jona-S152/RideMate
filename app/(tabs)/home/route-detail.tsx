import BottomSheetRouteDetail from "@/components/BottomSheetRouteDetail";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import MapView, { Marker, Region } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function RouteDetail() {
  const navigation = useNavigation();
  
  const [region, setRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);
  const [showStops, setShowStops] = useState(false); 

  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const stops = [
    { title: 'Punto de partida', lugar: 'Mall del sur', recent: false, lng: -79.891686, lat: -2.208754 },
    { title: 'Parada reciente', lugar: 'E7th St', recent: true, lng: -79.915359, lat: -2.160998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.910359, lat: -2.140998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.910359, lat: -2.140998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.915359, lat: -2.160998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.910359, lat: -2.140998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.915359, lat: -2.160998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.910359, lat: -2.140998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.915359, lat: -2.160998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.910359, lat: -2.140998 },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false, lng: -79.878057, lat: -2.180671 },
  ]

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permiso denegado");
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
          mapRef.current?.animateToRegion(newRegion, 500);
        }
      );
    })();

    return () => subscriber?.remove();
  }, []);

  const changeLocation = (lat: number, lng: number) => {
    if (region && mapRef.current) {
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
    }
  };

  const toggleStops = () => {
    if (showStops) {
      setShowStops(false)
      // Ocultar → desliza hacia la izquierda
      Animated.parallel([
        // Ocultar panel
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH, // se va fuera de pantalla
          duration: 300,
          useNativeDriver: true,
        }),
        // Botón vuelve a la derecha
        Animated.timing(buttonAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setShowStops(true);
      // Mostrar → desliza hacia dentro
      Animated.parallel([
        // Mostrar panel
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH / 2, // ocupa la mitad derecha
          duration: 300,
          useNativeDriver: true,
        }),
        // Botón se corre hacia la izquierda, justo al borde del panel
        Animated.timing(buttonAnim, {
          toValue: SCREEN_WIDTH / 2, // mismo ancho del panel
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <GestureHandlerRootView className="flex-1">
      {region === null ? (
        <View className="flex-1 justify-center items-center">
          <Text>Cargando mapa...</Text>
        </View>
      ) : (
        <>
          {/* Mapa ocupa toda la pantalla */}
          <MapView
            ref={mapRef}
            mapType="standard"
            loadingEnabled
            className="flex-1"
            initialRegion={region}
            // onPress={(e) =>
            //   changeLocation(
            //     e.nativeEvent.coordinate.latitude,
            //     e.nativeEvent.coordinate.longitude
            //   )
            // }
          >
            <Marker
              coordinate={{
                latitude: region.latitude,
                longitude: region.longitude,
              }}
              title="Tu ubicación"
              description="Este es tu marcador"
            />

            <MapViewDirections
              origin={{ latitude: -2.208754, longitude: -79.891686 }}
              destination={{ latitude: -2.180671, longitude: -79.878057 }}
              apikey="AIzaSyD7QUc9cGMHwVNILiyJjJc0yvM5KVBZsEA"
              strokeWidth={6}
              waypoints={[
                { latitude: -2.160998, longitude: -79.915359 }, // Parada 1
                { latitude: -2.140998, longitude: -79.910359 }, // Parada 2
              ]}
              strokeColor={Colors.light.secondary}
            />

          </MapView>

          <View pointerEvents="box-none" className="absolute top-8 left-[14px] z-50">
            <Pressable onPress={() => navigation.goBack()} className="p-2 rounded-full shadow-lg">
              <Ionicons name="arrow-back" size={34} color={Colors.light.primary} />
            </Pressable>
          </View>

          <Animated.View style={{ transform: [{ translateX: Animated.multiply(buttonAnim, -1) }] }} pointerEvents="box-none" className="absolute top-8 right-[14px] z-50">
            {/* Contenedor del degradado */}
            <View className="absolute inset-0 flex-row w-40 h-12 rounded-full overflow-hidden">
              {/* Degradado principal de izquierda → derecha */}
              <LinearGradient
                colors={[Colors.light.secondary, "transparent", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </View>

            {/* Botón */}
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
          </Animated.View>

          {
            showStops && (
              <Animated.View style={{ transform: [{ translateX: slideAnim }], }} className="absolute top-0 right-0 w-1/2 h-1/2">
                <LinearGradient
                  colors={["transparent", "rgba(255,255,255,0.7)","rgba(255,255,255,0.95)" ]}
                  style={{ flex: 1, padding: 20 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View className="relative flex-1 overflow-hidden rounded-2xl pt-20">
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                    >
                      {stops.map((stop, index) => (
                        <View key={index} className="flex-row mb-6">
                          <View className="items-center w-10">
                            <ThemedView lightColor={ stop.recent ? Colors.light.textBlack : "#94a3b8"} className="w-3 h-3 rounded-full"/>

                            {index < stops.length - 1 && (
                              <View className="w-1 flex-1 bg-slate-300 mt-1"/>
                            )}
                          </View>

                          <View className="flex-start mb-6">
                            <Pressable onPress={() => changeLocation(stop.lat, stop.lng)}>
                              <ThemedText lightColor={ stop.recent ? Colors.light.textBlack : "#94a3b8"} className="font-bold">{stop.title}</ThemedText>
                              <ThemedText lightColor={ stop.recent ? Colors.light.textBlack : "#94a3b8"} className="text-sm">{stop.lugar}</ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      ))}               
                    </ScrollView>

                    {/* <LinearGradient
                      colors={["rgba(255,255,255,1)", "transparent"]}
                      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 40 }}
                    /> */}

                    {/* Gradiente abajo */}
                    {/* <LinearGradient
                      colors={["rgba(255,255,255,1)", "transparent"]}
                      style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 }}
                    /> */}
                  </View>
                </LinearGradient>

              </Animated.View>
            )
          }
          <BottomSheetRouteDetail />
        </>
      )}
    </GestureHandlerRootView>
  );
}
