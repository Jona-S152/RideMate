import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/services/tracking.service';
import { create } from 'zustand';

interface TripTrackingState {
  isTracking: boolean;
  tripSessionId: number | null;
  startTracking: (tripId: number, driverId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
}

export const useTripTrackingStore = create<TripTrackingState>((set, get) => ({
  isTracking: false,
  tripSessionId: null,

  startTracking: async (tripId, driverId) => {
    if (get().isTracking) return;

    await startBackgroundTracking(tripId, driverId);

    set({
      isTracking: true,
      tripSessionId: tripId,
    });
  },

  stopTracking: async () => {
    const { tripSessionId } = get();
    if (!tripSessionId) return;

    await stopBackgroundTracking(tripSessionId);

    set({
      isTracking: false,
      tripSessionId: null,
    });
  },
}));
