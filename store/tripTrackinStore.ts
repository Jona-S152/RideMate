import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";
import { create } from "zustand";

let subscription: Location.LocationSubscription | null = null;

interface TripTrackingState {
  isTracking: boolean;
  startTracking: (tripId: number, driverId: string) => Promise<void>;
  stopTracking: (tripId: number) => Promise<void>;
}

export const useTripTrackingStore = create<TripTrackingState>((set) => ({
  isTracking: false,

  startTracking: async (tripId, driverId) => {
      if (subscription) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("INICIO COMPARTIR UBICACIÓN REALTIME ", status);
    if (status !== "granted") return;

    // 1️⃣ INSERT inicial
    const {data, error} = await supabase.from("driver_locations").insert({
      trip_session_id: tripId,
      driver_id: driverId,
      latitude: 0,
      longitude: 0,
    });

    console.error("ERROR: ", error);

    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      async (location) => {
        const { latitude, longitude } = location.coords;
        console.log("ACTUALIZACION DE UBI: ", location.coords);
        console.log("FECHA DE ACTUALIZACIÓN: ", new Date().toISOString());

        // 2️⃣ UPDATE continuo
        await supabase
          .from("driver_locations")
          .update({
            latitude,
            longitude,
            recorded_at: new Date().toISOString(),
          })
          .eq("trip_session_id", tripId);
      }
    );

    set({ isTracking: true });
  },

  stopTracking: async (tripId) => {
    subscription?.remove();
    subscription = null;

    // 3️⃣ DELETE final
    await supabase
      .from("driver_locations")
      .delete()
      .eq("trip_session_id", tripId);

    set({ isTracking: false });
  },
}));
