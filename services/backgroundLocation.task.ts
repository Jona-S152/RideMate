import { tripService } from './trip.service';
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

    // Check if the user is authenticated
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
        console.log('User is logged out. Stopping background location task.');
        try {
            await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
        } catch (e) {}
        await AsyncStorage.removeItem('ACTIVE_TRIP');
        return;
    }

    const raw = await AsyncStorage.getItem('ACTIVE_TRIP');
    if (!raw) return;

    const { tripSessionId, driverId } = JSON.parse(raw);

    const { locations } = data as LocationTaskData;
    const location = locations[locations.length - 1];
    if (!location) return;

    const { latitude, longitude } = location.coords;

    // ✅ UPSERT REAL (Usando formato geometry)
    try {
      await tripService.updateDriverLocation(tripSessionId, driverId, latitude, longitude);
    } catch (err: any) {
        console.error('❌ Error upserting driver location:', err);
        // If the trip session does not exist (foreign key constraint violation code 23503), stop tracking
        if (err?.code === '23503' || String(err).includes('23503') || String(err).includes('violates foreign key constraint')) {
            console.log('Trip session no longer exists. Stopping background tracking...');
            try {
                await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
            } catch (e) {}
            await AsyncStorage.removeItem('ACTIVE_TRIP');
        }
    }
});
