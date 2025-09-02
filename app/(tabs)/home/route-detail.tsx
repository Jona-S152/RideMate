import BottomSheetRouteDetail from "@/components/BottomSheetRouteDetail";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { Marker, Region } from "react-native-maps";

export default function RouteDetail() {
  const [region, setRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);

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

            <BottomSheetRouteDetail />
        </>
      )}
    </GestureHandlerRootView>
  );
}
