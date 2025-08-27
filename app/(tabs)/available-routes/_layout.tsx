import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function HomeStackLayout() {
  const colorScheme = useColorScheme();
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: Colors.light.tint },
        headerTitle: "",
        headerTransparent: true,
        headerLeft: () => <Text style={{ color: Colors.light.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Rutas disponibles</Text>,
      }}>
      <Stack.Screen name="index" options={{
        headerShown: false,
      }} />
      <Stack.Screen name="route-detail" options={{ 
        headerShown: false 
      }} />
    </Stack>
  );
}