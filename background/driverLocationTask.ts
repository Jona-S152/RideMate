import { supabase } from '@/lib/supabase';
import * as TaskManager from 'expo-task-manager';

const TASK_NAME = 'DRIVER_LOCATION_BACKGROUND';

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('BG TASK ERROR:', error);
    return;
  }

  const { locations, tripSessionId } = data as any;

  if (!locations || !tripSessionId) return;

  const { latitude, longitude } = locations[0].coords;

  const { error: updateError } = await supabase
    .from('driver_locations')
    .update({
      latitude,
      longitude,
      recorded_at: new Date().toISOString(),
    })
    .eq('trip_session_id', tripSessionId);

  if (updateError) {
    console.error('BG UPDATE ERROR:', updateError);
  }
});
