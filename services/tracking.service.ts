import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export const DRIVER_LOCATION_TASK  = 'DRIVER_LOCATION_BACKGROUND';

const checkBatteryOptimization = async () => {
  if (Platform.OS === 'android') {
    // Como la función directa de Expo a veces da problemas de tipos, 
    // lo mejor es informar al usuario y enviarlo a los ajustes.
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
    await checkBatteryOptimization();
  const fg = await Location.requestForegroundPermissionsAsync();
  const bg = await Location.requestBackgroundPermissionsAsync();

  console.log("PERMISOS: ", { fg_status: fg.status, bg_status: bg.status });

  if (fg.status !== 'granted' || bg.status !== 'granted') {
    throw new Error('Permisos de ubicación no concedidos');
  }

  await AsyncStorage.setItem(
    'ACTIVE_TRIP',
    JSON.stringify({ tripSessionId, driverId })
  );

try {
    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 3,
        pausesUpdatesAutomatically: false,
        deferredUpdatesInterval: 3000, // tiempo mínimo entre actualizaciones
        deferredUpdatesDistance: 3,   // distancia mínima entre actualizaciones
        foregroundService: {
            notificationTitle: 'Viaje activo',
            notificationBody: 'Compartiendo ubicación',
            // @ts-ignore
            killServiceOnTerminate: false,
        },
    });
    console.log("Location updates async started");
} catch (err) {
    console.error("Error al iniciar location updates:", err);
}

  // 🔹 Verificación si la task realmente empezó
  const isRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  console.log("Task running:", isRunning); // debería imprimir true
};

export const stopBackgroundTracking = async (tripSessionId: number) => {
    // Intentamos detenerla siempre, sin preguntar si está corriendo
    try {
        await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
        console.log("✅ Tracking detenido");
    } catch (e) {
        console.log("⚠️ La tarea no estaba corriendo o ya se detuvo");
    }
    
    await AsyncStorage.removeItem('ACTIVE_TRIP');
    
    // Limpiar base de datos
    await supabase
        .from('driver_locations')
        .delete()
        .eq('trip_session_id', tripSessionId);
};
