import { Redirect, Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../services/backgroundLocation.task';
import AuthProvider, { useAuth } from './context/AuthContext';
import SessionProvider from './context/SessionContext';

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
    <GestureHandlerRootView className='flex-1'>
      <AuthProvider>
        <SessionProvider>
          <Slot />
        </SessionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
