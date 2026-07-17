import { User } from '@/app/context/AuthContext';
import { DriverLocation, SessionData, TripSessionMeetingPoints, TripSessionStops } from '@/interfaces/available-routes';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// Hook: useTripRealtimeById
// Suscribe a cambios de una sesión específica por ID.
// ─────────────────────────────────────────────────────────────
export const useTripRealtimeById = (sessionId: number) => {
    const [session, setSession] = useState<SessionData | null>(null);

    const refreshSession = async () => {
        if (!sessionId) return;
        try {
            const { data, error } = await supabase
                .from("trip_sessions")
                .select("*")
                .eq("id", sessionId)
                .maybeSingle();

            if (error) setSession(null);

            setSession(data as SessionData);
        } catch (error) {
            setSession(null);
        }
    };

    useEffect(() => {
        refreshSession();

        try {
            const channel = supabase
                .channel(`session-${sessionId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'trip_sessions',
                        filter: `id=eq.${sessionId}`,
                    },
                    (payload) => {
                        const newData = payload.new as SessionData;
                        setSession(newData);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } catch (error) {
            console.error("useTripRealtimeById subscription error:", error);
        }
    }, [sessionId]);

    return { session };
};

// ─────────────────────────────────────────────────────────────
// Hook: useActiveSession
// Detecta si el usuario tiene una sesión activa.
// Para conductores: revisa trip_sessions.
// Para pasajeros: revisa passenger_trip_sessions (joined)
//   y también passenger_requests (pending) para reaccionar
//   en tiempo real cuando el conductor aprueba la solicitud.
// ─────────────────────────────────────────────────────────────
export const useActiveSession = (user: User | null) => {
    const [activeSession, setActiveSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshSession = async () => {
        if (!user?.id) return;

        try {
            if (user.driver_mode) {
                // Conductor: busca sesión activa propia
                const { data } = await supabase
                    .from('trip_sessions')
                    .select("*, routes(image_url)")
                    .eq('driver_id', user.id)
                    .in('status', ["pending", "active"])
                    .is('end_time', null)
                    .order('start_time', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                setActiveSession(data as SessionData);
            } else {
                // Pasajero: primero intenta encontrar una sesión aprobada (joined)
                const { data: pSession } = await supabase
                    .from('passenger_trip_sessions')
                    .select('trip_session_id')
                    .eq('passenger_id', user.id)
                    .in('status', ['joined'])
                    .limit(1)
                    .maybeSingle();

                if (pSession) {
                    const { data: trip } = await supabase
                        .from('trip_sessions')
                        .select('*, routes(image_url)')
                        .eq('id', pSession.trip_session_id)
                        .in('status', ['pending', 'active'])
                        .is('end_time', null)
                        .maybeSingle();
                    setActiveSession(trip as SessionData);
                } else {
                    // Sin sesión aprobada aún
                    setActiveSession(null);
                }
            }
        } catch (e) {
            console.error("useActiveSession refresh error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.id) return;

        refreshSession();

        if (user.driver_mode) {
            // Conductor: escucha cambios en trip_sessions filtrado por driver_id
            const channel = supabase
                .channel(`active-session-driver-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'trip_sessions',
                        filter: `driver_id=eq.${user.id}`,
                    },
                    () => refreshSession()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            // Pasajero: escucha cambios en passenger_trip_sessions y passenger_requests
            // para detectar cuando una solicitud es aprobada o rechazada.
            const channel = supabase
                .channel(`active-session-passenger-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'passenger_trip_sessions',
                        filter: `passenger_id=eq.${user.id}`,
                    },
                    () => refreshSession()
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'passenger_requests',
                        filter: `passenger_id=eq.${user.id}`,
                    },
                    (payload) => {
                        // Si la solicitud fue aprobada, refrescamos para mostrar la sesión activa
                        const updated = payload.new as any;
                        if (updated?.status === 'approved') {
                            refreshSession();
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user?.id, user?.driver_mode]);

    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                refreshSession();
            }
        }, [user?.id, user?.driver_mode])
    );

    return { activeSession, loading, refreshSession };
};

// ─────────────────────────────────────────────────────────────
// Hook: useTripStops
// Obtiene y escucha cambios en las paradas de una sesión.
// IMPORTANTE: el filtro por trip_session_id es crítico para
// no escuchar cambios de otras sesiones.
// ─────────────────────────────────────────────────────────────
export const useTripStops = (tripSessionId: number) => {
    const [stops, setStops] = useState<TripSessionStops[]>([]);

    const refreshStops = async () => {
        if (!tripSessionId) return;

        try {
            const { data, error } = await supabase
                .from("trip_session_stops")
                .select("*")
                .eq("trip_session_id", tripSessionId);

            if (error) {
                console.error("useTripStops refresh error:", error);
                return;
            }

            setStops(data as TripSessionStops[]);
        } catch (error) {
            console.error("useTripStops unexpected error:", error);
        }
    };

    useEffect(() => {
        refreshStops();

        const channel = supabase
            .channel(`session-stops-${tripSessionId}`)
            .on(
                'postgres_changes',
                {
                event: 'INSERT', // ← 1. Escucha cuando se crea una parada
                schema: 'public',
                table: 'trip_session_stops',
                filter: `trip_session_id=eq.${tripSessionId}`,
                },
                () => refreshStops()
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // ← 2. Escucha cuando se actualiza una parada
                    schema: 'public',
                    table: 'trip_session_stops',
                    filter: `trip_session_id=eq.${tripSessionId}`, // ← filtro esencial
                },
                () => refreshStops()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripSessionId]);

    return { stops };
};

// ─────────────────────────────────────────────────────────────
// Hook: useTripMeetingPoints
// Obtiene y escucha cambios en los puntos de encuentro de una sesión.
// IMPORTANTE: el filtro por trip_session_id es crítico para
// no escuchar cambios de otras sesiones.
// ─────────────────────────────────────────────────────────────
export const useTripMeetingPoints = (tripSessionId: number) => {
    const [meetingPoints, setMeetingPoints] = useState<TripSessionMeetingPoints[]>([]);

    const refreshMeetingPoints = async () => {
        if (!tripSessionId) return;

        try {
            const { data, error } = await supabase
                .from("trip_session_meeting_points")
                .select("*")
                .eq("trip_session_id", tripSessionId);

            if (error) {
                console.error("useTripMeetingPoints refresh error:", error);
                return;
            }

            setMeetingPoints(data as TripSessionMeetingPoints[]);
        } catch (error) {
            console.error("useTripMeetingPoints unexpected error:", error);
        }
    };

    useEffect(() => {
        refreshMeetingPoints();

        const channel = supabase
            .channel(`trip_session-meeting-points-${tripSessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT', // ← 1. Escucha cuando se crea un punto de encuentro
                    schema: 'public',
                    table: 'trip_session_meeting_points',
                    filter: `trip_session_id=eq.${tripSessionId}`, // ← filtro esencial
                },
                () => refreshMeetingPoints()
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // ← 2. Escucha cuando se actualiza un punto de encuentro
                    schema: 'public',
                    table: 'trip_session_meeting_points',
                    filter: `trip_session_id=eq.${tripSessionId}`, // ← filtro esencial
                },
                () => refreshMeetingPoints()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripSessionId]);

    return { meetingPoints };
};

// ─────────────────────────────────────────────────────────────
// Hook: useDriverLocation
// Escucha la ubicación del conductor en tiempo real.
// ─────────────────────────────────────────────────────────────
export const useDriverLocation = (tripSessionId: number) => {
    const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);

    const refreshDriverLocation = async () => {
        if (!tripSessionId) return;

        try {
            const { data, error } = await supabase
                .from("driver_locations")
                .select("*")
                .eq("trip_session_id", tripSessionId)
                .maybeSingle();

            if (error) {
                console.error("useDriverLocation refresh error:", error);
                return;
            }

            setDriverLocation(data as DriverLocation);
        } catch (error) {
            console.error("useDriverLocation unexpected error:", error);
        }
    };

    useEffect(() => {
        refreshDriverLocation();

        const channel = supabase
            .channel(`driver-location-${tripSessionId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "driver_locations",
                    filter: `trip_session_id=eq.${tripSessionId}`,
                },
                (payload) => {
                    setDriverLocation(payload.new as DriverLocation);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripSessionId]);

    return { driverLocation };
};

// ─────────────────────────────────────────────────────────────
// Hook: useAvailableRoutesSubscription
// Escucha cambios en las sesiones de viaje disponibles (pendientes o activas).
// ─────────────────────────────────────────────────────────────
export const useAvailableRoutesSubscription = (onUpdate: () => void) => {
    useEffect(() => {
        const channel = supabase
            .channel("public:trip_sessions")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "trip_sessions",
                    filter: "status=in.(pending,active)",
                },
                () => {
                    onUpdate();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [onUpdate]);
};