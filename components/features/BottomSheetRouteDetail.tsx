import { useAuth } from "@/app/context/AuthContext";
import OptionsModal from "@/components/Modals/OptionsModal";
import { Colors } from "@/constants/Colors";
import { useAppInsets } from "@/hooks/useAppInsets";
import { PassengerTripSession, SessionData, UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { ThemedText } from "../ui/ThemedText";
import { ThemedView } from "../ui/ThemedView";

interface BottomSheetRouteDetailProps {
  passengers?: PassengerTripSession[];
  users?: UserData[];
  session?: SessionData | null;
  onPassengerPress?: (passengerId: string) => void;
  onFinishTrip?: () => Promise<void>;
  onLeaveTrip?: () => Promise<void>;
  onStartTrip?: () => Promise<void>;
  onCancelTrip?: () => Promise<void>;
  onCenterDriver?: () => void;
  onNavigate?: () => void;
  distanceRemaining?: string;
}

export default function BottomSheetRouteDetail({
  passengers,
  users: propUsers = [],
  session,
  onPassengerPress,
  onFinishTrip,
  onLeaveTrip,
  onStartTrip,
  onCancelTrip,
  onCenterDriver,
  onNavigate,
  distanceRemaining = "0Km"
}: BottomSheetRouteDetailProps) {
  const imagenes = [
    // ... (rest of images)
  ]

  const { user } = useAuth();
  const insets = useAppInsets();
  const {
    showBatteryModal,
    setShowBatteryModal,
    configureBatteryOptimization,
    dismissBatteryOptimization,
  } = useTripTrackingStore();

  const isActive = session?.status === "active";

  const actions = [
    {
      label: "Salir",
      icon: "log-out-outline",
      color: Colors.light.danger,
      onPress: async () => {
        if (onLeaveTrip) {
          await onLeaveTrip();
        }
      },
      hidden: user?.driver_mode || !isActive
    },
    {
      label: "Iniciar",
      icon: "play-outline",
      color: Colors.light.success,
      onPress: async () => {
        if (onStartTrip) {
          await onStartTrip();
        }
      },
      hidden: !user?.driver_mode || !user?.is_driver || isActive, // solo conductores y solo si no está activo
    },
    {
      label: "Cancelar",
      icon: "close-circle-outline",
      color: Colors.light.danger,
      onPress: async () => {
        if (onCancelTrip) {
          await onCancelTrip();
        }
      },
      hidden: !user?.driver_mode, // solo antes de iniciar
    },
    {
      label: "Finalizar",
      icon: "flag-outline",
      color: Colors.light.success,
      onPress: async () => {
        if (onFinishTrip) {
          await onFinishTrip();
        }
      },
      hidden: !(user?.driver_mode && user?.is_driver) || !isActive,
    },
    {
      label: "Navegar",
      icon: "navigate-circle-outline",
      color: Colors.light.secondary,
      onPress: () => {
        if (onNavigate) onNavigate();
      },
      hidden: !isActive || !user?.driver_mode,
    },
  ].filter(a => !a.hidden);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const [currentSnapPoint, setCurrentSnapPoint] = useState<number>(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [driverData, setDriverData] = useState<UserData | null>(null);
  const snapPoints = useMemo(() => ["45%"], []);
  const animatedIndex = useSharedValue(0);

  const fetchUser = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      const ratingInfo = await ratingsService.getUserRating(user.id);
      setUserData({
        ...(data as UserData),
        rating: ratingInfo.rating,
        rating_count: ratingInfo.count
      });
    }
  }

  const fetchDriver = async () => {
    if (!session?.driver_id) return;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq('id', session.driver_id)
      .maybeSingle();

    if (data) {
      const ratingInfo = await ratingsService.getUserRating(session.driver_id);
      setDriverData({
        ...(data as UserData),
        rating: ratingInfo.rating,
        rating_count: ratingInfo.count
      });
    }
  }

  useEffect(() => {
    fetchUser();
    fetchDriver();
  }, [user?.id, session?.driver_id]);

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

  const RECENTER_BUTTON_SIZE = 56;
  const RECENTER_BUTTON_MARGIN = 10;

  const HandleDragToResize = () => (
    <View className="flex-row justify-between ml-7" style={{ overflow: 'visible' }}>
      <View className="relative" style={{ width: '100%' }}>
        <ThemedText
          lightColor={Colors.light.text}
          className="font-bold text-3xl pt-4"
        >
          {session?.status === "active" ? "En curso" : session?.status === "pending" ? "pendiente" : "Completada"}
        </ThemedText>
        {onCenterDriver ? (
          <Pressable
            onPress={onCenterDriver}
            style={{
              position: 'absolute',
              top: -(RECENTER_BUTTON_SIZE + RECENTER_BUTTON_MARGIN),
              right: RECENTER_BUTTON_MARGIN,
              width: RECENTER_BUTTON_SIZE,
              height: RECENTER_BUTTON_SIZE,
              borderRadius: RECENTER_BUTTON_SIZE / 2,
              backgroundColor: Colors.dark.secondary,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              shadowColor: '#00000020',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Ionicons name="locate" size={26} color="white" />
          </Pressable>
        ) : null}
      </View>
      <ThemedView
        lightColor={Colors.light.secondary}
        darkColor={Colors.dark.secondary}
        className="p-4 mr-4 rounded-b-full self-end min-w-[100px] min-h-[50px] items-center justify-center">
        <ThemedText
          lightColor={Colors.light.text}
          className="text-sm font-light px-4">
          Distancia
        </ThemedText>
        <ThemedText
          lightColor={Colors.light.text}
          className="text-2xl font-bold px-4">
          {distanceRemaining}
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
        backgroundColor: Colors.dark.background,
        borderTopLeftRadius: 55,
        borderTopRightRadius: 0,
      }}
      handleComponent={HandleDragToResize}
    >
      <BottomSheetView>
        <View
          className="px-6"
        >
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

              <View className="flex-row mt-6">
                <View className=" mr-4">
                  <View className="items-center">
                    <View className="w-16 h-24 rounded-full border-2 border-tird overflow-hidden">
                      <Image source={{ uri: driverData?.avatar_profile || "https://via.placeholder.com/150" }}
                        resizeMode="cover"
                        className="w-full h-full"
                      />
                    </View>
                    <ThemedView lightColor={Colors.light.tird} className="absolute -bottom-3 rounded-full justify-center items-center max-w-[40px] px-2">
                      <ThemedText lightColor={Colors.light.textBlack}>
                        {driverData?.rating || "0.0"}
                      </ThemedText>
                    </ThemedView>
                  </View>
                </View>
                <View className="h-full bg-slate-300 w-[1px] mr-4 opacity-40" />
                <FlatList
                  horizontal
                  data={propUsers.filter(u => u.id !== session?.driver_id)}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => {
                    const pSession = passengers?.find(
                      (p) => p.passenger_id === item.id,
                    );
                    const isPending =
                      pSession?.status === "pending_approval";
                    const isCompleted =
                      pSession?.status === "completed";

                    const handlePress = () => {
                      console.log(pSession?.status);
                      console.log(user?.driver_mode);
                      console.log(pSession?.status === 'pending_approval' || pSession?.status === 'joined');
                      if (!user?.driver_mode || !pSession) return;

                      const canProcess = ['pending_approval', 'joined', 'pending', 'completed'].includes(pSession.status);
                      if (!canProcess) return;

                      // Delegate to parent/modal
                      onPassengerPress?.(item.id);
                    };

                    return (
                      <Pressable onPress={handlePress} className=" mr-4">
                        <View className="items-center">
                          <View
                            className={`w-16 h-24 rounded-full border-2 overflow-hidden ${isPending
                              ? "border-secondary"
                              : isCompleted
                                ? "border-green-500"
                                : "border-tird"
                              }`}
                          >
                            <Image
                              source={{ uri: item.avatar_profile || "https://via.placeholder.com/150" }}
                              resizeMode="cover"
                              className="w-full h-full"
                            />
                            {/* {isCompleted && (
                              <View className="absolute bottom-0 right-0 bg-white/20 rounded-full p-0.5">
                                <Ionicons name="checkmark-done-outline" size={16} color="white" />
                              </View>
                            )} */}
                          </View>
                          <ThemedView
                            lightColor={isCompleted ? Colors.dark.success : Colors.dark.success}
                            className="rounded-full justify-center items-center max-w-[40px] px-2  -translate-y-3"
                          >
                            <ThemedText lightColor={Colors.light.textBlack}>
                              {isPending ? "..." : isCompleted ? "✓" : (item.rating || "0.0")}
                            </ThemedText>
                          </ThemedView>
                        </View>
                      </Pressable>
                    );
                  }}
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                />
              </View>

              {/* Información del Vehículo asignado */}
              {session?.vehicle && (
                <View className="mt-4 p-3.5 rounded-2xl flex-row items-center border border-white/10" style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}>
                  <View className="p-2.5 rounded-xl mr-3 justify-center items-center" style={{ backgroundColor: "rgba(18, 182, 234, 0.15)" }}>
                    <Ionicons name="car-sport-outline" size={22} color={Colors.light.secondary} />
                  </View>
                  <View className="flex-1">
                    <ThemedText className="text-[10px] font-bold uppercase tracking-wider" style={{ color: Colors.light.secondary }}>
                      Vehículo del Viaje
                    </ThemedText>
                    <ThemedText className="text-sm font-bold">
                      {session.vehicle.brand} {session.vehicle.model} ({session.vehicle.year})
                    </ThemedText>
                    <ThemedText className="text-xs opacity-70 mt-0.5">
                      {`Placa: ${session.vehicle.plate}  •  Color: ${session.vehicle.color}`}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Acciones del viaje */}
              <View className="my-6" style={{ marginBottom: 20 + (insets.bottom > 16 ? insets.bottom : 0) }}>
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

      <OptionsModal
        visible={showBatteryModal}
        title="Acción Requerida"
        description="Para que el rastreo no se detenga al bloquear el celular, busca RideMate en la siguiente lista y selecciona 'Sin restricción'."
        iconName="battery-charging-outline"
        onClose={() => setShowBatteryModal(false)}
        options={[
          {
            label: "Configurar",
            iconName: "settings-outline",
            type: "primary",
            onPress: configureBatteryOptimization,
          },
          {
            label: "No volver a mostrar",
            iconName: "eye-off-outline",
            type: "default",
            onPress: dismissBatteryOptimization,
          },
          {
            label: "Cancelar",
            iconName: "close-circle-outline",
            type: "cancel",
            onPress: () => setShowBatteryModal(false),
          },
        ]}
      />
    </BottomSheet>
  );
}
