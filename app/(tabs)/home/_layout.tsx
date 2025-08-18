import { DarkTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function HomeStackLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: "#794519"},
        headerTitle: "",
        headerLeft: () => <Text style={{ color: DarkTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>RideMate</Text>,
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}