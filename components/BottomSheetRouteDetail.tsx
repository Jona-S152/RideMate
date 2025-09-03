import { Colors } from "@/constants/Colors";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export default function BottomSheetRouteDetail() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [ currentSnapPoint, setCurrentSnapPoint ] = useState<number>(0);
  const snapPoints = useMemo(() => ["45%"], []);
  const animatedIndex = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => {
  const opacity = interpolate(animatedIndex.value, [0, 1], [0, 1]);
  const translateY = interpolate(animatedIndex.value, [0, 1], [20, 0]);
  const maxHeight = interpolate(animatedIndex.value, [0, 1], [0, 500]); 
  return {
    opacity,
    transform: [{ translateY }],
    maxHeight, // esto evita que deje hueco cuando está colapsado
    overflow: "hidden",
  };
});

  const handleSheetChanges = useCallback((index: number) => {
    setCurrentSnapPoint(index);
    animatedIndex.value = index; // actualiza el índice animado
    console.log("handleSheetChanges", index);
  }, []);

  const HandleDragToResize = () => (
    <ThemedView
        lightColor={Colors.light.secondary}
        className="px-4 py-2 rounded-b-full self-center min-w-[100px] min-h-[50px] items-center justify-center">
            <ThemedText
                lightColor={Colors.light.text}
                className="text-2xl font-bold">
                    23Km
            </ThemedText>
    </ThemedView>
  )

  return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={false}
        backgroundStyle={{
            backgroundColor: Colors.light.primary,
            borderTopLeftRadius: 100,
            borderTopRightRadius: 100,
        }}
        handleComponent={HandleDragToResize}
      >
        <BottomSheetView>
          <View className="my-6 px-6">
            {/* Siempre visible */}
            <ThemedText
              lightColor={Colors.light.text}
              className="font-bold text-3xl"
            >
              Ruta Sur - Norte
            </ThemedText>

            {/* Visible solo cuando el bottomsheet se expande */}
            {/* { currentSnapPoint > 0 && ( */}
              <Animated.View style={animatedContentStyle}>
              <View className="mt-6">
                <ThemedText lightColor={Colors.light.text}>
                  Arrastra el BottomSheet para cambiar su altura.
                </ThemedText>
                <ThemedText lightColor={Colors.light.text}>
                  Este contenido se adapta dinámicamente.
                </ThemedText>
                <ThemedText lightColor={Colors.light.text}>
                  Otro contenido adicional.
                </ThemedText>
                <ThemedText lightColor={Colors.light.text}>
                  Y más información aquí.
                </ThemedText>
              </View>
            </Animated.View>
            {/* )
            } */}
          </View>
        </BottomSheetView>  
      </BottomSheet>
  );
}
