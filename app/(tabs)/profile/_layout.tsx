import { Colors } from "@/constants/Colors";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function ProfileStackLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerStyle: { backgroundColor: Colors.light.tint },
        headerTitle: "",

      }}>
      <Stack.Screen name="index" options={{
        headerShown: false,
        headerLeft: () => <Text style={{ color: Colors.light.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Perfil</Text>,
      }} />
      <Stack.Screen name="activity" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="become-driver" options={{ headerShown: false }} />
    </Stack>
  );
}