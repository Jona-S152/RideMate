import { useThemeColor } from "@/hooks/useThemeColor";
import { Pressable } from "react-native";
import { ThemedText } from "./ThemedText";

interface FilterCardProps {
    title: string,
    value: string,
    isSelected?: boolean,
    onPress?: (value: string) => void
}

export default function FilterCard({ title, value, isSelected = false, onPress }: FilterCardProps) {
    const secondaryColor = useThemeColor({}, 'secondary');
    const tirdColor = useThemeColor({}, 'tird');

    return (
        <Pressable
            onPress={() => onPress?.(value)}
            style={{ backgroundColor: isSelected ? secondaryColor as string : tirdColor as string }}
            className="rounded-full py-1 px-4 items-center mr-2">
            <ThemedText
                className="text-lg font-normal">
                {title}
            </ThemedText>
        </Pressable>
    );
}