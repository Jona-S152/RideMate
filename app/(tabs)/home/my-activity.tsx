import HistoryRouteCard from "@/components/history-route-card";
import { Screen } from "@/components/screen";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function MyActivityScreen() {
    const [ text, setText ] = useState<string>('');
    return (
        <Screen>
            <View className="flex-row justify-between items-center p-1">
                <ThemedTextInput placeholder="Buscar..." onChangeText={setText} value={text}>

                </ThemedTextInput>
                <Pressable style={{backgroundColor: '#F2DD6C'}} className="rounded-full w-10 h-10">
                    
                </Pressable>
            </View>

            {/* Divider */}
            <View className="my-2 h-px bg-gray-300" />

            <View className="flex-1 mx-1 rounded-xl">
                <ScrollView>
                    <HistoryRouteCard title="Ruta 1"/>
                    <HistoryRouteCard title="Ruta 2"/>
                    <HistoryRouteCard title="Ruta 3"/>
                    <HistoryRouteCard title="Ruta 4"/>
                    <HistoryRouteCard title="Ruta 5"/>
                    <HistoryRouteCard title="Ruta 6"/>
                    <HistoryRouteCard title="Ruta 7"/>
                    <HistoryRouteCard title="Ruta 8"/>
                    <HistoryRouteCard title="Ruta 9"/>
                    <HistoryRouteCard title="Ruta 10"/>
                </ScrollView>
            </View>
        </Screen>
    );
}