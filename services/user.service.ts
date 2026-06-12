import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  last_name: string;
  is_driver: boolean;
  avatar_profile?: string;
  city_id?: number | null;
}

export interface ActivityItem {
  id: string;
  start_location: string;
  end_location: string;
  start_time: string;
  status: string;
  price?: number;
  passenger_count?: number;
  role: 'passenger' | 'driver';
}

export const userService = {
  /**
   * Fetches the full profile details for a user.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[userService.getUserProfile] Error:", error.message);
      throw error;
    }
    return data;
  },

  /**
   * Updates basic profile details for a user.
   */
  async updateProfile(userId: string, data: { name: string; last_name: string; email: string }): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({
        name: data.name,
        last_name: data.last_name,
        email: data.email,
      })
      .eq("id", userId);

    if (error) {
      console.error("[userService.updateProfile] Error:", error.message);
      throw error;
    }
  },

  /**
   * Updates user status to become a driver.
   */
  async becomeDriver(userId: string, data: { name: string; last_name: string }): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({
        is_driver: true,
        name: data.name,
        last_name: data.last_name,
      })
      .eq("id", userId);

    if (error) {
      console.error("[userService.becomeDriver] Error:", error.message);
      throw error;
    }
  },

  /**
   * Fetches the activity/trip history for a user, acting as either a passenger or driver.
   */
  async getActivityHistory(userId: string, role: 'passenger' | 'driver'): Promise<ActivityItem[]> {
    if (role === 'passenger') {
      const { data, error } = await supabase
        .from('passenger_route_history')
        .select('*')
        .eq('user_id', userId)
        .order('end_time', { ascending: false });

      if (error) {
        console.error("[userService.getActivityHistory] Error passenger history:", error.message);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: `h-${item.id}`,
        start_location: item.start_location,
        end_location: item.end_location,
        start_time: item.start_time,
        status: 'completed',
        price: 2,
        role: 'passenger'
      }));
    } else {
      const { data, error } = await supabase
        .from('passenger_route_history')
        .select('*')
        .eq('driver_id', userId)
        .order('end_time', { ascending: false });

      if (error) {
        console.error("[userService.getActivityHistory] Error driver history:", error.message);
        throw error;
      }

      // Group by trip_session_id to avoid duplicate trips in driver view
      const uniqueTripsMap = new Map<number, any>();
      (data || []).forEach((item: any) => {
        if (!uniqueTripsMap.has(item.trip_session_id)) {
          uniqueTripsMap.set(item.trip_session_id, {
            ...item,
            p_count: 0
          });
        }
        if (item.user_id !== item.driver_id) {
          const trip = uniqueTripsMap.get(item.trip_session_id);
          if (trip) trip.p_count += 1;
        }
      });

      return Array.from(uniqueTripsMap.values()).map((item: any) => ({
        id: `s-${item.trip_session_id}`,
        start_location: item.start_location,
        end_location: item.end_location,
        start_time: item.start_time,
        status: 'completed',
        price: 2,
        passenger_count: item.p_count,
        role: 'driver'
      }));
    }
  }
};
