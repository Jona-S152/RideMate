import BottomSheetRouteDetail from "@/components/BottomSheetRouteDetail";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import AntDesign from '@expo/vector-icons/AntDesign';
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import MapView, { Marker, Region } from "react-native-maps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function RouteDetail() {
  const [region, setRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);
  const [showStops, setShowStops] = useState(false); 

  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  const stops = [
    { title: 'Punto de partida', lugar: 'Mall del sur', recent: false },
    { title: 'Parada reciente', lugar: 'E7th St', recent: true },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
    { title: 'Próxima parada', lugar: 'Vine St', recent: false },
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
    console.log('Presionado');
    if (showStops) {
      // Ocultar → desliza hacia la izquierda
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowStops(false));
    } else {
      setShowStops(true);
      // Mostrar → desliza hacia dentro
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
            showsUserLocation
            className="flex-1"
            initialRegion={region}
            onPress={(e) =>
              changeLocation(
                e.nativeEvent.coordinate.latitude,
                e.nativeEvent.coordinate.longitude
              )
            }
          >
            <Marker
              coordinate={{
                latitude: region.latitude,
                longitude: region.longitude,
              }}
              title="Tu ubicación"
              description="Este es tu marcador"
            />
          </MapView>

          <View pointerEvents="box-none" className="absolute top-8 left-[14px] z-50">
            <Pressable onPress={toggleStops} className="p-2 rounded-full shadow-lg">
              {showStops ? <AntDesign name="left" size={36} color="black" /> : <AntDesign name="right" size={36} color="black" />}
            </Pressable>
          </View>

          {
            showStops && (
              <Animated.View style={{ transform: [{ translateX: slideAnim }], }} className="absolute top-0 left-0 w-1/2 h-1/2">
                <LinearGradient
                  colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.7)", "transparent"]}
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
                            <ThemedText lightColor={ stop.recent ? Colors.light.textBlack : "#94a3b8"} className="font-bold">{stop.title}</ThemedText>
                            <ThemedText lightColor={ stop.recent ? Colors.light.textBlack : "#94a3b8"} className="text-sm">{stop.lugar}</ThemedText>
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
