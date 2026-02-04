import { User } from '@/app/context/AuthContext';
import { DriverLocation, SessionData, TripSessionStops } from '@/interfaces/available-routes';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

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

            setSession(data as SessionData)
        } catch (error) {
            setSession(null);
        }
    }

    useEffect(() => {
        refreshSession();

        try {
            // 1. Suscribirse a cambios en la tabla trip_sessions
            const channel = supabase
                .channel(`session-${sessionId}`) // Nombre único para el canal
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE', // Solo nos interesan las actualizaciones
                        schema: 'public',
                        table: 'trip_sessions',
                        filter: `id=eq.${sessionId}`, // Filtro crucial para no escuchar otros viajes
                    },
                    (payload) => {
                        const newData = payload.new as SessionData;
                        setSession(newData); // Actualiza el estado automáticamente
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };

        } catch (error) {
            console.error("ERROR: ", error);
        }
    }, [sessionId]);

    return { session };
};

export const useActiveSession = (user: User | null) => {
    const [activeSession, setActiveSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. La función de carga original adaptada
    const refreshSession = async () => {
        if (!user?.id) return;

        try {
            if (user.driver_mode) {
                const { data } = await supabase
                    .from('trip_sessions')
                    .select("*, routes(image_url)")
                    .eq('driver_id', user.id)
                    .in('status', ["pending", "active"])
                    .is('end_time', null)
                    .order('start_time', { ascending: false })
                    .limit(1)
                    .maybeSingle(); // Usamos maybeSingle para evitar errores si no hay nada

                setActiveSession(data as SessionData);
            } else {
                // Lógica de pasajero
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
                    setActiveSession(null);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshSession();

        // 2. CONFIGURACIÓN REALTIME
        const channel = supabase
            .channel('session_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'trip_sessions' },
                () => refreshSession() // Re-ejecuta la lógica ante cualquier cambio relevante
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'passenger_trip_sessions' },
                () => refreshSession()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                refreshSession();
            }
        }, [user?.id, user?.driver_mode])
    );

    return { activeSession, loading, refreshSession };
};

export const useTripStops = (tripSessionId: number) => {
    const [stops, setStops] = useState<TripSessionStops[]>([]);

    const refreshStops = async () => {
        if (!tripSessionId) return;

        try {
            const { data, error } = await supabase
                .from("trip_session_stops")
                .select("*")
                .eq("trip_session_id", tripSessionId)

            setStops(data as TripSessionStops[])
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        refreshStops();

        const channel = supabase
            .channel(`session-stops-${tripSessionId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'trip_session_stops' },
                () => refreshStops() // Re-ejecuta la lógica ante cualquier cambio relevante
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tripSessionId]);

    return { stops };
}

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

            setDriverLocation(data as DriverLocation);
        } catch (error) {
            console.error("ERROR: ", error);
            return;
        }
    }

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

    return { driverLocation }
}