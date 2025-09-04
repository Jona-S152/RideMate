import { Colors } from "@/constants/Colors";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image, ScrollView, View } from "react-native";
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
    // console.log("handleSheetChanges", index);
  }, []);

  const HandleDragToResize = () => (
    <View className="flex-row justify-between ml-7">
      <View className="">
        <ThemedText
          lightColor={Colors.light.text}
          className="font-bold text-3xl pt-8"
        >
          Ruta Sur - Norte
        </ThemedText>
      </View>
      <ThemedView
          lightColor={Colors.light.secondary}
          className="p-4 mr-4 rounded-b-full self-end min-w-[100px] min-h-[50px] items-center justify-center">
              <ThemedText
                  lightColor={Colors.light.text}
                  className="text-sm font-light px-4">
                      Distancia {/* { false ? "Distancia" : "Prueba" } */}
              </ThemedText>
              <ThemedText
                  lightColor={Colors.light.text}
                  className="text-2xl font-bold px-4">
                      23Km
              </ThemedText>
      </ThemedView>
    </View>
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
            borderTopLeftRadius: 55,
            borderTopRightRadius: 0,
        }}
        handleComponent={HandleDragToResize}
      >
        <BottomSheetView>
          <View className="my-6 px-6">
            {/* Visible solo cuando el bottomsheet se expande */}
              <Animated.View style={animatedContentStyle}>
              <View>
                <View className="flex-row justify-between my-2">
                  <View className="items-start">
                    <ThemedText
                      lightColor={Colors.light.text}
                      className="text-base"
                    >
                      Punto de partida
                    </ThemedText>
                    <ThemedText
                      lightColor={Colors.light.text}
                      className="text-sm font-extralight"
                    >
                      Mall del sur
                    </ThemedText>
                  </View>
                  <View className="items-end">
                    <ThemedText
                      lightColor={Colors.light.text}
                      className="text-base"
                    >
                      Punto final
                    </ThemedText>
                    <ThemedText
                      lightColor={Colors.light.text}
                      className="text-sm font-extralight"
                    >
                      Riocentro norte
                    </ThemedText>
                  </View>
                </View>

                {
                  // TODO: opctional stop details section
                  // <View className="flex-row justify-between my-2">
                  //   <View className="items-start">
                  //     <ScrollView>
                  //       <View className="flex-row justify-between mb-2">
                  //         <View className="items-start">
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-base"
                  //           >
                  //             Parada 1
                  //           </ThemedText>
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-sm font-extralight"
                  //           >
                  //             Mall del sur
                  //           </ThemedText>
                  //         </View>
                  //         <View className="items-end">
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-sm font-extralight"
                  //           >
                  //             7:30AM
                  //           </ThemedText>
                  //         </View>
                  //       </View>
                  //       {/* Parada 2 */}
                  //       <View className="flex-row justify-between mb-2">
                  //         <View className="items-start">
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-base"
                  //           >
                  //             Parada 2
                  //           </ThemedText>
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-sm font-extralight"
                  //           >
                  //             Mall del sur
                  //           </ThemedText>
                  //         </View>
                  //         <View className="items-end">
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-sm font-extralight"
                  //           >
                  //             7:30AM
                  //           </ThemedText>
                  //         </View>
                  //       </View>
                  //       {/* Parada 3 */}
                  //       <View className="flex-row justify-between">
                  //         <View className="items-start">
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-base"
                  //           >
                  //             Parada 3
                  //           </ThemedText>
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-sm font-extralight"
                  //           >
                  //             Mall del sur
                  //           </ThemedText>
                  //         </View>
                  //         <View className="items-end">
                  //           <ThemedText
                  //             lightColor={Colors.light.text}
                  //             className="text-sm font-extralight"
                  //           >
                  //             7:30AM
                  //           </ThemedText>
                  //         </View>
                  //       </View>
                  //     </ScrollView>
                  //   </View>
                  //   <View className="items-end">
                  //     <ThemedText
                  //       lightColor={Colors.light.text}
                  //       className="text-base"
                  //     >
                  //       28/08/2025
                  //     </ThemedText>
                  //     <Pressable style={{ backgroundColor: Colors.light.secondary}} className="rounded-full my-8 py-1 px-2">
                  //       <ThemedText
                  //         lightColor={Colors.light.text}
                  //         className="text-base"
                  //       >
                  //         Buscar esta ruta
                  //       </ThemedText>
                  //     </Pressable>
                  //   </View>
                  // </View>
                }
                
                <View className="flex-row my-6">
                  <View className=" mr-4">
                    <View className="items-center">
                      <View className="w-16 h-24 rounded-full border-2 border-[#E5E5E5] overflow-hidden">
                        <Image source={{ uri: "https://static.vecteezy.com/system/resources/thumbnails/040/861/048/small_2x/people-lifestyle-business-style-fashion-and-menswear-concept-positive-successful-young-man-sitting-in-a-chair-in-a-room-smiling-at-the-camera-wearing-elegant-shoes-trousers-and-a-white-shirt-photo.JPG" }} 
                          resizeMode="cover" 
                          className="w-full h-full"
                        />
                      </View>
                      <ThemedView lightColor={Colors.light.tird} className="absolute -bottom-3 rounded-full justify-center items-center max-w-[40px] px-2">
                        <ThemedText lightColor={Colors.light.textBlack}>
                          4.8
                        </ThemedText>
                      </ThemedView>
                    </View>
                  </View>
                  <View className="h-full bg-slate-300 w-[1px] mr-4 opacity-40"/>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}>
                      <View className=" mr-4">
                        <View className="items-center">
                          <View className="w-16 h-24 rounded-full border-2 border-[#E5E5E5] overflow-hidden">
                            <Image source={{ uri: "https://www.az.cl/wp-content/uploads/2021/07/ariela-agosin-480x385.jpg" }} 
                              resizeMode="cover" 
                              className="w-full h-full"
                            />
                          </View>
                          <ThemedView lightColor={Colors.light.tird} className="rounded-full justify-center items-center max-w-[40px] px-2  -translate-y-3">
                            <ThemedText lightColor={Colors.light.textBlack}>
                              4.8
                            </ThemedText>
                          </ThemedView>
                        </View>
                      </View>
                      <View className=" mr-4">
                        <View className="items-center">
                          <View className="w-16 h-24 rounded-full border-2 border-[#E5E5E5] overflow-hidden">
                            <Image source={{ uri: "https://i.pinimg.com/originals/02/35/66/023566c2bbfcf49a65b014382f522af3.jpg" }} 
                              resizeMode="cover" 
                              className="w-full h-full"
                            />
                          </View>
                          <ThemedView lightColor={Colors.light.tird} className="rounded-full justify-center items-center max-w-[40px] px-2 -translate-y-3">
                            <ThemedText lightColor={Colors.light.textBlack}>
                              4.8
                            </ThemedText>
                          </ThemedView>
                        </View>
                      </View>
                      <View className=" mr-4">
                        <View className="items-center">
                          <View className="w-16 h-24 rounded-full border-2 border-[#E5E5E5] overflow-hidden">
                            <Image source={{ uri: "https://tse4.mm.bing.net/th/id/OIP.LPLdkS9c-vB5LMKZygVhIAHaLF?cb=thfvnext&rs=1&pid=ImgDetMain&o=7&rm=3" }} 
                              resizeMode="cover" 
                              className="w-full h-full"
                            />
                          </View>
                          <ThemedView lightColor={Colors.light.tird} className="rounded-full justify-center items-center max-w-[40px] px-2 -translate-y-3">
                            <ThemedText lightColor={Colors.light.textBlack}>
                              4.8
                            </ThemedText>
                          </ThemedView>
                        </View>
                      </View>
                  </ScrollView>
                </View>
              </View>
            </Animated.View>
          </View>
        </BottomSheetView>  
      </BottomSheet>
  );
}
