/**
 * RideMate premium/glass palette based on approved mockup.
 * Primary background uses Deep Space Navy (#000A1C) and
 * layered surfaces use translucent navy cards.
 */

const tintColorLight = "#2563EB";
const tintColorDark = "#2563EB";

export const Colors = {
  light: {
    primary: "#000A1C",
    secondary: "#2563EB",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#F59E0B",
    background: "#000A1C",
    surface: "#0C162A",
    surfaceAlt: "#121721",
    card: "#0F1A2F",
    glass: "rgba(12, 22, 42, 0.9)",
    glassSoft: "rgba(12, 22, 42, 0.72)",
    glassStrong: "rgba(0, 10, 28, 0.92)",
    border: "rgba(226, 235, 240, 0.12)",
    borderSecondary: "#A0AECB",
    text: "#E2EBF0",
    textSecondary: "#A0AECB",
    textBlack: "#000000",
    tint: tintColorLight,
    icon: "#A0AECB",
    tabIconDefault: "#A0AECB",
    tabIconSelected: tintColorLight,
    historyCard: {
      background: "#121721",
      activeBackground: "#F59E0B",
    },
    tird: "#E5E5E5",
  },
  dark: {
    primary: "#374151",
    secondary: "#2563EB",
    success: "#10B981",
    warning: "#324563ff",
    danger: "#F59E0B",
    background: "#1F2937",
    surface: "#0C162A",
    surfaceAlt: "#121721",
    card: "#0F1A2F",
    glass: "#1F2937",
    glassSoft: "#1F2937",
    glassStrong: "#1F2937",
    border: "rgba(226, 235, 240, 0.12)",
    borderSecondary: "#4e5664ff",
    borderWarning: "#445c80ff",
    text: "#E2EBF0",
    textSecondary: "#A0AECB",
    textBlack: "#000000",
    tint: tintColorDark,
    icon: "#A0AECB",
    tabIconDefault: "#A0AECB",
    tabIconSelected: tintColorDark,
    historyCard: {
      background: "#121721",
      activeBackground: "#F59E0B",
    },
    tird: "#E5E5E5",
  },
};
