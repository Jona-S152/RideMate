import { Colors } from "@/constants/Colors";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef } from "react";
import { Text } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export default function BottomSheetRouteDetail() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["30%", "40%"], []);
  const animatedIndex = useSharedValue(0);

  const handleSheetChanges = useCallback((index: number) => {
    animatedIndex.value = index; // actualiza el índice animado
    console.log("handleSheetChanges", index);
  }, []);

  const HandleDragToResize = () => (
    <ThemedView
        lightColor={Colors.light.secondary}
        className="self-center rounded-full px-3 py-2 my-6 min-w-[60px] items-center justify-center absolute -top-6 z-10">
            <ThemedText
                lightColor={Colors.light.text}
                className="text-base font-bold">
                    23
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
            borderTopLeftRadius: 80,
            borderTopRightRadius: 80,
        }}
        handleComponent={HandleDragToResize}
      >
        <Animated.View className="pt-16 px-4">
          <BottomSheetView>
            <Text className="text-lg font-bold mb-2">
              Información del BottomSheet
            </Text>
            <Text>Arrastra el BottomSheet para cambiar su altura.</Text>
            <Text>Este contenido se adapta dinámicamente.</Text>
          </BottomSheetView>
        </Animated.View>
      </BottomSheet>
  );
}
