import { useAuth } from "@/app/context/AuthContext";
import {
  isScreenAllowedForMode,
  TAB_ROOT_ROUTES,
  TabName,
} from "@/constants/navigationRegistry";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback } from "react";
import Toast from "react-native-toast-message";

export function useModeNavigation() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const isDriverMode = user?.driver_mode ?? false;

  /**
   * Navega a una pestaña específica y opcionalmente a una sub-pantalla dentro de ella,
   * garantizando un stack base limpio adecuado al modo activo.
   */
  const navigateToTab = useCallback(
    (targetTab: TabName, targetScreen?: string, params?: Record<string, any>) => {
      const modeKey = isDriverMode ? "driver" : "passenger";
      const rootScreen = TAB_ROOT_ROUTES[targetTab][modeKey];

      // Si se especifica una sub-pantalla, verificar que sea permitida para el modo actual
      if (targetScreen && !isScreenAllowedForMode(targetScreen, isDriverMode)) {
        Toast.show({
          type: "warning",
          text1: "Acceso restringido",
          text2: isDriverMode
            ? "Esta pantalla no está disponible en modo Conductor."
            : "Debes estar en modo Conductor para acceder a esta función.",
        });
        return;
      }

      const parentNav = navigation.getParent() || navigation;

      if (targetScreen && targetScreen !== rootScreen) {
        // Construir stack base + sub-pantalla activa
        parentNav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: targetTab,
                state: {
                  index: 1,
                  routes: [
                    { name: rootScreen },
                    { name: targetScreen, params },
                  ],
                },
              },
            ],
          })
        );
      } else {
        // Navegar directamente a la raíz de la pestaña para el modo actual
        parentNav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: targetTab,
                state: {
                  index: 0,
                  routes: [{ name: rootScreen, params }],
                },
              },
            ],
          })
        );
      }
    },
    [isDriverMode, navigation]
  );

  /**
   * Limpia y purga las pestañas secundarias (available-routes, profile) al conmutar de modo
   * (Pasajero <-> Conductor), asegurando que ninguna pantalla del modo anterior persista.
   */
  const sanitizeStacksOnModeSwitch = useCallback(
    (newDriverMode: boolean) => {
      const parentNav = navigation.getParent() || navigation;
      const targetRoute = newDriverMode ? "driver" : "passenger";

      try {
        // Resetear available-routes con el stack adecuado al nuevo modo
        parentNav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: "home",
                state: {
                  index: 0,
                  routes: [{ name: "index" }],
                },
              },
            ],
          })
        );
      } catch (error) {
        console.error("Error al purgar los stacks por cambio de modo:", error);
      }
    },
    [navigation]
  );

  return {
    isDriverMode,
    navigateToTab,
    sanitizeStacksOnModeSwitch,
  };
}
