import { useAuth } from "@/app/context/AuthContext";
import BottomSheetRouteDetail from "@/components/features/BottomSheetRouteDetail";
import { useTripRealtimeById } from "@/hooks/useRealTime";
import { PassengerTripSession, UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RouteDetail() {
    const params = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { session } = useTripRealtimeById(Number(params.id));
    const [passengers, setPassengers] = useState<PassengerTripSession[]>([]);
    const [sessionUsers, setSessionUsers] = useState<UserData[]>([]);

    const fetchPassengers = async () => {
        if (!params.id) return;

        const { data, error } = await supabase
            .from("passenger_trip_sessions")
            .select("*")
            .eq("trip_session_id", params.id);

        if (error) {
            console.error("Error fetching passengers:", error);
            return;
        }

        setPassengers(data || []);
        return data || [];
    };

    const fetchSessionUsers = async (passengerSessions: PassengerTripSession[]) => {
        if (!passengerSessions.length) {
            setSessionUsers([]);
            return [];
        }

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .in('id', passengerSessions.map(p => p.passenger_id));

        if (error) {
            console.error("Error fetching session users:", error);
            return [];
        }

        // Fetch ratings for all these users
        const userIds = data.map(u => u.id);
        const ratingsMap = await ratingsService.getUsersRatings(userIds);

        const userData = data.map(u => ({
            ...(u as UserData),
            rating: ratingsMap[u.id]?.rating || 0,
            rating_count: ratingsMap[u.id]?.count || 0
        }));

        setSessionUsers(userData);
        return userData;
    };

    useEffect(() => {
        fetchPassengers().then(data => {
            if (data) fetchSessionUsers(data);
        });
    }, [params.id]);

    return (
        <GestureHandlerRootView className="flex-1">
            <BottomSheetRouteDetail
                passengers={passengers}
                users={sessionUsers}
                session={session}
            />
        </GestureHandlerRootView>
    );
}