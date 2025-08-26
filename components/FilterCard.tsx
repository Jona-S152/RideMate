import { Colors } from "@/constants/Colors";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Pressable } from "react-native";
import { ThemedText } from "./ThemedText";

interface FilterCardProps {
    title: string,
    value: string,
    isSelected?: boolean
}

export default function FilterCard({ title, value, isSelected = false}: FilterCardProps) {
    return (
        <Pressable style={{ backgroundColor: isSelected ? Colors.light.secondary : Colors.light.tird }}
            className="rounded-full py-1 px-4 items-center mr-2">
                <ThemedText
                    lightColor={DefaultTheme.colors.text} 
                    darkColor={DarkTheme.colors.text}
                    className="text-lg font-normal">
                        {title}
                </ThemedText>
        </Pressable>
    );
}