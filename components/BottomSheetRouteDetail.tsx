import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import { PassengerTripSession, SessionData, UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface BottomSheetRouteDetailProps {
  passengers?: PassengerTripSession[];
  session?: SessionData | null;
}

export default function BottomSheetRouteDetail({passengers, session}: BottomSheetRouteDetailProps) {
  const imagenes = [
    {url : 'https://www.az.cl/wp-content/uploads/2021/07/ariela-agosin-480x385.jpg'},
    {url : 'https://i.pinimg.com/originals/02/35/66/023566c2bbfcf49a65b014382f522af3.jpg'},
    {url : 'https://tse4.mm.bing.net/th/id/OIP.LPLdkS9c-vB5LMKZygVhIAHaLF?cb=thfvnext&rs=1&pid=ImgDetMain&o=7&rm=3'},
    {url : 'https://www.az.cl/wp-content/uploads/2021/07/ariela-agosin-480x385.jpg'},
    {url : 'https://www.az.cl/wp-content/uploads/2021/07/ariela-agosin-480x385.jpg'},
    {url : 'https://www.az.cl/wp-content/uploads/2021/07/ariela-agosin-480x385.jpg'},
    {url : 'https://www.az.cl/wp-content/uploads/2021/07/ariela-agosin-480x385.jpg'},
    {url : 'https://www.az.cl/wp-content/uploads/2021/07/ariela-agosin-480x385.jpg'},
  ]
  
  const { user } = useAuth();
  const { stopTracking } = useTripTrackingStore();

  const isActive = session?.status === "active";
 
  const actions = [
    {
      label: "Salir",
      icon: "log-out-outline",
      color: "#ef4444",
      onPress: () => {
        console.log("Salir del viaje");
      },
      hidden: user?.driver_mode || !isActive
    },
    {
      label: "Cancelar",
      icon: "close-circle-outline",
      color: "#f97316",
      onPress: () => {
        console.log("Cancelar viaje");
      },
      hidden: isActive, // solo antes de iniciar
    },
    {
      label: "Finalizar",
      icon: "flag-outline",
      color: "#22c55e",
      onPress: () => {
        console.log("Finalizar viaje");
        onFinishTrip();
      },
      hidden: !(user?.driver_mode && user?.is_driver) || !isActive,
    },
  ].filter(a => !a.hidden);

  const onFinishTrip = async () => {
    if (!session) return;
    
    stopTracking();
    const { error } = await supabase
      .from("trip_sessions")
      .update({ status : "completed"})
      .eq("id", session?.id)

    if (error)
      Alert.alert("Error: ", error.message)
  }

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [ currentSnapPoint, setCurrentSnapPoint ] = useState<number>(0);
  const [ users, setUsers] = useState<UserData[]>([]);
  const [ userData, setUserData ] = useState<UserData | null>(null);
  const snapPoints = useMemo(() => ["45%"], []);
  const animatedIndex = useSharedValue(0);

  const fetchUser = async () => {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq('id', user?.id)
        .maybeSingle();
    
    setUserData(data as UserData)
  }
    
  useEffect(() => {
    fetchUser();
  }, []);

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
          className="font-bold text-3xl pt-4"
          >
          {session?.status === "active"? "En curso" : session?.status === "pending" ? "pendiente" : "Completada" }
        </ThemedText>
      </View>
      <ThemedView
          lightColor={Colors.light.secondary}
          className="p-4 mr-4 rounded-b-full self-end min-w-[100px] min-h-[50px] items-center justify-center">
              <ThemedText
                  lightColor={Colors.light.text}
                  className="text-sm font-light px-4">
                      Distancia
              </ThemedText>
              <ThemedText
                  lightColor={Colors.light.text}
                  className="text-2xl font-bold px-4">
                      23Km
              </ThemedText>
      </ThemedView>
    </View>
  )

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in('id', passengers?.map(p => p.passenger_id) ?? []);

    setUsers(data as UserData[]);
  };

  useEffect(() => {
    fetchUsers();
  }, [passengers]);

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
          <View className="px-6">
            {/* Visible solo cuando el bottomsheet se expande */}
              <Animated.View style={animatedContentStyle}>
              <View>
                <View className="flex-row justify-between">
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
                      {session?.start_location.split(',')[0]}
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
                      {session?.end_location.split(',')[0]}
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
                
                <View className="flex-row mt-6">
                  <View className=" mr-4">
                    <View className="items-center">
                      <View className="w-16 h-24 rounded-full border-2 border-[#E5E5E5] overflow-hidden">
                        <Image source={{ uri: userData?.avatar_profile }} 
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
                  <FlatList
                    horizontal
                    data={users}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({item}) => (
                      <View className=" mr-4">
                        <View className="items-center">
                          <View className="w-16 h-24 rounded-full border-2 border-[#E5E5E5] overflow-hidden">
                            <Image source={{ uri: item.avatar_profile }} 
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
                    )}
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                  />
                </View>
                {/* Acciones del viaje */}
                <View className="my-6">
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                  >
                    {actions.map((action, index) => (
                      <Pressable
                        key={index}
                        onPress={action.onPress}
                        className="flex-row items-center mr-3 px-4 py-2 rounded-full"
                        style={{ backgroundColor: action.color }}
                      >
                        <Ionicons
                          name={action.icon as any}
                          size={18}
                          color="white"
                        />
                        <ThemedText
                          lightColor="#fff"
                          className="ml-2 text-sm font-semibold"
                        >
                          {action.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

              </View>
            </Animated.View>
          </View>
        </BottomSheetView>  
      </BottomSheet>
  );
}
