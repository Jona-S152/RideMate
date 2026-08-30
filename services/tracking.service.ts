import { tripService } from './trip.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const DRIVER_LOCATION_TASK = 'DRIVER_LOCATION_BACKGROUND';

export const shouldPromptBatteryOptimization = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    const hasPrompted = await AsyncStorage.getItem('BATTERY_OPTIMIZATION_PROMPTED');
    return hasPrompted !== 'true';
  } catch (e) {
    console.warn("Error reading battery optimization flag:", e);
    return false;
  }
};

export const markBatteryOptimizationPrompted = async () => {
  try {
    await AsyncStorage.setItem('BATTERY_OPTIMIZATION_PROMPTED', 'true');
  } catch (e) {}
};

export const openBatteryOptimizationSettings = async () => {
  await markBatteryOptimizationPrompted();
  if (Platform.OS === 'android') {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
      );
    } catch (e) {
      console.warn("Error opening battery optimization settings:", e);
    }
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

  // Stop any existing task before starting a fresh one to avoid 'task already registered' errors
  try {
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    if (alreadyRunning) {
      console.log("⚠️ Task already running, stopping it first...");
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    }
  } catch (stopErr) {
    console.warn("⚠️ Could not stop existing task (may not exist):", stopErr);
  }

  await AsyncStorage.setItem(
    'ACTIVE_TRIP',
    JSON.stringify({ tripSessionId, driverId })
  );
  console.log("✅ ACTIVE_TRIP saved:", { tripSessionId, driverId });

  try {
    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      // @ts-ignore
      foregroundService: {
        notificationTitle: 'RideMate: Viaje en curso',
        notificationBody: 'Tu ubicación se está compartiendo con los pasajeros.',
        // @ts-ignore
        killServiceOnTerminate: false,
      },
    });
    console.log("✅ Location updates async started");
  } catch (err) {
    console.error("❌ Error al iniciar location updates:", err);
    throw err;
  }

  const isRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  console.log("✅ Task running after start:", isRunning);
};

export const stopBackgroundTracking = async (tripSessionId: number) => {
  try {
    await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
    console.log("✅ Tracking detenido");
  } catch (e) {
    console.log("⚠️ La tarea no estaba corriendo o ya se detuvo");
  }

  await AsyncStorage.removeItem('ACTIVE_TRIP');

  await tripService.clearDriverLocation(tripSessionId);
};
