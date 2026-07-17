import { RouteData, SessionData, UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/services/notifications.service";
import { ratingsService } from "@/services/ratings.service";

export interface TripSessionDetails {
  id: number;
  status: string;
  start_coords: any;
  end_coords: any;
  start_location: string;
  end_location: string;
  driver_id: string;
  stops: any[];
}

export const tripService = {
  /**
   * Fetches available active routes for a passenger, filtered by their organizations.
   */
  async getPassengerRoutes(userId: string): Promise<SessionData[]> {
    // 1. Get user's active organizations
    const { data: memberOrgs, error: orgsError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (orgsError) {
      console.error("[tripService.getPassengerRoutes] orgs error:", orgsError);
    }

    console.log("ORGANIZATION MEMBERS: ", memberOrgs);
    const orgIds = memberOrgs?.map(mo => mo.organization_id) || [];

    // Obtener solicitudes pendientes del pasajero
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('passenger_requests')
      .select('trip_session_id')
      .eq('passenger_id', userId)
      .eq('status', 'pending');

    if (pendingError) {
      console.error("[tripService.getPassengerRoutes] pending error:", pendingError);
    }

    const pendingSessionIds = pendingRequests?.map(pr => pr.trip_session_id) || [];

    // Obtener sesiones de viaje activas
    const { data, error } = await supabase
      .from("trip_sessions")
      .select(`
        *,
        driver:users!driver_id (
          name,
          avatar_profile
        ),
        routes (
          image_url,
          organization_id
        ),
        passenger_stops (
          *
        ),
        passengers:passenger_trip_sessions (
          status,
          passenger:users!passenger_id (
            id,
            avatar_profile
          )
        )
      `)
      .in("status", ["pending", "active"]);

    if (error) {
      console.error("[tripService.getPassengerRoutes] fetch error:", error);
      throw error;
    }

    console.log("DATA DE SESIONES: ", JSON.stringify(data, null, 2));

    const sessionIds = (data || []).map((session: any) => session.id);
    let pendingCounts: Record<number, number> = {};
    if (sessionIds.length > 0) {
      const { data: allPendingRequests, error: allPendingError } = await supabase
        .from('passenger_requests')
        .select('trip_session_id')
        .in('trip_session_id', sessionIds)
        .eq('status', 'pending');

      if (allPendingError) {
        console.error('[tripService.getPassengerRoutes] pending counts error:', allPendingError);
      } else {
        pendingCounts = (allPendingRequests || []).reduce((acc: Record<number, number>, request: any) => {
          const sessionId = request.trip_session_id;
          acc[sessionId] = (acc[sessionId] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // 3. Filter routes with capacity < 4 passengers joined
    const availableRoutes = (data || []).filter((session) => {
      const joinedPassengers = session.passengers?.filter((p: any) => p.status === "joined") || [];
      if (joinedPassengers.length >= 4) return false;
      
      // Excluir si el pasajero actual ya está unido al viaje
      const isAlreadyJoined = session.passengers?.some((p: any) => p.passenger_id === userId && p.status === "joined");

      if (isAlreadyJoined) return false;

      return true;
    });

    console.log("AVAILABLE ROUTES: ", JSON.stringify(availableRoutes, null, 2));

    const formattedRoutes = availableRoutes.map((session) => {
      const joinedPassengers = session.passengers?.filter((p: any) => p.status === "joined") || [];
      const hasPendingRequest = pendingSessionIds.includes(session.id);
      const pendingRequestsCount = pendingCounts[session.id] || 0;
      
      return {
        ...session,
        driver_name: session.driver?.name,
        driver_avatar: session.driver?.avatar_profile,
        driver_rating: session.driver?.rating,
        passengers_data: joinedPassengers.map((p: any) => ({
          id: p.passenger?.id,
          avatar: p.passenger?.avatar_profile,
        })) || [],
        user_pending_request: hasPendingRequest,
        pending_requests_count: pendingRequestsCount,
      };
    });

    console.log("FORMATTED ROUTES: ", JSON.stringify(formattedRoutes, null, 2));

    // 4. Filter by passenger's organizations
    return formattedRoutes.filter((session) => {
      if (orgIds.length === 0) return true;
      const routeObj = Array.isArray(session.routes) ? session.routes[0] : session.routes;
      const routeOrgId = routeObj?.organization_id;
      console.log("ROUTE ORG ID: ", routeOrgId);
      console.log("ORG IDS: ", orgIds);
      console.log("ORG INCLUDES: ", orgIds.includes(routeOrgId));
      return orgIds.includes(routeOrgId);
    });
  },

  async getPassengersIdsByRoute_includingRequests(routeId: number): Promise<string[]> {

    console.log("Passengers ids by route: ", routeId);
    const { data, error } = await supabase
      .from("passenger_trip_sessions")
      .select(`
        passenger_id
      `)
      .eq("trip_session_id", routeId)
      .eq("status", "cancelled");

    if (error) {
      console.error("[tripService.getPassengersByRoute] error:", error);
      throw error;
    }

    console.log("Passengers by route: ", data);

    const { data: p_requests, error: requests_error } = await supabase
      .from("passenger_requests")
      .select("passenger_id")
      .eq("trip_session_id", routeId)
      .eq("status", "cancelled");

    if (requests_error) {
      console.error("[tripService.getPassengersByRoute] requests error:", requests_error);
      throw requests_error;
    }

    console.log("Passengers requests by route: ", p_requests);

    const passengersIds = [...data.map((p: any) => p.passenger_id), ...p_requests.map((p: any) => p.passenger_id)];

    return passengersIds;
  },

  /**
   * Fetches the driver's own routes and administration/institution routes.
   */
  async getDriverRoutes(userId: string): Promise<{ myRoutes: RouteData[]; adminRoutes: RouteData[] }> {
    // 1. Get driver's organizations
    const { data: memberOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    const orgIds = memberOrgs?.map(mo => mo.organization_id) || [];

    // 2. Fetch routes
    const { data, error } = await supabase
      .from("routes")
      .select(`
        *,
        users!created_by(role_id),
        stops(*)
      `);

    if (error) {
      console.error("[tripService.getDriverRoutes] error:", error);
      throw error;
    }

    const allRoutes = data || [];
    const userSpecific = allRoutes.filter(r => r.created_by === userId);
    const adminSpecific = allRoutes.filter(r => {
      const creatorRole = Array.isArray(r.users) ? r.users[0]?.role_id : r.users?.role_id;
      const belongsToUserOrg = orgIds.length === 0 || orgIds.includes(r.organization_id);
      return creatorRole === 1 && r.created_by !== userId && belongsToUserOrg;
    });

    return {
      myRoutes: userSpecific as RouteData[],
      adminRoutes: adminSpecific as RouteData[]
    };
  },

  /**
   * Creates a new route for the driver. Resolves organization and first branch automatically.
   */
  async createRoute(
    userId: string,
    startLocationName: string,
    endLocationName: string,
    startCoords: number[],
    endCoords: number[],
    staticMapUrl: string
  ): Promise<void> {
    let orgId = null;
    let branchId = null;

    // Get active organization
    const { data: memberOrg } = await supabase
      .from('organization_members')
      .select('organization_id, branch_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (memberOrg) {      
      // Get branch
      const { data: branch } = await supabase
        .from('organization_branches')
        .select('id')
        .eq('organization_id', memberOrg.organization_id)
        .eq('id', memberOrg.branch_id)
        .maybeSingle();

      if (branch) {
        branchId = branch.id;
      }
      orgId = memberOrg.organization_id;
    }

    // Insert route
    const { error } = await supabase.from("routes").insert([
      {
        created_by: userId,
        start_location: startLocationName,
        end_location: endLocationName,
        start_coords: { type: "Point", coordinates: startCoords },
        end_coords: { type: "Point", coordinates: endCoords },
        image_url: staticMapUrl,
        organization_id: orgId,
        branch_id: branchId
      }
    ]);

    if (error) {
      console.error("[tripService.createRoute] error:", error);
      throw error;
    }
  },
  
  async DeleteTripSession(userId: string): Promise<void> {
    const { error: route_error } = await supabase
      .from("routes")
      .delete()
      .eq("created_by", userId);
    
    if (route_error) {
      console.error("[tripService.DeleteTripSession] error:", route_error);
      throw route_error;
    }
  },

  /**
   * Starts a trip session by setting status to 'active'.
   */
  async startTripSession(sessionId: number): Promise<void> {
    const { error } = await supabase
      .from("trip_sessions")
      .update({ status: "active" })
      .eq("id", sessionId);

    if (error) {
      console.error("[tripService.startTripSession] error:", error);
      throw error;
    }
  },

  async cancelTripSession(sessionId: number): Promise<void> {
    const { error: p_req_error } = await supabase
      .from("passenger_requests")
      .update({ status: "cancelled", rejection_reason: "Ruta cancelada por el conductor" })
      .eq("trip_session_id", sessionId)
      .eq("status", "pending");
    
    if (p_req_error) {
      console.error("[tripService.cancelTripSession] error:", p_req_error);
      throw p_req_error;
    }
    const { error: errorSessionId } = await supabase
      .from("passenger_trip_sessions")
      .update({ status: "cancelled" })
      .eq("trip_session_id", sessionId)
      .eq("status", "joined");

    if(errorSessionId) {
      console.error("[tripService.cancelTripSession] error:", errorSessionId);
      throw errorSessionId;
    }

    const { error: mp_error } = await supabase
      .from("trip_session_meeting_points")
      .update({ status: "cancelled" })
      .eq("trip_session_id", sessionId)
      .eq("status", "pending");
    
    if (mp_error) {
      console.error("[tripService.cancelTripSession] error:", mp_error);
      throw mp_error;
    }

    const { error : stops_error } = await supabase
      .from("trip_session_stops")
      .update({ status: "cancelled" })
      .eq("trip_session_id", sessionId)
      .eq("status", "pending");
    
    if (stops_error) {
      console.error("[tripService.cancelTripSession] stops error:", stops_error);
      throw stops_error;
    }

    const { error: session_error } = await supabase
      .from("trip_sessions")
      .update({ status: "cancelled" })
      .eq("id", sessionId);

    if (session_error) {
      console.error("[tripService.cancelTripSession] error:", session_error);
      throw session_error;
    }
  },

  /**
   * Finishes a trip session by setting status to 'completed' and marking all joined passengers as 'completed'.
   */
  async finishTripSession(sessionId: number): Promise<void> {
    const { error: sessionError } = await supabase
      .from("trip_sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);

    if (sessionError) {
      console.error("[tripService.finishTripSession] session error:", sessionError);
      throw sessionError;
    }

    const { error: passengersError } = await supabase
      .from("passenger_trip_sessions")
      .update({ status: "completed" })
      .eq("trip_session_id", sessionId)
      .eq("status", "joined");

    if (passengersError) {
      console.error("[tripService.finishTripSession] passengers error:", passengersError);
      throw passengersError;
    }
  },

  async omitPassengerPoints(sessionId: number, passengerId: string): Promise<boolean> {
    // Logica para omitir mp y stops del pasajero mediante funcion rpc en supabase
    const { data, error } = await supabase
      .rpc('omit_passenger_points', { p_trip_session_id: sessionId, p_passenger_id: passengerId });
    if (error) {
      console.error("[tripService.omitPassengerPoints] error:", error);
      throw error;
    }
    return data;
    
  },

  /**
   * Updates stop check-in status.
   */
  async updateStopStatus(sessionId: number, stopId: number, status: 'visited' | 'skipped'): Promise<void> {
    const { error } = await supabase
      .from('trip_session_stops')
      .update({
        status,
        visit_time: status === 'visited' ? new Date().toISOString() : null,
      })
      .eq('trip_session_id', sessionId)
      .eq('stop_id', stopId);

    if (error) {
      console.error("[tripService.updateStopStatus] error:", error);
      throw error;
    }
  },

  /**
   * Updates meeting point check-in status.
   */
  async updateMeetingPointStatus(sessionId: number, passengerId: string, status: 'visited' | 'skipped'): Promise<void> {
    // 1. Get the meeting point ID for this passenger in the trip session
    const { data: mpData, error: mpError } = await supabase
      .from('passenger_meeting_points')
      .select('id')
      .eq('trip_session_id', sessionId)
      .eq('passenger_id', passengerId)
      .single();

    if (mpError) {
      console.error("[tripService.updateMeetingPointStatus] get mp id error:", mpError);
      throw mpError;
    }

    // 2. Update the status in trip_session_meeting_points
    const { error } = await supabase
      .from('trip_session_meeting_points')
      .update({
        status,
        visit_time: status === 'visited' ? new Date().toISOString() : null,
      })
      .eq('id', mpData.id);

    if (error) {
      console.error("[tripService.updateMeetingPointStatus] error:", error);
      throw error;
    }
  },

  /**
   * Submits a new passenger request.
   */
  async submitPassengerRequest(
    tripSessionId: number,
    passengerId: string,
    pickupPoint: { latitude: number; longitude: number },
    destinationPoint: { latitude: number; longitude: number },
    pickupAddress: string,
    destinationAddress: string
  ): Promise<void> {
    // Obtener la organización asociada a la ruta del viaje
    const { data: tripSessionData, error: tripSessionError } = await supabase
      .from('trip_sessions')
      .select(`
        id,
        routes (
          organization_id
        )
      `)
      .eq('id', tripSessionId)
      .single();

    if (tripSessionError || !tripSessionData) {
      throw new Error("No se pudo obtener la organización del viaje.");
    }

    const routeObj = Array.isArray(tripSessionData.routes) ? tripSessionData.routes[0] : tripSessionData.routes;
    const orgId = routeObj?.organization_id;

    const payload: any = {
      trip_session_id: tripSessionId,
      passenger_id: passengerId,
      status: "pending",
      pickup_point: { type: "Point", coordinates: [pickupPoint.longitude, pickupPoint.latitude] },
      destination_point: { type: "Point", coordinates: [destinationPoint.longitude, destinationPoint.latitude] },
      pickup_address: pickupAddress,
      destination_address: destinationAddress,
    };

    if (orgId) {
      payload.organization_id = orgId;
    }

    const { error } = await supabase.from("passenger_requests").insert([payload]);

    if (error) {
      console.error("[tripService.submitPassengerRequest] error:", error);
      throw error;
    }

    // Notificar al conductor sobre la nueva solicitud
    try {
      const { data: trip } = await supabase
        .from('trip_sessions')
        .select('driver_id')
        .eq('id', tripSessionId)
        .single();

      if (!trip?.driver_id) {
        console.warn("[tripService.submitPassengerRequest] no driver_id found for tripSessionId", tripSessionId);
        return;
      }

      console.log("[tripService.submitPassengerRequest] notifying driver", {
        driverId: trip.driver_id,
        tripSessionId,
        passengerId,
      });

      await sendPushNotification(
        trip.driver_id,
        "¡Nueva solicitud de pasajero! 🚗",
        "Alguien quiere unirse a tu viaje.",
        {
          type: 'NEW_PASSENGER',
          trip_session_id: tripSessionId,
          passenger_id: passengerId,
        }
      );

      console.log("[tripService.submitPassengerRequest] notification sent to driver", trip.driver_id);
    } catch (notifError) {
      console.warn("[tripService.submitPassengerRequest] notification error:", notifError);
      // No fallar el proceso completo si la notificación falla
    }
  },

  /**
   * Approves a passenger request by executing the five database writes.
   */
  async approvePassengerRequest(
    requestId: number,
    tripSessionId: number,
    passengerId: string,
  ): Promise<void> {
    // 0. ATOMIC idempotency lock:
    //    UPDATE ... WHERE status = 'pending' RETURNING id
    //    If another call already set status to 'approved', this UPDATE matches 0 rows
    //    and returns an empty array — so we bail out immediately.
    //    This is atomic at the DB level and prevents race conditions between simultaneous calls.
    const { data: claimed, error: claimError } = await supabase
      .from("passenger_requests")
      .update({ status: "approved" })
      .eq("id", requestId)
      .eq("status", "pending")  // only succeeds if still pending
      .select("id");

    if (claimError) throw claimError;

    if (!claimed || claimed.length === 0) {
      // Another call already claimed this request — skip all inserts.
      console.warn(
        "[tripService.approvePassengerRequest] Request already claimed by another process, skipping.",
        { requestId }
      );
      return;
    }

    // 1. Request successfully locked — continue with the rest of the inserts.

    // 2. Insert joined passenger session
    const { error: sessionError } = await supabase
      .from("passenger_trip_sessions")
      .insert({
        trip_session_id: tripSessionId,
        passenger_id: passengerId,
        status: "joined",
      });
    if (sessionError) throw sessionError;

    // 3. Insert temporal meeting point
    // 3.1. Fetch the pickup address from passenger_requests
    const { data: requestData, error: requestError } = await supabase
      .from("passenger_requests")
      .select("pickup_point, pickup_address, destination_point, destination_address")
      .eq("id", requestId)
      .single();

    if (requestError) throw requestError;

    // 3.2. Insert into passenger_meeting_points (returns the generated ID)
    const { data: mpData, error: mpError } = await supabase
      .from("passenger_meeting_points")
      .insert({
        trip_session_id: tripSessionId,
        passenger_id: passengerId,
        coords: requestData.pickup_point,
        location: requestData.pickup_address || "Punto de recogida",
      })
      .select("id")
      .single();

    if (mpError) {
      console.error("[tripService.approvePassengerRequest] mpError:", mpError);
      throw mpError;
    }

    if (mpData) {
      // 3.3. Insert into trip_session_meeting_points
      const { error: tsmpError } = await supabase
        .from("trip_session_meeting_points")
        .insert({
          passenger_mp_id: mpData.id,
          trip_session_id: tripSessionId,
          passenger_id: passengerId,
          status: "pending",
        });

      if (tsmpError) {
        console.error("[tripService.approvePassengerRequest] tsmpError:", tsmpError);
        throw tsmpError;
      }
    }

    // 4. Create destination stop
    const { data: stopData, error: stopError } = await supabase
      .from("passenger_stops")
      .insert({
        trip_session_id: tripSessionId,
        passenger_id: passengerId,
        location: requestData.destination_address || "Bajada de Pasajero",
        coords: requestData.destination_point,
      })
      .select("id")
      .single();

    if (stopError) {
      console.error("[tripService.approvePassengerRequest] stopError:", stopError);
      throw stopError;
    }

    // 5. Connect stop to trip session
    const { error: tssError } = await supabase
      .from("trip_session_stops")
      .insert({
        trip_session_id: tripSessionId,
        passenger_id: passengerId,
        passenger_stop_id: stopData.id,
        status: "pending",
      });

    if (tssError) {
      console.error("[tripService.approvePassengerRequest] tssError:", tssError);
      throw tssError;
    }
  },

  /**
   * Rejects a passenger request.
   */
  async rejectPassengerRequest(requestId: number, reason: string): Promise<void> {
    const { error } = await supabase
      .from("passenger_requests")
      .update({
        status: "rejected",
        rejection_reason: reason,
      })
      .eq("id", requestId);

    if (error) {
      console.error("[tripService.rejectPassengerRequest] error:", error);
      throw error;
    }
  },

  /**
   * Fetches specific passenger request details for approval modal.
   */
  async getPassengerRequestDetails(tripSessionId: number, passengerId: string) {
    // 1. User profile data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, name, avatar_profile")
      .eq("id", passengerId)
      .single();

    if (userError) throw userError;

    // 2. Pending request data
    const { data: requestData, error: requestError } = await supabase
      .from("passenger_requests")
      .select("id, pickup_point, pickup_address, destination_point, destination_address")
      .eq("trip_session_id", tripSessionId)
      .eq("passenger_id", passengerId)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError) throw requestError;
    if (!requestData) throw new Error("NO_PENDING_REQUEST");

    // 3. Route ID from session
    const { data: sessionData, error: sessionError } = await supabase
      .from("trip_sessions")
      .select("route_id")
      .eq("id", tripSessionId)
      .single();

    if (sessionError) throw sessionError;

    return {
      userData,
      requestData,
      sessionData
    };
  },

  /**
   * Fetches stop records by stop IDs, formatting coordinates.
   */
  async getStops(stopIds: number[]): Promise<any[]> {
    console.warn("[tripService.getStops] stopIds:", stopIds);
    if (stopIds.length === 0) return [];
    const { data, error } = await supabase
      .from("passenger_stops")
      .select("*")
      .in("id", stopIds);
      
    console.warn("[tripService.getStops] data:", data);

    if (error) {
      console.error("[tripService.getStops] error:", error);
      throw error;
    }


    return (data || []).map((stop: any) => ({
      ...stop,
      coords: {
        latitude: Number(stop.coords?.coordinates?.[1] ?? stop.coords?.latitude ?? 0),
        longitude: Number(stop.coords?.coordinates?.[0] ?? stop.coords?.longitude ?? 0),
      }
    }));
  },

  /**
   * Fetches session stops records by stop IDs, formatting coordinates.
   */
  async getSessionStops(tripSessionId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("passenger_stops")
      .select("*")
      .eq("trip_session_id", tripSessionId);

    if (error) {
      console.error("[tripService.getSessionStops] error:", error);
      throw error;
    }

    return (data || []).map((stop: any) => ({
      ...stop,
      coords: {
        latitude: Number(stop.coords?.coordinates?.[1] ?? stop.coords?.latitude ?? 0),
        longitude: Number(stop.coords?.coordinates?.[0] ?? stop.coords?.longitude ?? 0),
      }
    }));
  },

  /**
   * Fetches active (pending or visited) session stops records by status.
   */
  async getActiveSessionStops(tripSessionId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("passenger_stops")
      .select(`
        *,
        trip_session_stops!inner(status)
        `)
      .eq("trip_session_id", tripSessionId)
      .in("trip_session_stops.status", ["pending", "visited"]);

    if (error) {
      console.error("[tripService.getActiveSessionStops] error:", error);
      throw error;
    }

    return data?.map(({ trip_session_stops, ...passenger_stop }) => ({
      ...passenger_stop,
      coords: {
        latitude: Number(passenger_stop.coords?.coordinates?.[1] ?? passenger_stop.coords?.latitude ?? 0),
        longitude: Number(passenger_stop.coords?.coordinates?.[0] ?? passenger_stop.coords?.longitude ?? 0),
      }
    })) || [];
  },

  async getSessionRouteCoords_Locations(tripSessionId: number) {
    const { data: trip_session, error } = await supabase
      .from("trip_sessions")
      .select("start_coords, end_coords, start_location, end_location")
      .eq("id", tripSessionId)
      .single();
    
    if (error) {
      console.error("[tripService.getSessionRouteCoords_Locations] error:", error);
      throw error;
    }
    
    return trip_session;
  },

  /**
   * Fetches stop and meeting point statuses for a trip session.
   */
  async getTripSessionWaypointStatuses(sessionId: number) {
    const { data: stopStatuses, error: stopErr } = await supabase
      .from('trip_session_stops')
      .select('*')
      .eq('trip_session_id', sessionId);
    if (stopErr) throw stopErr;

    const { data: meetingStatuses, error: meetingErr } = await supabase
      .from('trip_session_meeting_points')
      .select('id, status, visit_time')
      .eq('trip_session_id', sessionId);
    if (meetingErr) throw meetingErr;

    return { stopStatuses, meetingStatuses };
  },

  /**
   * Deletes a passenger's meeting point and updates their status to 'left'.
   */
  async leaveTripSession(sessionId: number, passengerId: string): Promise<void> {
    // 1. Update trip_session_meeting_points status to 'left'
    //    First get the meeting point ID for this passenger
    const { data: mpData } = await supabase
      .from('passenger_meeting_points')
      .select('id')
      .eq('trip_session_id', sessionId)
      .eq('passenger_id', passengerId)
      .maybeSingle();

    if (mpData) {
      // Update using passenger_mp_id — this uniquely identifies the correct row
      const { error: tsmpError } = await supabase
        .from('trip_session_meeting_points')
        .update({ status: "left" })
        .eq('trip_session_id', sessionId)
        .eq('passenger_mp_id', mpData.id);

      if (tsmpError) {
        console.warn("[tripService.leaveTripSession] Warning updating trip_session_meeting_points:", tsmpError.message);
      }
    } else {
      // Fallback: no passenger_meeting_points found, try updating by passenger_id directly
      const { error: tsmpFallbackError } = await supabase
        .from('trip_session_meeting_points')
        .update({ status: "left" })
        .eq('trip_session_id', sessionId)
        .eq('passenger_id', passengerId)
        .eq('status', 'pending');

      if (tsmpFallbackError) {
        console.warn("[tripService.leaveTripSession] Fallback warning:", tsmpFallbackError.message);
      }
    }

    // 2. Update trip_session_stops status to 'left'
    const { error: tspsError } = await supabase
      .from("trip_session_stops")
      .update({ status: "left" })
      .eq("trip_session_id", sessionId)
      .eq("passenger_id", passengerId);
    
    if (tspsError) {
      console.warn("[tripService.leaveTripSession] Warning updating trip_session_stops:", tspsError.message);
    }
    
    // 3. Update passenger_trip_sessions status to 'left'
    const { error } = await supabase
      .from("passenger_trip_sessions")
      .update({ status: "left" })
      .eq("trip_session_id", sessionId)
      .eq("passenger_id", passengerId);

    if (error) {
      console.error("[tripService.leaveTripSession] error:", error);
      throw error;
    }
  },


  /**
   * Sets passenger statuses to 'completed' for a list of passenger IDs.
   */
  async dropOffPassengers(sessionId: number, passengerIds: string[]): Promise<void> {
    const { error } = await supabase
      .from("passenger_trip_sessions")
      .update({ status: "completed" })
      .eq("trip_session_id", sessionId)
      .in("passenger_id", passengerIds);

    if (error) {
      console.error("[tripService.dropOffPassengers] error:", error);
      throw error;
    }
  },

  /**
   * Fetches joined, completed, and pending passengers for a trip session.
   */
  async getTripSessionPassengers(sessionId: number): Promise<any[]> {
    // 1. Get joined or completed passengers
    const { data: joinedData, error: joinedError } = await supabase
      .from("passenger_trip_sessions")
      .select("*")
      .eq("trip_session_id", sessionId)
      .in("status", ["joined", "completed"]);

    if (joinedError) throw joinedError;

    // 2. Get pending requests
    const { data: pendingRequestsData, error: pendingError } = await supabase
      .from("passenger_requests")
      .select("*")
      .eq("trip_session_id", sessionId)
      .eq("status", "pending");

    if (pendingError) throw pendingError;

    const pendingMapped = (pendingRequestsData || []).map((req) => ({
      id: req.id,
      trip_session_id: req.trip_session_id,
      passenger_id: req.passenger_id,
      status: "pending_approval",
      rejected: false,
      created_at: req.created_at || new Date().toISOString(),
    }));

    const joinedMapped = (joinedData || []).map((p) => ({
      id: p.id,
      trip_session_id: p.trip_session_id,
      passenger_id: p.passenger_id,
      status: p.status,
      rejected: false,
      created_at: p.created_at || new Date().toISOString(),
    }));

    return [...joinedMapped, ...pendingMapped];
  },

  /**
   * Fetches pending requests for a trip session.
   */
  async getPendingRequests(sessionId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("passenger_requests")
      .select("*")
      .eq("trip_session_id", sessionId)
      .eq("status", "pending");

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetches user profile data and average ratings for a list of user IDs.
   */
  async getSessionUsers(userIds: string[]): Promise<any[]> {
    if (!userIds.length) return [];

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in('id', userIds);

    if (error) throw error;

    const ratingsMap = await ratingsService.getUsersRatings(userIds);

    return (data || []).map((u) => ({
      ...(u as any as UserData),
      rating: ratingsMap[u.id]?.rating || 0,
      rating_count: ratingsMap[u.id]?.count || 0
    }));
  },

  /**
   * Fetches all meeting points for a trip session.
   */
  async getMeetingPoints(sessionId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("passenger_meeting_points")
      .select("*")
      .eq("trip_session_id", sessionId);

    if (error) throw error;
    return data || [];
  },

  async getActiveMeetingPoints(tripSessionId: number) {
    const { data, error } = await supabase
      .from("passenger_meeting_points")
      .select(`
        *,
        trip_session_meeting_points!inner(status)
        `)
      .eq("trip_session_id", tripSessionId)
      .in("trip_session_meeting_points.status", ["pending", "visited"]);

    if (error) {
      console.error("[tripService.getActiveSessionStops] error:", error);
      throw error;
    }

    return data?.map(({ trip_session_stops, ...passenger_mp }) => ({
      ...passenger_mp,
      coords: {
        latitude: Number(passenger_mp.coords?.coordinates?.[1] ?? passenger_mp.coords?.latitude ?? 0),
        longitude: Number(passenger_mp.coords?.coordinates?.[0] ?? passenger_mp.coords?.longitude ?? 0),
      }
    })) || [];
  },

  /**
   * Checks if a passenger is already joined in a specific trip session.
   */
  async checkPassengerSessionStatus(passengerId: string, sessionId: number): Promise<string | null> {
    const { data, error } = await supabase
      .from('passenger_trip_sessions')
      .select('status')
      .eq('passenger_id', passengerId)
      .eq('trip_session_id', sessionId)
      .in('status', ['joined'])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[tripService.checkPassengerSessionStatus] error:", error);
      throw error;
    }
    return data ? data.status : null;
  },

  /**
   * Checks if a passenger has a pending request for a specific trip session.
   */
  async checkPassengerRequestStatus(passengerId: string, sessionId: number): Promise<{ status: string, rejectionReason: string } | null> {
    const { data, error } = await supabase
      .from('passenger_requests')
      .select('status, rejection_reason')
      .eq('passenger_id', passengerId)
      .eq('trip_session_id', sessionId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[tripService.checkPassengerRequestStatus] error:", error);
      throw error;
    }
    return data ? { status: data.status, rejectionReason: data.rejection_reason } : null;
  },

  /**
   * Checks if a passenger has any active trip session.
   */
  async hasActiveTripSession(passengerId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('passenger_trip_sessions')
      .select("id")
      .eq("passenger_id", passengerId)
      .in("status", ["joined"])
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[tripService.hasActiveTripSession] error:", error);
      throw error;
    }
    return !!data;
  },

  /**
   * Updates the driver's location in real-time.
   */
  async updateDriverLocation(tripSessionId: number, driverId: string, latitude: number, longitude: number): Promise<void> {
    const { error } = await supabase.from('driver_locations').upsert(
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

    if (error) {
      console.error('[tripService.updateDriverLocation] error:', error);
      throw error;
    }
  },

  /**
   * Clears the driver's location when tracking stops.
   */
  async clearDriverLocation(tripSessionId: number): Promise<void> {
    const { error } = await supabase
      .from('driver_locations')
      .delete()
      .eq('trip_session_id', tripSessionId);

    if (error) {
      console.error('[tripService.clearDriverLocation] error:', error);
      throw error;
    }
  }
};
