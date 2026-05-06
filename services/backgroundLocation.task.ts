import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { DRIVER_LOCATION_TASK } from './tracking.service';

type LocationTaskData = {
  locations: Location.LocationObject[];
};

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    console.log('🟢 TASK EXECUTED', new Date().toISOString());
    if (error) {
        console.error('❌ Task error:', error);
        return;
    }

    console.log("DEFINE TASK: ", data);

    if (!data) return;

    const raw = await AsyncStorage.getItem('ACTIVE_TRIP');
    if (!raw) return;

    const { tripSessionId, driverId } = JSON.parse(raw);

    const { locations } = data as LocationTaskData;
    const location = locations[locations.length - 1];
    if (!location) return;

    const { latitude, longitude } = location.coords;

    // ✅ UPSERT REAL (Usando formato geometry)
    const { error: err } = await supabase.from('driver_locations').upsert(
      {
        trip_session_id: tripSessionId,
        driver_id: driverId,
        coords: `POINT(${longitude} ${latitude})`,
        recorded_at: new Date().toISOString(),
      },
      {
        onConflict: 'trip_session_id',
      }
    );

    if (err) {
        console.error('❌ Error upserting driver location:', err);
    }
});
