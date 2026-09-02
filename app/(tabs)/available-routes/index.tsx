import { useAuth } from "@/app/context/AuthContext";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect } from "react";

export default function AvailableRoutesIndex() {
    const { user } = useAuth();
    const isFocused = useIsFocused();

    useEffect(() => {
        if (!isFocused || !user) return;

        if (user.driver_mode) {
            console.log("[AvailableRoutesIndex] Redirecting focused route to /driver");
            router.replace("/(tabs)/available-routes/driver");
        } else {
            console.log("[AvailableRoutesIndex] Redirecting focused route to /passenger");
            router.replace("/(tabs)/available-routes/passenger");
        }
    }, [isFocused, user?.driver_mode]);

    return null;
}