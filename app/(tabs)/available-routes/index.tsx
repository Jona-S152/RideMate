import { useAuth } from "@/app/context/AuthContext";
import { Redirect } from "expo-router";

export default function AvailableRoutesIndex() {
    const { user } = useAuth();

    console.log("Driver mode", user?.driver_mode);

    if (user?.driver_mode) {
        console.log("Driver mode");
        return <Redirect href="/(tabs)/available-routes/driver" />;
    }

    console.log("Passenger mode");
    return <Redirect href="/(tabs)/available-routes/passenger" />;
}