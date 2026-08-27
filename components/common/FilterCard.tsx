import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../ui/ThemedText";

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
            style={{
                backgroundColor: isSelected ? Colors.dark.secondary : Colors.dark.glassSoft,
                borderWidth: 1,
                borderColor: Colors.dark.border,
                opacity: 1,
                overflow: "hidden",
            }}
            className="rounded-full py-1 px-4 items-center mr-2">
            {!isSelected && (
                <>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.dark.glassSoft }]} />
                </>
            )}
            <ThemedText
                className="text-lg font-normal"
                style={{ color: Colors.dark.text }}>
                {title}
            </ThemedText>
        </Pressable>
    );
}