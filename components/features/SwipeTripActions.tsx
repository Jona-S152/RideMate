import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  Extrapolate,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_WIDTH = SCREEN_WIDTH - 32;
const BUTTON_HEIGHT = 64;
const HANDLE_SIZE = 56;
const SWIPE_THRESHOLD = BUTTON_WIDTH / 3;

interface SwipeTripActionsProps {
  onStart: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SwipeTripActions: React.FC<SwipeTripActionsProps> = ({ onStart, onCancel, isLoading }) => {
  const translateX = useSharedValue(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const onSwipeRight = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStart();
  };

  const onSwipeLeft = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onCancel();
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      runOnJS(setIsSwiping)(true);
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
    },
    onEnd: (event) => {
      runOnJS(setIsSwiping)(false);
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(BUTTON_WIDTH / 2 - HANDLE_SIZE / 2 - 4);
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-(BUTTON_WIDTH / 2 - HANDLE_SIZE / 2 - 4));
        runOnJS(onSwipeLeft)();
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedHandleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [Colors.dark.danger, Colors.dark.surfaceAlt, Colors.dark.secondary]
    );

    return {
      backgroundColor,
    };
  });

  const animatedCancelTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD / 2, 0],
      [1, 0.5, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const animatedStartTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD / 2, SWIPE_THRESHOLD],
      [0, 0.5, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const animatedDefaultTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD / 2, 0, SWIPE_THRESHOLD / 2],
      [0, 1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  return (
    <View className="mx-4 mb-8">
      <Animated.View
        style={[styles.container, animatedBackgroundStyle]}
      >
        {/* Labels */}
        <View style={styles.labelsContainer}>
          <Animated.View style={[styles.label, animatedStartTextStyle]}>
            <ThemedText className="text-white font-bold">INICIAR</ThemedText>
          </Animated.View>

          <Animated.View className="flex-row justify-between mx-4" style={[styles.labelCenter, animatedDefaultTextStyle]}>
            <ThemedText className="text-[#A0AECB] text-xs font-medium">
              {"< Cancelar"}
            </ThemedText>
            <ThemedText className="text-[#A0AECB] text-xs font-medium">{"|"}</ThemedText>
            <ThemedText className="text-[#A0AECB] text-xs font-medium">
              {"Iniciar >"}
            </ThemedText>
          </Animated.View>

          <Animated.View style={[styles.label, animatedCancelTextStyle]}>
            <ThemedText className="text-white font-bold">CANCELAR</ThemedText>
          </Animated.View>
        </View>

        {/* Handle */}
        <PanGestureHandler onGestureEvent={gestureHandler} enabled={!isLoading}>
          <Animated.View style={[styles.handle, animatedHandleStyle]}>
            <View style={styles.handleInner}>
              <Ionicons
                name={translateX.value > 0 ? "chevron-forward" : translateX.value < 0 ? "chevron-back" : "reorder-two"}
                size={24}
                color="white"
              />
            </View>
          </Animated.View>
        </PanGestureHandler>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: BUTTON_HEIGHT,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226, 235, 240, 0.1)',
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: Colors.dark.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  handleInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  label: {
    flex: 1,
    alignItems: 'center',
  },
  labelCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  }
});
