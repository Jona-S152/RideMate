import { Colors } from "@/constants/Colors";
import { BlurView } from "expo-blur";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface GlassCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  overlayColor?: string;
}

export default function GlassCard({
  children,
  style,
  intensity = 25,
  tint = "dark",
  overlayColor = Colors.dark.primary,
}: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
});
