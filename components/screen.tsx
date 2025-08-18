import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { ReactNode } from "react";
import { ThemedView } from "./ThemedView";

interface ScreenProps {
  children: ReactNode;
}

export function Screen({ children }: ScreenProps) {
    return (
        <ThemedView
            lightColor={DefaultTheme.colors.background}
            darkColor={DarkTheme.colors.background}
            className="flex-1 pt-4 px-2"
            >
                {children}
        </ThemedView>
    );
}