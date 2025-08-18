import { DefaultTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Text } from "react-native";

export default function ProfileStackLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { backgroundColor: "#F2DD6C"},
        headerTitle: "",
        
      }}>
      <Stack.Screen name="index" options={{
        headerLeft: () => <Text style={{ color: DefaultTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Perfil</Text>,
      }} />
      <Stack.Screen name="edit-profile" options={{
        headerLeft: () => <Text style={{ color: DefaultTheme.colors.text, fontSize: 40, paddingBottom: 10, fontWeight: 'bold' }}>Editar perfil</Text>,
      }} />
    </Stack>
  );
}