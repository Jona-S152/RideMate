export const DRIVER_ONLY_SCREENS = [
  "create-route-screen",
  "driver",
  "edit-driver",
] as const;

export const PASSENGER_ONLY_SCREENS = [
  "passenger",
] as const;

export const COMMON_SCREENS = [
  "index",
  "route-detail",
  "route-preview",
  "selection-map-screen",
  "navigation-screen",
  "activity",
  "edit-profile",
  "become-driver",
] as const;

export type DriverOnlyScreen = (typeof DRIVER_ONLY_SCREENS)[number];
export type PassengerOnlyScreen = (typeof PASSENGER_ONLY_SCREENS)[number];
export type CommonScreen = (typeof COMMON_SCREENS)[number];

export type TabName = "home" | "available-routes" | "profile";

export interface TabRootMap {
  driver: string;
  passenger: string;
}

/**
 * Define la ruta raíz adecuada dentro de cada pestaña según el modo activo.
 */
export const TAB_ROOT_ROUTES: Record<TabName, TabRootMap> = {
  home: {
    driver: "index",
    passenger: "index",
  },
  "available-routes": {
    driver: "driver",
    passenger: "passenger",
  },
  profile: {
    driver: "index",
    passenger: "index",
  },
};

/**
 * Verifica si una pantalla es exclusiva de conductor.
 */
export function isDriverOnlyScreen(screenName: string): boolean {
  return DRIVER_ONLY_SCREENS.includes(screenName as DriverOnlyScreen);
}

/**
 * Verifica si una pantalla es exclusiva de pasajero.
 */
export function isPassengerOnlyScreen(screenName: string): boolean {
  return PASSENGER_ONLY_SCREENS.includes(screenName as PassengerOnlyScreen);
}

/**
 * Valida si una pantalla es permitida según el modo activo.
 */
export function isScreenAllowedForMode(screenName: string, isDriverMode: boolean): boolean {
  if (isDriverOnlyScreen(screenName)) return isDriverMode;
  if (isPassengerOnlyScreen(screenName)) return !isDriverMode;
  return true;
}
