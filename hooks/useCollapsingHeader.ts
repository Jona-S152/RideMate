import { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface Props {
  expanded: number;
  collapsed: number;
  keyboardHeight: number;
}

export function useCollapsingHeader({
  expanded,
  collapsed,
  keyboardHeight,
}: Props) {
  const height = useRef(new Animated.Value(expanded)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: keyboardHeight > 0 ? collapsed : expanded,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [keyboardHeight, expanded, collapsed]);

  return height;
}
