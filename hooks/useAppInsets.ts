import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Centralized safe area insets for edge-to-edge layouts.
 * Never use fixed `bottom` / `paddingBottom` / `paddingTop` for screen-edge content.
 * Use these values (or `useBottomTabOverflow()` when the floating tab bar is visible).
 * Map overlays: apply insets on the overlay, not the map container.
 */
export function useAppInsets() {
  const insets = useSafeAreaInsets();

  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    bottomWith: (extra = 0) => insets.bottom + extra,
    topWith: (extra = 0) => insets.top + extra,
  };
}
