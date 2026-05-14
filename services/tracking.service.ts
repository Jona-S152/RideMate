import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export const DRIVER_LOCATION_TASK = 'DRIVER_LOCATION_BACKGROUND';

const checkBatteryOptimization = async () => {
  if (Platform.OS === 'android') {
    Alert.alert(
      "Acción Requerida",
      "Para que el rastreo no se detenga al bloquear el celular, busca RideMate en la siguiente lista y selecciona 'Sin restricción'.",
      [
        {
          text: "Configurar",
          onPress: () => IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
          )
        },
        { text: "Cancelar", style: "cancel" }
      ]
    );
  }
};

export const startBackgroundTracking = async (
  tripSessionId: number,
  driverId: string
) => {
  console.log("START BACKGROUND TRACKING: ", { tripSessionId, driverId });

  // 1. Obtener permisos de forma eficiente
  let { status: fgStatus } = await Location.getForegroundPermissionsAsync();
  let { status: bgStatus } = await Location.getBackgroundPermissionsAsync();

  if (fgStatus !== 'granted' || bgStatus !== 'granted') {
    fgStatus = (await Location.requestForegroundPermissionsAsync()).status;
    bgStatus = (await Location.requestBackgroundPermissionsAsync()).status;

    if (fgStatus !== 'granted' || bgStatus !== 'granted') {
      throw new Error('Permisos de ubicación no concedidos');
    }
  }

  await AsyncStorage.setItem(
    'ACTIVE_TRIP',
    JSON.stringify({ tripSessionId, driverId })
  );

  try {
    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
      pausesUpdatesAutomatically: false,
      // @ts-ignore
      foregroundService: {
        notificationTitle: 'RideMate: Viaje en curso',
        notificationBody: 'Tu ubicación se está compartiendo con los pasajeros.',
        // @ts-ignore
        killServiceOnTerminate: false,
      },
    });
    console.log("Location updates async started");

    // 4. Ejecutar optimización de batería DESPUÉS de iniciar
    setTimeout(() => {
      checkBatteryOptimization();
    }, 1000);

  } catch (err) {
    console.error("Error al iniciar location updates:", err);
    throw err;
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  console.log("Task running:", isRunning);
};

export const stopBackgroundTracking = async (tripSessionId: number) => {
  try {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    console.log("✅ Tracking detenido");
  } catch (e) {
    console.log("⚠️ La tarea no estaba corriendo o ya se detuvo");
  }

  await AsyncStorage.removeItem('ACTIVE_TRIP');

  await supabase
    .from('driver_locations')
    .delete()
    .eq('trip_session_id', tripSessionId);
};
