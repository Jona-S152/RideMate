import { TAB_BAR_TOTAL_HEIGHT } from '@/constants/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default undefined;

export function useBottomTabOverflow() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_TOTAL_HEIGHT + insets.bottom;
}
