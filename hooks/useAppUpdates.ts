import * as Updates from "expo-updates";
import { AppState, AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

const FOREGROUND_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Checks and downloads compatible EAS Updates without interrupting the user.
 * An already downloaded update is applied only when the UI explicitly requests it.
 */
export function useAppUpdates() {
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastCheckAtRef = useRef<number>(0);
  const isCheckingRef = useRef(false);
  const updateReadyRef = useRef(false);
  const updateDismissedRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (
      __DEV__ ||
      !Updates.isEnabled ||
      isCheckingRef.current ||
      updateReadyRef.current ||
      updateDismissedRef.current
    ) {
      return;
    }

    isCheckingRef.current = true;
    lastCheckAtRef.current = Date.now();

    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) return;

      await Updates.fetchUpdateAsync();
      updateReadyRef.current = true;
      setIsUpdateReady(true);
    } catch (error) {
      // Network failures must never interrupt an active user flow.
      console.warn("[updates] Unable to check for an app update:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();

    const subscription = AppState.addEventListener("change", (nextState) => {
      const returnedToForeground =
        (appStateRef.current === "background" || appStateRef.current === "inactive") &&
        nextState === "active";
      appStateRef.current = nextState;

      if (
        returnedToForeground &&
        Date.now() - lastCheckAtRef.current >= FOREGROUND_CHECK_INTERVAL_MS
      ) {
        void checkForUpdate();
      }
    });

    return () => subscription.remove();
  }, [checkForUpdate]);

  const dismissUpdate = useCallback(() => {
    updateDismissedRef.current = true;
    setIsUpdateReady(false);
  }, []);

  const applyUpdate = useCallback(async () => {
    if (!updateReadyRef.current) return;

    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.warn("[updates] Unable to reload the downloaded update:", error);
    }
  }, []);

  return {
    isUpdateReady,
    dismissUpdate,
    applyUpdate,
  };
}
