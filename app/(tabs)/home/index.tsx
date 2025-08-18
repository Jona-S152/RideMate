import HistoryRouteCard from "@/components/history-route-card";
import QuickActionCard from "@/components/quick-actions-card";
import { Screen } from "@/components/screen";
import { ScrollView, View } from "react-native";

export default function HomeScreen() {
    return (
        <Screen>
            <View className="flex-row justify-between items-center p-1">
                <QuickActionCard text="Ruta actual"/>
                <QuickActionCard text="Mi actividad"/>
            </View>

            {/* Divider */}
            <View className="my-2 h-px bg-gray-300" />
            
            <View className="flex-1 mx-1 rounded-xl">
                <ScrollView >
                    <HistoryRouteCard title="Ruta 1"/>
                    <HistoryRouteCard title="Ruta 2"/>
                    <HistoryRouteCard title="Ruta 2"/>
                </ScrollView>
            </View>
        </Screen>
    );
}