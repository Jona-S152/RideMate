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
  completed_trips_count?: number;
}

export interface PassengerStatusSummary {
  total: number;
  joined: number;
  pending: number;
  completed: number;
  cancelled: number;
  left: number;
  rejected: number;
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
  passenger_status_summary?: PassengerStatusSummary;
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
   * Fetches the full profile details for a user, including completed trips count.
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

    if (!data) return null;

    // Fetch completed trips count
    const completedTripsCount = await this.getCompletedTripsCount(userId, data.is_driver ? 'driver' : 'passenger');

    return {
      ...data,
      completed_trips_count: completedTripsCount
    };
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
      const sessionIds = Array.from(new Set([...(sessionData || []).map((item: any) => item.trip_session_id), ...(historyData || []).map((item: any) => item.trip_session_id)]));
      let sessionStatusSummary: Record<number, PassengerStatusSummary> = {};

      if (sessionIds.length > 0) {
        const { data: passengerSessionsData } = await supabase
          .from('passenger_trip_sessions')
          .select('trip_session_id, status')
          .in('trip_session_id', sessionIds);

        const summaryMap = new Map<number, PassengerStatusSummary>();
        (passengerSessionsData || []).forEach((entry: any) => {
          const key = Number(entry.trip_session_id);
          const current = summaryMap.get(key) || {
            total: 0,
            joined: 0,
            pending: 0,
            completed: 0,
            cancelled: 0,
            left: 0,
            rejected: 0,
          };

          current.total += 1;
          if (entry.status === 'joined') current.joined += 1;
          if (entry.status === 'pending') current.pending += 1;
          if (entry.status === 'completed') current.completed += 1;
          if (entry.status === 'cancelled') current.cancelled += 1;
          if (entry.status === 'left') current.left += 1;
          if (entry.status === 'rejected') current.rejected += 1;

          summaryMap.set(key, current);
        });

        sessionStatusSummary = Object.fromEntries(Array.from(summaryMap.entries()));
      }

      // Populate from passenger_route_history
      (historyData || []).forEach((item: any) => {
        if (item.user_id !== item.driver_id) {
          const tripSessionId = Number(item.trip_session_id);
          const passengerSummary = sessionStatusSummary[tripSessionId] || {
            total: Number(item.passenger_count ?? 1),
            joined: 0,
            pending: 0,
            completed: 0,
            cancelled: 0,
            left: 0,
            rejected: 0,
          };

          tripsMap.set(tripSessionId, {
            id: `h-${item.id}`,
            trip_session_id: tripSessionId,
            start_location: item.start_location || "Punto de inicio",
            end_location: item.end_location || "Destino",
            start_time: item.start_time || item.created_at,
            status: item.status || 'completed',
            price: Number(item.price ?? 1.25),
            passenger_count: Number(passengerSummary.total || item.passenger_count || 1),
            passenger_status_summary: passengerSummary,
            role: 'passenger',
          });
        }
      });

      // Populate or complement from passenger_trip_sessions (for cancelled, left, etc.)
      (sessionData || []).forEach((item: any) => {
        const tsId = Number(item.trip_session_id);
        const summary = sessionStatusSummary[tsId] || {
          total: 1,
          joined: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          left: 0,
          rejected: 0,
        };

        if (!tripsMap.has(tsId) && item.trip_sessions) {
          tripsMap.set(tsId, {
            id: `pts-${item.id}`,
            trip_session_id: tsId,
            start_location: item.trip_sessions.start_location || "Punto de inicio",
            end_location: item.trip_sessions.end_location || "Destino",
            start_time: item.trip_sessions.start_time || item.created_at,
            status: item.status === 'left' ? 'left' : item.status === 'rejected' ? 'rejected' : item.status === 'cancelled' ? 'cancelled' : 'completed',
            price: Number(item.fare_amount ?? 1.25),
            passenger_count: Number(summary.total || 1),
            passenger_status_summary: summary,
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
      const driverSessionIds = Array.from(new Set((driverSessions || []).map((s: any) => Number(s.id))));
      let driverSessionStatusSummary: Record<number, PassengerStatusSummary> = {};

      if (driverSessionIds.length > 0) {
        const { data: driverPassengerSessions } = await supabase
          .from('passenger_trip_sessions')
          .select('trip_session_id, status')
          .in('trip_session_id', driverSessionIds);

        const summaryMap = new Map<number, PassengerStatusSummary>();
        (driverPassengerSessions || []).forEach((entry: any) => {
          const key = Number(entry.trip_session_id);
          const current = summaryMap.get(key) || {
            total: 0,
            joined: 0,
            pending: 0,
            completed: 0,
            cancelled: 0,
            left: 0,
            rejected: 0,
          };

          current.total += 1;
          if (entry.status === 'joined') current.joined += 1;
          if (entry.status === 'pending') current.pending += 1;
          if (entry.status === 'completed') current.completed += 1;
          if (entry.status === 'cancelled') current.cancelled += 1;
          if (entry.status === 'left') current.left += 1;
          if (entry.status === 'rejected') current.rejected += 1;

          summaryMap.set(key, current);
        });

        driverSessionStatusSummary = Object.fromEntries(Array.from(summaryMap.entries()));
      }

      // Aggregate history from passenger_route_history
      (historyData || []).forEach((item: any) => {
        const tsId = Number(item.trip_session_id);
        const summary = driverSessionStatusSummary[tsId] || {
          total: Number(item.passenger_count ?? 0),
          joined: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          left: 0,
          rejected: 0,
        };

        if (!driverTripsMap.has(tsId)) {
          driverTripsMap.set(tsId, {
            id: `dh-${item.id}`,
            trip_session_id: tsId,
            start_location: item.start_location || "Punto de inicio",
            end_location: item.end_location || "Destino",
            start_time: item.start_time || item.created_at,
            status: item.status || 'completed',
            price: Number(item.price ?? 0),
            passenger_count: Number(summary.total || item.passenger_count || 0),
            passenger_status_summary: summary,
            role: 'driver',
          });
        } else {
          const existing = driverTripsMap.get(tsId)!;
          if (item.user_id !== item.driver_id && existing.passenger_count === 0) {
            existing.passenger_count = Math.max(existing.passenger_count, Number(summary.total || 1));
            if (existing.price === 0) {
              existing.price += Number(item.price ?? 1.25);
            }
          }
        }
      });

      // Complement from trip_sessions
      (driverSessions || []).forEach((session: any) => {
        const tsId = Number(session.id);
        const summary = driverSessionStatusSummary[tsId] || {
          total: 0,
          joined: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          left: 0,
          rejected: 0,
        };
        const validPassengers = (session.passenger_trip_sessions || []).filter(
          (p: any) => p.status === 'completed' || p.status === 'joined'
        );
        const pCount = Math.max(summary.total, validPassengers.length);
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
            passenger_status_summary: summary,
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
   * Gets the count of completed trips for a user (passenger or driver).
   */
  async getCompletedTripsCount(userId: string, role: 'passenger' | 'driver'): Promise<number> {
    try {
      if (role === 'passenger') {
        // Count completed trips in passenger_route_history
        const { count, error } = await supabase
          .from('passenger_trip_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('passenger_id', userId)
          .eq('status', 'completed');

        if (error) {
          console.error("[userService.getCompletedTripsCount] Error fetching passenger trips:", error.message);
          return 0;
        }

        return count ?? 0;
      } else {
        // Count completed trips in trip_sessions for driver
        const { count, error } = await supabase
          .from('trip_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('driver_id', userId)
          .eq('status', 'completed');

        if (error) {
          console.error("[userService.getCompletedTripsCount] Error fetching driver trips:", error.message);
          return 0;
        }

        return count ?? 0;
      }
    } catch (error: any) {
      console.error("[userService.getCompletedTripsCount] Exception:", error.message);
      return 0;
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
