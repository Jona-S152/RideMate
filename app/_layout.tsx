import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { Slot } from 'expo-router';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // const { user } = useAuth();

  //  if (!user) {
  //   return <Slot initialRouteName="(auth)" />; // no autenticado
  // }

  // return <Slot initialRouteName="(tabs)" />; // autenticado

  return (
      <Slot initialRouteName="(tabs)"/>
  );
}
