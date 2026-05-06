import { Colors } from "@/constants/Colors";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface QuickActionCardProps {
    text: string
}

export default function QuickActionCard({ text }: QuickActionCardProps) {
    return (
        <ThemedView 
            lightColor={Colors.light.tint} 
            darkColor={Colors.dark.tint}
            className="w-48 h-48 p-1 items-center justify-center shadow-lg rounded-3xl">
            <ThemedText 
                lightColor={DefaultTheme.colors.background} 
                darkColor={DarkTheme.colors.background}
                className="text-2xl text-center"
            >
                {text}
            </ThemedText>
        </ThemedView>
    );
}