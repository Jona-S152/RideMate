import { DarkTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function ProfileStackLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: "#794519"},
        headerTitle: "",
        headerLeft: () => <Text style={{ color: DarkTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Perfil</Text>,
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}