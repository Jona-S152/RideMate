import { TAB_BAR_TOTAL_HEIGHT } from '@/constants/layout';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BlurTabBarBackground() {
  return (
    <BlurView
      tint="systemChromeMaterial"
      intensity={100}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function useBottomTabOverflow() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_TOTAL_HEIGHT + insets.bottom;
}
