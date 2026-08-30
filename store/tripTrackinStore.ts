import {
  markBatteryOptimizationPrompted,
  openBatteryOptimizationSettings,
  shouldPromptBatteryOptimization,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/services/tracking.service';
import { create } from 'zustand';

interface TripTrackingState {
  isTracking: boolean;
  tripSessionId: number | null;
  showBatteryModal: boolean;
  setShowBatteryModal: (show: boolean) => void;
  startTracking: (tripId: number, driverId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  configureBatteryOptimization: () => Promise<void>;
  dismissBatteryOptimization: () => Promise<void>;
}

export const useTripTrackingStore = create<TripTrackingState>((set, get) => ({
  isTracking: false,
  tripSessionId: null,
  showBatteryModal: false,

  setShowBatteryModal: (show: boolean) => set({ showBatteryModal: show }),

  startTracking: async (tripId, driverId) => {
    console.log("START TRACKING: ", { tripId, driverId, is_tracking: get().isTracking });
    if (get().isTracking) return;

    await startBackgroundTracking(tripId, driverId);

    set({
      isTracking: true,
      tripSessionId: tripId,
    });

    const needsBatteryPrompt = await shouldPromptBatteryOptimization();
    if (needsBatteryPrompt) {
      set({ showBatteryModal: true });
    }
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

  configureBatteryOptimization: async () => {
    await openBatteryOptimizationSettings();
    set({ showBatteryModal: false });
  },

  dismissBatteryOptimization: async () => {
    await markBatteryOptimizationPrompted();
    set({ showBatteryModal: false });
  },
}));
