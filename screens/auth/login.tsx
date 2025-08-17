import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Link } from "expo-router";
import { Pressable } from "react-native";

export default function LoginScreen () {
    return (
    <ThemedView
        lightColor={DefaultTheme.colors.background}
        darkColor={DarkTheme.colors.background}
        style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
        >
        <ThemedText
            lightColor={DefaultTheme.colors.text}
            darkColor={DarkTheme.colors.text}
            >
            Login Screen
        </ThemedText>
        <Link href="/(tabs)/home" asChild>
            <Pressable 
                style={{ margin: 10, padding: 10, borderRadius: 15, backgroundColor: DefaultTheme.colors.primary}}>
                <ThemedText
                    style={{ color: 'white'}}
                    >
                    Login Screen
                </ThemedText>
            </Pressable>
        </Link>
    </ThemedView>
    );
}