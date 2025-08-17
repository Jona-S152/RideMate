import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

export default function ProfileScreen() {
    return (
        <ThemedView
            lightColor={DefaultTheme.colors.background}
            darkColor={DarkTheme.colors.background}
            style={{ padding: 20 }}>
                <ThemedText>
                    PROFILE SCREEN
                </ThemedText>
        </ThemedView>
    );
}