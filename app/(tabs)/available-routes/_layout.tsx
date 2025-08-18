import { useColorScheme } from "@/hooks/useColorScheme";
import { DefaultTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function HomeStackLayout() {
  const colorScheme = useColorScheme();
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: "#F2DD6C"},
        headerTitle: "",
        headerLeft: () => <Text style={{ color: DefaultTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Rutas disponibles</Text>,
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}