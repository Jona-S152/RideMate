import { useAuth } from "@/app/context/AuthContext";
import { useSession } from "@/app/context/SessionContext";
import FeedbackModal from "@/components/features/FeedbackModal";
import RouteCard from "@/components/features/history-route-card";
import DriverRequestsModal from "@/components/Modals/DriverRequestsModal";
import PassengerActionModal from "@/components/Modals/PassengerActionModal";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useActiveSession } from "@/hooks/useRealTime";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";

import { useModeNavigation } from "@/hooks/useModeNavigation";
import { Vehicle } from "@/interfaces/driver";
import { supabase } from "@/lib/supabase";
import { registerDeviceToken } from "@/services/notifications.service";
import { ratingsService } from "@/services/ratings.service";
import { Ionicons } from "@expo/vector-icons";

// Reemplaza con el número real de WhatsApp Business cuando esté disponible
const WHATSAPP_SUPPORT_URL =
  "https://wa.me/593999999999?text=Hola,%20necesito%20soporte%20con%20RideMate";

export default function HomeScreen() {
  const { user, updateUser, refreshUser } = useAuth();
  const { sessionChanged, setSessionChanged } = useSession();
  const { activeSession, loading } = useActiveSession(user);
  const { navigateToTab, sanitizeStacksOnModeSwitch } = useModeNavigation();

  const [isEnabled, setIsEnabled] = useState(user?.driver_mode ?? false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  // ── Driver Requests & Passenger Action Modals ──────────────────────────────
  const [driverRequestsModalVisible, setDriverRequestsModalVisible] = useState(false);
  const [passengerActionModalVisible, setPassengerActionModalVisible] = useState(false);
  const [selectedPassengerId, setSelectedPassengerId] = useState<string | null>(null);

  // ── Auth / device token ──────────────────────────────────────────────────
  useEffect(() => {
    if (user) registerDeviceToken(user.id);
  }, [user]);

  // ── Session change flag ──────────────────────────────────────────────────
  useEffect(() => {
    if (sessionChanged) {
      console.log("Detectado cambio de sesión → recargando datos");
      setSessionChanged(false);
    }
  }, [sessionChanged]);

  // ── Sync driver_mode from user store ─────────────────────────────────────
  useEffect(() => {
    if (user) setIsEnabled(user.driver_mode);
  }, [user?.driver_mode]);

  // ── Persist driver_mode to Supabase & Sanitize Navigation Stacks ──────────
  useEffect(() => {
    if (user && user.driver_mode !== isEnabled) {
      updateUser({ driver_mode: isEnabled });
      sanitizeStacksOnModeSwitch(isEnabled);
    }
  }, [isEnabled]);

  // ── History ──────────────────────────────────────────────────────────────
  useEffect(() => {
    refreshUser();
    fetchHistory();
  }, [user?.id]);

  const fetchHistory = async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    try {
      const { data: historyData, error } = await supabase
        .from("passenger_route_history")
        .select("*")
        .eq("user_id", user.id)
        .order("end_time", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching route history: ", error);
        return;
      }

    const enrichedHistory = await Promise.all(
      historyData.map(async (item) => {
        const { data: session } = await supabase
          .from("trip_sessions")
          .select("driver_id, route_id, routes(image_url)")
          .eq("id", item.trip_session_id)
          .single();

        let driverInfo = undefined;
        if (session?.driver_id) {
          const { data: driverUser } = await supabase
            .from("users")
            .select("name, avatar_profile")
            .eq("id", session.driver_id)
            .single();

          if (driverUser) {
            const ratingInfo = await ratingsService.getUserRating(session.driver_id);
            driverInfo = {
              name: driverUser.name,
              avatar: driverUser.avatar_profile,
              rating: ratingInfo.rating,
            };
          }
        }

        const { data: passengers } = await supabase
          .from("passenger_trip_sessions")
          .select("passenger_id")
          .eq("trip_session_id", item.trip_session_id)
          .in("status", ["completed", "joined"]);

        let passengersData: any[] = [];
        if (passengers && passengers.length > 0) {
          const pIds = passengers.map((p) => p.passenger_id);
          const { data: users } = await supabase
            .from("users")
            .select("id, avatar_profile")
            .in("id", pIds);
          if (users) {
            passengersData = users.map((u) => ({ id: u.id, avatar: u.avatar_profile }));
          }
        }

        return {
          ...item,
          driver_details: driverInfo,
          passengers_data: passengersData,
          route_id: session?.route_id,
          image_url: Array.isArray(session?.routes)
            ? (session.routes[0] as any)?.image_url
            : (session?.routes as any)?.image_url,
        };
      })
    );

      setHistory(enrichedHistory);
    } catch (error) {
      console.error("Error en fetchHistory:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Active session details ───────────────────────────────────────────────
  const [driverDetails, setDriverDetails] = useState<
    { name: string; avatar: string; rating: number } | undefined
  >(undefined);
  const [passengerDetails, setPassengerDetails] = useState<{ id: string; avatar: string }[]>([]);
  const [activePendingRequestsCount, setActivePendingRequestsCount] = useState<number>(0);

  const fetchSessionDetails = async () => {
    if (!activeSession) {
      setDriverDetails(undefined);
      setPassengerDetails([]);
      setActivePendingRequestsCount(0);
      return;
    }

    try {
      if (activeSession.driver_id) {
        const { data: driverUser } = await supabase
          .from("users")
          .select("name, avatar_profile")
          .eq("id", activeSession.driver_id)
          .single();

        if (driverUser) {
          const ratingInfo = await ratingsService.getUserRating(activeSession.driver_id);
          setDriverDetails({
            name: driverUser.name,
            avatar: driverUser.avatar_profile,
            rating: ratingInfo.rating,
          });
        }
      }

      const { data: passengers } = await supabase
        .from("passenger_trip_sessions")
        .select("passenger_id")
        .eq("trip_session_id", activeSession.id)
        .in("status", ["joined", "pending"]);

      if (passengers && passengers.length > 0) {
        const passengerIds = passengers.map((p) => p.passenger_id);
        const { data: usersData } = await supabase
          .from("users")
          .select("id, avatar_profile")
          .in("id", passengerIds);
        if (usersData) {
          setPassengerDetails(usersData.map((u) => ({ id: u.id, avatar: u.avatar_profile })));
        }
      } else {
        setPassengerDetails([]);
      }

      const { data: pendingRequests } = await supabase
        .from("passenger_requests")
        .select("id")
        .eq("trip_session_id", activeSession.id)
        .eq("status", "pending");

      setActivePendingRequestsCount(pendingRequests?.length || 0);
    } catch (error) {
      console.error("Error fetching session details:", error);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [activeSession]);

  // ── Realtime subscription for requests & passenger sessions ─────────────
  useEffect(() => {
    if (!activeSession?.id) return;

    const channel = supabase
      .channel(`home-session-realtime-${activeSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_requests",
          filter: `trip_session_id=eq.${activeSession.id}`,
        },
        () => {
          fetchSessionDetails();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_trip_sessions",
          filter: `trip_session_id=eq.${activeSession.id}`,
        },
        () => {
          fetchSessionDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const hasActiveOrPendingTrip =
    !!activeSession &&
    (activeSession.status === "active" || activeSession.status === "pending");

  function handlePublishRoute(): void {
    navigateToTab("available-routes", "create-route-screen", { activeModeP: "start" });
  }

  function handleOpenWhatsAppSupport(): void {
    Linking.openURL(WHATSAPP_SUPPORT_URL).catch(() =>
      console.warn("No se pudo abrir WhatsApp")
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <View className="flex-1" style={{ backgroundColor: Colors.dark.background }}>

      {/* ── FEEDBACK MODAL ─────────────────────────────────────────────── */}
      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        screenName="Home"
      />

      {/* ── DRIVER REQUESTS MODAL ──────────────────────────────────────── */}
      <DriverRequestsModal
        visible={driverRequestsModalVisible}
        tripSessionId={activeSession?.id ?? null}
        onClose={() => setDriverRequestsModalVisible(false)}
        onSelectPendingPassenger={(passengerId) => {
          setSelectedPassengerId(passengerId);
          setPassengerActionModalVisible(true);
        }}
      />

      {/* ── PASSENGER ACTION MODAL (APPROVE / REJECT) ──────────────────── */}
      <PassengerActionModal
        visible={passengerActionModalVisible}
        passengerId={selectedPassengerId}
        tripSessionId={activeSession?.id ?? 0}
        onClose={() => {
          setPassengerActionModalVisible(false);
          setSelectedPassengerId(null);
        }}
        onActionComplete={() => {
          fetchSessionDetails();
        }}
      />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View className="flex-row justify-between items-center mx-4 mt-12 mb-4">
        {/* Greeting */}
        <View className="flex-1 mr-3">
          <ThemedText className="font-bold text-4xl" style={{ color: "#E2EBF0" }}>
            Hola,
          </ThemedText>
          <ThemedText className="font-bold text-4xl" style={{ color: "#E2EBF0" }}>
            {user?.name}
          </ThemedText>
        </View>

        {/* Role selector */}
        {user?.is_driver ? (
          /* ── Segmented Control: Pasajero | Conductor ── */
          <View
            className="flex-row rounded-2xl overflow-hidden pl-2 pr-1 py-1"
            style={{
              backgroundColor: Colors.dark.primary,
              borderWidth: 1,
              borderColor: Colors.dark.borderSecondary,
            }}
          >
            {/* Pasajero tab */}
            <Pressable
              onPress={() => setIsEnabled(false)}
              className="flex-row items-center justify-center gap-x-1 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: !isEnabled ? "#2563EB" : "transparent",
                minWidth: 44,
              }}
            >
              <Ionicons
                name="person"
                size={18}
                color={!isEnabled ? "#fff" : Colors.dark.textSecondary}
              />
              {!isEnabled && (
                <ThemedText className="text-xs font-bold" style={{ color: "#fff" }}>
                  Pasajero
                </ThemedText>
              )}
            </Pressable>

            {/* Conductor tab */}
            <Pressable
              onPress={() => setIsEnabled(true)}
              className="flex-row items-center justify-center gap-x-1 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: isEnabled ? "#2563EB" : "transparent",
                minWidth: 44,
              }}
            >
              <Ionicons
                name="car-sport"
                size={18}
                color={isEnabled ? "#fff" : Colors.dark.textSecondary}
              />
              {isEnabled && (
                <ThemedText className="text-xs font-bold" style={{ color: "#fff" }}>
                  Conductor
                </ThemedText>
              )}
            </Pressable>
          </View>
        ) : (
          /* ── Botón Ser Conductor ── */
          <Pressable
            onPress={() => navigateToTab("profile", "become-driver")}
            className="flex-row items-center gap-x-1 rounded-xl px-3 py-2"
            style={{
              backgroundColor: Colors.dark.warning,
              borderColor: Colors.dark.borderWarning,
              borderWidth: 1,
            }}
          >
            <Ionicons name="car-sport-outline" size={18} color={Colors.dark.secondary} />
            <ThemedText className="text-xs font-bold" style={{ color: "#fff" }}>
              Ser Conductor
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* ── CONTENT ────────────────────────────────────────────────────── */}
      <View className="flex-1 mx-4">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, gap: 12 }}
        >
          {/* ── Route Card / History Card / Loading State ── */}
          {loading || historyLoading ? (
            <View
              className="rounded-2xl py-12 items-center justify-center"
              style={{
                backgroundColor: Colors.dark.primary,
                borderWidth: 1,
                borderColor: Colors.dark.borderSecondary,
              }}
            >
              <ActivityIndicator size="large" color={Colors.dark.secondary} />
              <ThemedText
                className="text-xs font-semibold mt-3"
                style={{ color: Colors.dark.textSecondary }}
              >
                Cargando información del viaje...
              </ThemedText>
            </View>
          ) : activeSession ? (
            <RouteCard
              key={`active-${activeSession.id}`}
              sessionId={activeSession.id}
              routeId={activeSession.route_id}
              title={`${activeSession.start_location} - ${activeSession.end_location}`}
              isActive={activeSession.status}
              routeScreen={
                activeSession.status === "active"
                  ? `/(tabs)/home/route-detail?id=${activeSession.id}`
                  : ["cancelled", "completed", "left"].includes(activeSession.status)
                    ? `/(tabs)/available-routes/route-detail?id=${activeSession.route_id}&sessionId=${activeSession.id}&viewOnly=true&source=home`
                    : `/(tabs)/available-routes/route-detail?id=${activeSession.route_id}&sessionId=${activeSession.id}`
              }
              startLocation={activeSession.start_location.split(",")[0].trim()}
              endLocation={activeSession.end_location.split(",")[0].trim()}
              passengerCount={passengerDetails.length}
              driver={driverDetails}
              passengersData={passengerDetails}
              pendingRequestsCount={activePendingRequestsCount}
              imageUrl={(activeSession as any).routes?.image_url}
              vehicle={activeSession.vehicle as Vehicle | undefined}
            />
          ) : history.length > 0 ? (
            <RouteCard
              sessionId={history[0].id}
              routeId={(history[0] as any).route_id}
              title={`${history[0].start_location} - ${history[0].end_location}`}
              isActive={"completed"}
              routeScreen={`/(tabs)/available-routes/route-detail?id=${history[0].route_id}&sessionId=${history[0].trip_session_id}&viewOnly=true&source=home`}
              startLocation={history[0].start_location.split(",")[0].trim()}
              endLocation={history[0].end_location.split(",")[0].trim()}
              passengerCount={(history[0] as any).passengers_data?.length || 0}
              driver={(history[0] as any).driver_details}
              passengersData={(history[0] as any).passengers_data}
              imageUrl={(history[0] as any).image_url}
            />
          ) : (
            <View
              className="rounded-2xl py-10 items-center justify-center"
              style={{
                backgroundColor: Colors.dark.primary,
                borderWidth: 1,
                borderColor: Colors.dark.borderSecondary,
              }}
            >
              <Ionicons name="map-outline" size={40} color={Colors.dark.textSecondary} />
              <ThemedText
                className="text-sm mt-3"
                style={{ color: Colors.dark.textSecondary }}
              >
                No tienes rutas en tu historial.
              </ThemedText>
            </View>
          )}

          {/* ── Acciones rápidas header ── */}
          <View className="flex-row justify-between items-center mt-2">
            <ThemedText className="text-xl font-bold" style={{ color: "#E2EBF0" }}>
              Acciones Rápidas
            </ThemedText>
          </View>

          {/* ── Botones de Acción ── */}
          <View className="flex-row justify-around">
            {/* 1. Modo Conductor con Viaje Activo/Pendiente */}
            {isEnabled && user?.is_driver && hasActiveOrPendingTrip && (
              <ActionButton
                icon="clipboard-outline"
                label="Mis Solicitudes"
                badge={activePendingRequestsCount}
                onPress={() => setDriverRequestsModalVisible(true)}
              />
            )}

            {/* 2. Botón de Feedback (Se renderiza siempre en Modo Pasajero o en Conductor con Viaje Activo) */}
            {(!isEnabled || !user?.is_driver || hasActiveOrPendingTrip) && (
              <ActionButton
                icon="chatbubble-ellipses-outline"
                label="Feedback"
                color="#8B5CF6"
                onPress={() => setFeedbackVisible(true)}
              />
            )}

            {/* 3. Modo Conductor Sin Viaje Activo: Feedback primero */}
            {isEnabled && user?.is_driver && !hasActiveOrPendingTrip && (
              <ActionButton
                icon="chatbubble-ellipses-outline"
                label="Feedback"
                color="#8B5CF6"
                onPress={() => setFeedbackVisible(true)}
              />
            )}

            {/* 4. Modo Conductor Sin Viaje Activo: Publicar Viaje */}
            {isEnabled && user?.is_driver && !hasActiveOrPendingTrip && (
              <ActionButton
                icon="add-circle-outline"
                label={"Publicar\nNuevo Viaje"}
                solidColor="#2563EB"
                onPress={handlePublishRoute}
              />
            )}

            {/* 5. Modo Pasajero: Buscar Nuevo Viaje */}
            {(!isEnabled || !user?.is_driver) && (
              <ActionButton
                icon="search-outline"
                label={"Buscar\nNuevo Viaje"}
                solidColor="#10B981"
                onPress={() => navigateToTab("available-routes", "passenger")}
              />
            )}
          </View>

          {/* ── Banner de Soporte WhatsApp ── */}
          <Pressable
            onPress={handleOpenWhatsAppSupport}
            className="flex-row items-center py-4 px-4 mb-2 rounded-2xl"
            style={{
              backgroundColor: Colors.dark.warning,
              borderColor: Colors.dark.borderWarning,
              borderWidth: 1,
            }}
          >
            <Ionicons name="shield-checkmark" size={32} color="#2563EB" />
            <View className="flex-1">
              <ThemedText className="text-sm font-bold" style={{ color: "#E2EBF0" }}>
                Contacta a soporte
              </ThemedText>
              <ThemedText
                className="text-xs leading-4 mt-0.5"
                style={{ color: Colors.dark.textSecondary }}
              >
                Toca aquí para contactar Soporte Técnico vía WhatsApp.
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Shared Action Button ─────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  /** Badge count (shown as red dot) */
  badge?: number;
  /** Icon tint when button is dark-background style */
  color?: string;
  /** Full background color (pill style) */
  solidColor?: string;
}

function ActionButton({
  icon,
  label,
  onPress,
  badge = 0,
  color = "#E2EBF0",
  solidColor,
}: ActionButtonProps) {
  const isSolid = !!solidColor;

  return (
    <Pressable className="flex-1" onPress={onPress}>
      <View
        style={{
          flex: 1,
          minHeight: 72,
          borderRadius: 20,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 18,
          paddingHorizontal: 12,
          marginHorizontal: 5,
          backgroundColor: isSolid ? solidColor : Colors.dark.primary,
          ...(!isSolid && {
            borderWidth: 1,
            borderColor: Colors.dark.borderSecondary,
          }),
        }}
      >
        {/* Icon + optional badge */}
        <View style={{ position: "relative", marginBottom: 10 }}>
          <Ionicons
            name={icon as any}
            size={35}
            color={isSolid ? "#fff" : color}
          />
          {badge > 0 && (
            <View
              style={{
                position: "absolute",
                top: -4,
                right: -8,
                backgroundColor: "#EF4444",
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 3,
              }}
            >
              <ThemedText className="text-xs text-font-bold text-center" style={{ color: "#fff" }}>
                {badge}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Label */}
        <ThemedText
          className="text-center text-sm font-bold"
          style={{
            color: isSolid ? "#fff" : "#E2EBF0",
          }}
        >
          {label.replace('\n', ' ')}
        </ThemedText>
      </View>
    </Pressable>
  );
}
