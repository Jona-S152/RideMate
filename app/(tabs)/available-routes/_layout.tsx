import { Stack } from "expo-router";

export default function AvailableRoutesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="passenger" />
      <Stack.Screen name="driver" />
      <Stack.Screen name="create-route-screen" />
      <Stack.Screen name="route-detail" />
      <Stack.Screen name="selection-map-screen" />
      <Stack.Screen name="route-preview" />
    </Stack>
  );
}