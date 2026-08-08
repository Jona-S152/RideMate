import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Animated, LayoutChangeEvent, PanResponder, Text, View } from "react-native";

interface SlideToConfirmButtonProps {
  onConfirm: () => void;
  title?: string;
  disabled?: boolean;
}

export default function SlideToConfirmButton({
  onConfirm,
  title = "Desliza para confirmar a bordo",
  disabled = false,
}: SlideToConfirmButtonProps) {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerWidthRef = useRef<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const pan = useRef(new Animated.Value(0)).current;

  const KNOB_SIZE = 50;
  const PADDING = 4;

  const getMaxSlide = () => {
    const w = containerWidthRef.current || containerWidth || 280;
    return Math.max(0, w - KNOB_SIZE - PADDING * 2);
  };

  const maxSlide = getMaxSlide();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isCompleted,
      onStartShouldSetPanResponderCapture: () => !disabled && !isCompleted,
      onMoveShouldSetPanResponder: (_, gestureState) => !disabled && !isCompleted && Math.abs(gestureState.dx) > 2,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => !disabled && !isCompleted && Math.abs(gestureState.dx) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        pan.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (disabled || isCompleted) return;
        const currentMaxSlide = getMaxSlide();
        if (currentMaxSlide <= 0) return;
        const newValue = Math.min(Math.max(0, gestureState.dx), currentMaxSlide);
        pan.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled || isCompleted) return;
        const currentMaxSlide = getMaxSlide();
        if (currentMaxSlide <= 0) return;

        if (gestureState.dx >= currentMaxSlide * 0.75) {
          Animated.timing(pan, {
            toValue: currentMaxSlide,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            setIsCompleted(true);
            onConfirm();
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      containerWidthRef.current = width;
      setContainerWidth(width);
    }
  };

  const textOpacity = pan.interpolate({
    inputRange: [0, Math.max(1, maxSlide * 0.7)],
    outputRange: [1, 0.1],
    extrapolate: "clamp",
  });

  return (
    <View
      onLayout={handleLayout}
      className="h-16 bg-slate-900 rounded-2xl justify-center overflow-hidden relative shadow-md border border-slate-800"
      style={{ padding: PADDING }}
    >
      {/* Background fill */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: pan.interpolate({
            inputRange: [0, Math.max(1, maxSlide)],
            outputRange: [KNOB_SIZE + PADDING, containerWidth || 280],
            extrapolate: "clamp",
          }),
          backgroundColor: Colors.light.secondary,
          borderRadius: 16,
        }}
      />

      {/* Title Text */}
      <Animated.View style={{ opacity: textOpacity }} className="absolute inset-0 items-center justify-center pointer-events-none">
        <Text className="text-white font-bold text-sm tracking-wide px-12 text-center">
          {title} »
        </Text>
      </Animated.View>

      {/* Sliding Knob */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX: pan }],
          width: KNOB_SIZE,
          height: KNOB_SIZE,
        }}
        className="bg-white rounded-xl items-center justify-center shadow-lg z-10"
      >
        <Ionicons
          name={isCompleted ? "checkmark-circle" : "chevron-forward-outline"}
          size={28}
          color={Colors.light.secondary}
        />
      </Animated.View>
    </View>
  );
}
