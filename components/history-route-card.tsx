import { Colors } from "@/constants/Colors";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface HistoryRouteProps{
    title: string
}

export default function HistoryRouteCard({ title }: HistoryRouteProps) {
    return (
        <ThemedView
            lightColor={Colors.light.historyCard.background}
            darkColor={Colors.dark.tint}
            className="rounded-2xl my-1 p-5 h-44">
                <ThemedText
                    lightColor={DefaultTheme.colors.text} 
                    darkColor={DarkTheme.colors.text}
                    className="text-2xl">
                        {title}
                </ThemedText>
        </ThemedView>
    );
}