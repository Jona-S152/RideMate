import { useFocusEffect, router } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

/**
 * Custom hook to intercept native back events (Android hardware back button & gestures).
 * If the navigation stack can go back, it performs router.back().
 * Otherwise, it navigates safely to the provided fallbackRoute to prevent the app from closing.
 */
export function useSafeBackHandler(fallbackRoute: string = "/(tabs)/home") {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (router.canGoBack()) {
          router.back();
          return true;
        } else {
          router.replace(fallbackRoute as any);
          return true;
        }
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [fallbackRoute])
  );
}
