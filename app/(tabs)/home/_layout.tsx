import { DefaultTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function HomeStackLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: "#F2DD6C"},
        headerTitle: "",
      }}>
      <Stack.Screen name="index" options={{
        headerLeft: () => <Text style={{ color: DefaultTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>RideMate</Text>,
      }}/>
      <Stack.Screen name="my-activity" options={{
        headerLeft: () => <Text style={{ color: DefaultTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Mi actividad</Text>,
      }} />
      <Stack.Screen name="route-detail" options={{
        headerLeft: () => <Text style={{ color: DefaultTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Detalles de la ruta</Text>,
      }} />
    </Stack>
  );
}