import { useThemeColor } from "@/hooks/useThemeColor";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../ui/ThemedText";
import { Colors } from "@/constants/Colors";
import { BlurView } from "expo-blur";

interface FilterCardProps {
    title: string,
    value: string,
    isSelected?: boolean,
    onPress?: (value: string) => void
}

export default function FilterCard({ title, value, isSelected = false, onPress }: FilterCardProps) {
    const secondaryColor = useThemeColor({}, 'secondary');

    return (
        <Pressable
            onPress={() => onPress?.(value)}
            style={({ pressed }) => [{
                backgroundColor: isSelected ? secondaryColor as string : Colors.dark.glassSoft,
                borderWidth: 1,
                borderColor: isSelected ? "rgba(0, 10, 28, 0.45)" : Colors.dark.border,
                opacity: pressed ? 0.92 : 1,
                overflow: "hidden",
            }]}
            className="rounded-full py-1 px-4 items-center mr-2">
            {!isSelected && (
                <>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.dark.glassSoft }]} />
                </>
            )}
            <ThemedText
                className="text-lg font-normal"
                style={{ color: isSelected ? Colors.dark.primary : Colors.dark.text }}>
                {title}
            </ThemedText>
        </Pressable>
    );
}