import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  last_name: string;
  is_driver: boolean;
  avatar_profile?: string;
  city_id?: number | null;
  phone_number?: string;
}

export interface ActivityItem {
  id: string;
  trip_session_id: number;
  start_location: string;
  end_location: string;
  start_time: string;
  status: string;
  price: number;
  passenger_count: number;
  role: 'passenger' | 'driver';
}

export interface GetActivityHistoryOptions {
  userId: string;
  role: 'passenger' | 'driver';
  page?: number;
  limit?: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface ActivityHistoryPage {
  data: ActivityItem[];
  hasMore: boolean;
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
  async updateProfile(userId: string, data: { name: string; last_name: string; email: string; avatar_profile?: string, phone_number?: string }): Promise<boolean> {
    const updateData: any = {
      name: data.name,
      last_name: data.last_name,
      email: data.email,
      phone_number: data.phone_number,
    };
    
    if (data.avatar_profile !== undefined) {
      updateData.avatar_profile = data.avatar_profile;
    }

    const { data: result, error } = await supabase
      .rpc("update_user_profile", {user_id: userId, payload: updateData});

    if (error) {
      console.error("[userService.updateProfile] Error:", error.message);
      throw error;
    }

    return result;
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
   * Excludes in-progress ('active') and pending ('pending', 'pending_approval') trips.
   */
  async getActivityHistory({
    userId,
    role,
    page = 1,
    limit = 10,
    startDate = null,
    endDate = null,
  }: GetActivityHistoryOptions): Promise<ActivityHistoryPage> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const rangeStart = (safePage - 1) * safeLimit;
    const rangeEnd = rangeStart + safeLimit - 1;
    const startOfDay = startDate
      ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).toISOString()
      : null;
    const endOfDay = endDate
      ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).toISOString()
      : null;

    if (role === 'passenger') {
      // 1. Fetch from passenger_route_history for passenger user
      let historyQuery = supabase
        .from('passenger_route_history')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (startOfDay) historyQuery = historyQuery.gte('start_time', startOfDay);
      if (endOfDay) historyQuery = historyQuery.lte('start_time', endOfDay);
      const { data: historyData, error: historyError } = await historyQuery.range(rangeStart, rangeEnd);

      if (historyError) {
        console.error("[userService.getActivityHistory] Error passenger history:", historyError.message);
      }

      // 2. Fetch from passenger_trip_sessions for completed/cancelled/left/rejected sessions
      let sessionQuery = supabase
        .from('passenger_trip_sessions')
        .select(`
          id,
          trip_session_id,
          status,
          fare_amount,
          created_at,
          trip_sessions!inner (
            id,
            start_location,
            end_location,
            start_time,
            driver_id
          )
        `)
        .eq('passenger_id', userId)
        .in('status', ['cancelled', 'left', 'rejected', 'completed'])
        .order('created_at', { ascending: false });

      if (startOfDay) sessionQuery = sessionQuery.gte('trip_sessions.start_time', startOfDay);
      if (endOfDay) sessionQuery = sessionQuery.lte('trip_sessions.start_time', endOfDay);
      const { data: sessionData, error: sessionError } = await sessionQuery.range(rangeStart, rangeEnd);

      if (sessionError) {
        console.error("[userService.getActivityHistory] Error passenger session history:", sessionError.message);
      }

      const tripsMap = new Map<number, ActivityItem>();

      // Populate from passenger_route_history
      (historyData || []).forEach((item: any) => {
        if (item.user_id !== item.driver_id) {
          tripsMap.set(item.trip_session_id, {
            id: `h-${item.id}`,
            trip_session_id: item.trip_session_id,
            start_location: item.start_location || "Punto de inicio",
            end_location: item.end_location || "Destino",
            start_time: item.start_time || item.created_at,
            status: item.status || 'completed',
            price: Number(item.price ?? 1.25),
            passenger_count: Number(item.passenger_count ?? 1),
            role: 'passenger',
          });
        }
      });

      // Populate or complement from passenger_trip_sessions (for cancelled, left, etc.)
      (sessionData || []).forEach((item: any) => {
        const tsId = item.trip_session_id;
        if (!tripsMap.has(tsId) && item.trip_sessions) {
          tripsMap.set(tsId, {
            id: `pts-${item.id}`,
            trip_session_id: tsId,
            start_location: item.trip_sessions.start_location || "Punto de inicio",
            end_location: item.trip_sessions.end_location || "Destino",
            start_time: item.trip_sessions.start_time || item.created_at,
            status: item.status === 'left' ? 'left' : item.status === 'rejected' ? 'rejected' : item.status === 'cancelled' ? 'cancelled' : 'completed',
            price: Number(item.fare_amount ?? 1.25),
            passenger_count: 1,
            role: 'passenger',
          });
        }
      });

      const data = Array.from(tripsMap.values()).sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      ).slice(0, safeLimit);

      return {
        data,
        hasMore: (historyData?.length ?? 0) === safeLimit || (sessionData?.length ?? 0) === safeLimit,
      };
    } else {
      // Driver Role
      // 1. Fetch from passenger_route_history for driver
      let historyQuery = supabase
        .from('passenger_route_history')
        .select('*')
        .eq('driver_id', userId)
        .order('start_time', { ascending: false });

      if (startOfDay) historyQuery = historyQuery.gte('start_time', startOfDay);
      if (endOfDay) historyQuery = historyQuery.lte('start_time', endOfDay);
      const { data: historyData, error: historyError } = await historyQuery.range(rangeStart, rangeEnd);

      if (historyError) {
        console.error("[userService.getActivityHistory] Error driver history:", historyError.message);
      }

      // 2. Fetch from trip_sessions for driver to include completed & cancelled sessions
      let driverSessionsQuery = supabase
        .from('trip_sessions')
        .select(`
          id,
          start_location,
          end_location,
          start_time,
          status,
          created_at,
          passenger_trip_sessions (
            id,
            status,
            fare_amount
          )
        `)
        .eq('driver_id', userId)
        .in('status', ['completed', 'cancelled'])
        .order('start_time', { ascending: false });

      if (startOfDay) driverSessionsQuery = driverSessionsQuery.gte('start_time', startOfDay);
      if (endOfDay) driverSessionsQuery = driverSessionsQuery.lte('start_time', endOfDay);
      const { data: driverSessions, error: driverSessionsError } = await driverSessionsQuery.range(rangeStart, rangeEnd);

      if (driverSessionsError) {
        console.error("[userService.getActivityHistory] Error driver trip sessions:", driverSessionsError.message);
      }

      const driverTripsMap = new Map<number, ActivityItem>();

      // Aggregate history from passenger_route_history
      (historyData || []).forEach((item: any) => {
        const tsId = item.trip_session_id;
        if (!driverTripsMap.has(tsId)) {
          driverTripsMap.set(tsId, {
            id: `dh-${item.id}`,
            trip_session_id: tsId,
            start_location: item.start_location || "Punto de inicio",
            end_location: item.end_location || "Destino",
            start_time: item.start_time || item.created_at,
            status: item.status || 'completed',
            price: Number(item.price ?? 0),
            passenger_count: Number(item.passenger_count ?? 0),
            role: 'driver',
          });
        } else {
          const existing = driverTripsMap.get(tsId)!;
          if (item.user_id !== item.driver_id && existing.passenger_count === 0) {
            existing.passenger_count += 1;
            if (existing.price === 0) {
              existing.price += Number(item.price ?? 1.25);
            }
          }
        }
      });

      // Complement from trip_sessions
      (driverSessions || []).forEach((session: any) => {
        const tsId = session.id;
        const validPassengers = (session.passenger_trip_sessions || []).filter(
          (p: any) => p.status === 'completed' || p.status === 'joined'
        );
        const pCount = validPassengers.length;
        const totalPrice = validPassengers.reduce(
          (sum: number, p: any) => sum + Number(p.fare_amount ?? 1.25),
          0
        );

        if (!driverTripsMap.has(tsId)) {
          driverTripsMap.set(tsId, {
            id: `ts-${session.id}`,
            trip_session_id: tsId,
            start_location: session.start_location || "Punto de inicio",
            end_location: session.end_location || "Destino",
            start_time: session.start_time || session.created_at,
            status: session.status || 'completed',
            price: totalPrice,
            passenger_count: pCount,
            role: 'driver',
          });
        }
      });

      const data = Array.from(driverTripsMap.values()).sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      ).slice(0, safeLimit);

      return {
        data,
        hasMore: (historyData?.length ?? 0) === safeLimit || (driverSessions?.length ?? 0) === safeLimit,
      };
    }
  },

  /**
   * Soft deletes a user account by calling Supabase RPC 'soft_delete_user_account'.
   */
  async deleteAccount(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("soft_delete_user_account", {
      p_user_id: userId,
    });

    if (error) {
      console.error("[userService.deleteAccount] RPC Error:", error.message);
      throw new Error(error.message || "No se pudo eliminar la cuenta.");
    }

    return !!data;
  }
};
