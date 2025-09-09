import { ThemedView } from "@/components/ThemedView";
import { useNavigation } from "expo-router";
import { Pressable, Text } from "react-native";

export default function RegisterScreen() {
    const navigation = useNavigation();
    return (
        <ThemedView className="items-center justify-center h-full">
            <Pressable onPress={() => navigation.goBack()}>
                <Text>
                    Regresar
                </Text>
            </Pressable>
        </ThemedView>
    );
}