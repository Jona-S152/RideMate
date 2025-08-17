import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

export default function HomeScreen() {
    return (
        <ThemedView
            lightColor={DefaultTheme.colors.background}
            darkColor={DarkTheme.colors.background}
            style={{ padding: 20 }}>
                <ThemedText>
                    HOME SCREEN
                </ThemedText>
        </ThemedView>
    );
}