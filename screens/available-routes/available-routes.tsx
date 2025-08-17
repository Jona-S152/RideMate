import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

export default function AvailableRoutesScreen() {
    return (
        <ThemedView
            lightColor={DefaultTheme.colors.background}
            darkColor={DarkTheme.colors.background}
            style={{ padding: 10 }}>
                <ThemedText>
                    AVAILABLE ROUTES SCREEN
                </ThemedText>
        </ThemedView>
    );
}