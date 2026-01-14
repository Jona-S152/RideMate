import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';

export const TASK_NAME = 'DRIVER_LOCATION_BACKGROUND';

export const startBackgroundTracking = async (
  tripSessionId: number,
  driverId: string
) => {
  const fg = await Location.requestForegroundPermissionsAsync();
  const bg = await Location.requestBackgroundPermissionsAsync();

  if (fg.status !== 'granted' || bg.status !== 'granted') {
    throw new Error('Permisos de ubicación no concedidos');
  }

  // INSERT inicial
  const { error } = await supabase.from('driver_locations').insert({
    trip_session_id: tripSessionId,
    driver_id: driverId,
    latitude: 0,
    longitude: 0,
    recorded_at: new Date().toISOString(),
  });

  if (error) throw error;

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 10,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Viaje activo',
      notificationBody: 'Compartiendo ubicación',
    },
  });
};

export const stopBackgroundTracking = async (tripSessionId: number) => {
  const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);

  if (running) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }

  await supabase
    .from('driver_locations')
    .delete()
    .eq('trip_session_id', tripSessionId);
};
