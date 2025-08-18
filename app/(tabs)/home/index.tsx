import HistoryRouteCard from "@/components/history-route-card";
import QuickActionCard from "@/components/quick-actions-card";
import { Screen } from "@/components/screen";
import { Link } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

export default function HomeScreen() {
    return (
        <Screen>
            <ScrollView >
                <View className="flex-row justify-between items-center p-1">
                    <Link href="/(tabs)/home/route-detail" asChild>
                        <Pressable>
                            <QuickActionCard text="Ruta actual"/>
                        </Pressable>
                    </Link>
                    <Link href="/(tabs)/home/my-activity" asChild>
                        <Pressable>
                            <QuickActionCard text="Mi actividad"/>
                        </Pressable>
                    </Link>
                </View>

                {/* Divider */}
                <View className="my-2 h-px bg-gray-300" />
                
                <View className="flex-1 mx-1 rounded-xl">
                        <HistoryRouteCard title="Ruta 1"/>
                        <HistoryRouteCard title="Ruta 2"/>
                        <HistoryRouteCard title="Ruta 2"/>
                </View>
            </ScrollView>
        </Screen>
    );
}