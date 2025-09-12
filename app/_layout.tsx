import { Redirect, Slot } from 'expo-router';
import 'react-native-reanimated';
import AuthProvider, { useAuth } from './context/AuthContext';

function RootLayoutNav() {
  const { token } = useAuth();

  // Mientras carga el token desde AsyncStorage
  if (token === undefined) return null; // o ActivityIndicator

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav /> {/* Este componente decide qué Slot mostrar */}
      <Slot />
    </AuthProvider>
  );
}
