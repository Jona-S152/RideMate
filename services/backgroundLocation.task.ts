import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { DRIVER_LOCATION_TASK } from './tracking.service';

const SUPABASE_URL = 'https://oxtdqniufdqjbadvocrs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94dGRxbml1ZmRxamJhZHZvY3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMzYyMDcsImV4cCI6MjA3NzkxMjIwN30.VAsjNfif-TviDL13XeWc1NWZP-CADmefUR_kfqYUFo8';

type LocationTaskData = {
  locations: Location.LocationObject[];
};

/**
 * Direct REST upsert to driver_locations using native fetch.
 * This bypasses the Supabase JS client entirely to avoid background context issues.
 */
async function upsertDriverLocation(
  tripSessionId: number,
  driverId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/driver_locations?on_conflict=trip_session_id`;

  const body = JSON.stringify({
    trip_session_id: tripSessionId,
    driver_id: driverId,
    coords: `POINT(${longitude} ${latitude})`,
    recorded_at: new Date().toISOString(),
  });

  console.log(`⬆️ [fetch] Upserting to driver_locations:`, body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  console.log(`✅ [fetch] Upsert success. HTTP ${response.status}`);
}

/**
 * Direct REST check of trip session status using native fetch.
 */
async function getTripStatus(tripSessionId: number): Promise<string | null> {
  const url = `${SUPABASE_URL}/rest/v1/trip_sessions?id=eq.${tripSessionId}&select=status&limit=1`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [fetch] Failed to get trip status. HTTP ${response.status}: ${errorText}`);
    return null;
  }

  const data: Array<{ status: string }> = await response.json();
  return data?.[0]?.status ?? null;
}

/**
 * Direct REST delete of driver_locations row using native fetch.
 */
async function clearDriverLocation(tripSessionId: number): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/driver_locations?trip_session_id=eq.${tripSessionId}`;

  await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  console.log(`🗑️ [fetch] driver_locations cleared for trip ${tripSessionId}`);
}

TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }) => {
  console.log('🟢 TASK EXECUTED', new Date().toISOString());

  if (error) {
    console.error('❌ Task error:', error);
    return;
  }

  if (!data) {
    console.log('⚠️ No data in task');
    return;
  }

  // 1. Validate ACTIVE_TRIP in AsyncStorage
  const raw = await AsyncStorage.getItem('ACTIVE_TRIP');
  if (!raw) {
    console.log('⚠️ No ACTIVE_TRIP in AsyncStorage. Stopping task...');
    try { await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK); } catch (e) {}
    return;
  }

  let tripSessionId: number;
  let driverId: string;

  try {
    const parsed = JSON.parse(raw);
    tripSessionId = parsed.tripSessionId;
    driverId = parsed.driverId;
    console.log('📌 ACTIVE_TRIP loaded:', { tripSessionId, driverId });
  } catch (parseErr) {
    console.error('❌ Failed to parse ACTIVE_TRIP:', parseErr);
    return;
  }

  if (!tripSessionId || !driverId) {
    console.error('❌ tripSessionId or driverId is missing');
    return;
  }

  // 2. Fail-safe: check trip status asynchronously (non-blocking)
  getTripStatus(tripSessionId)
    .then(async (status) => {
      console.log(`🚗 Trip ${tripSessionId} status check: ${status}`);
      if (status === null || status === 'completed' || status === 'cancelled') {
        console.log(`🛑 Trip is ${status ?? 'not found'}. Stopping tracking.`);
        try { await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK); } catch (e) {}
        await AsyncStorage.removeItem('ACTIVE_TRIP');
        await clearDriverLocation(tripSessionId);
      }
    })
    .catch((err) => {
      console.error('❌ Error checking trip status in background:', err);
    });

  // 3. Extract latest location
  const { locations } = data as LocationTaskData;
  const location = locations[locations.length - 1];
  if (!location) {
    console.log('⚠️ No location object in task data');
    return;
  }

  const { latitude, longitude } = location.coords;
  console.log(`📍 Location: lat=${latitude}, lng=${longitude}`);

  // 4. Upsert to Supabase via direct fetch (no Supabase JS client)
  try {
    await upsertDriverLocation(tripSessionId, driverId, latitude, longitude);
  } catch (upsertErr: any) {
    console.error('❌ Upsert failed:', upsertErr?.message ?? upsertErr);
  }
});
