import { Colors } from "@/constants/Colors";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function HomeStackLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: Colors.light.tint},
        headerTitle: "",
      }}>
      <Stack.Screen name="index" options={{
        headerLeft: () => <Text style={{ color: Colors.light.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>RideMate</Text>,
      }}/>
      <Stack.Screen name="my-activity" options={{
        headerLeft: () => <Text style={{ color: Colors.light.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Mi actividad</Text>,
      }} />
      <Stack.Screen name="route-detail" options={{
        headerLeft: () => <Text style={{ color: Colors.light.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Detalles de la ruta</Text>,
      }} />
    </Stack>
  );
}