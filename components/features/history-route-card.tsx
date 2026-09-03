import { useAuth } from "@/app/context/AuthContext";
import GlassCard from "@/components/common/GlassCard";
import { Colors } from "@/constants/Colors";
import { Vehicle } from "@/interfaces/driver";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Href, router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { ThemedText } from "../ui/ThemedText";

interface PassengerStatusSummary {
  total: number;
  joined: number;
  pending: number;
  completed: number;
  cancelled: number;
  left: number;
  rejected: number;
}

interface HistoryRouteProps {
  title: string;
  startLocation: string;
  endLocation: string;
  passengerCount: number;
  isActive?: string;
  routeScreen: Href;
  sessionId: number;
  routeId?: number;
  driver?: {
    name: string;
    avatar: string;
    rating: number;
  };
  passengersData?: {
    id: string;
    avatar: string;
  }[];
  passengerStatusSummary?: PassengerStatusSummary;
  pendingRequestsCount?: number;
  imageUrl?: string;
  vehicle?: Vehicle;
}

/** Pill badge for trip status */
function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const configs: Record<string, { label: string; bg: string; text: string }> = {
    active: { label: "ACTIVO", bg: "#2563EB", text: "#fff" },
    pending: { label: "PENDIENTE", bg: "#F59E0B", text: "#fff" },
    completed: { label: "COMPLETADO", bg: "#10B981", text: "#fff" },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <View
      className="absolute top-3 right-3 rounded-lg px-3 py-1"
      style={{ backgroundColor: cfg.bg }}
    >
      <Text style={{ color: cfg.text, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>
        {cfg.label}
      </Text>
    </View>
  );
}

export default function RouteCard({
  sessionId,
  routeId,
  title,
  isActive,
  routeScreen,
  startLocation,
  endLocation,
  passengerCount = 0,
  driver,
  passengersData = [],
  passengerStatusSummary,
  pendingRequestsCount = 0,
  imageUrl,
  vehicle,
}: HistoryRouteProps) {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const isDriverMode = user?.driver_mode ?? false;

  const joinedCount =
    passengersData.length > 0 ? passengersData.length : passengerCount;

  const totalSeats = vehicle?.seats_capacity || 4;

  return (
    <Pressable onPress={() => router.push(routeScreen)}>
      <GlassCard
        style={{
          borderRadius: 20,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {/* ── MAP IMAGE ─────────────────────────────────────────────────── */}
        <View style={{ height: 160, backgroundColor: "#111827" }}>
          <Image
            source={
              imageUrl && !imageError
                ? { uri: imageUrl }
                : require("@/assets/images/mapExample.png")
            }
            onError={() => setImageError(true)}
            resizeMode="cover"
            style={{ width: "100%", height: "100%" }}
          />

          {/* Status badge – top right */}
          <StatusBadge status={isActive} />
        </View>

        {/* ── DRIVER AVATAR (overlapping map/card border) ────────────────── */}
        {driver && (
          <View
            style={{
              position: "absolute",
              left: 16,
              top: 160 - 28, // half of avatar (56/2=28) above the card body
              zIndex: 10,
            }}
          >
            <View style={{ position: "relative" }}>
              <Image
                source={{ uri: driver.avatar || "https://via.placeholder.com/150" }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 3,
                  borderColor: Colors.dark.primary,
                }}
              />
              {/* Rating badge – bottom-right of avatar */}
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -4,
                  backgroundColor: "#10B981",
                  borderRadius: 20,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                  borderWidth: 2,
                  borderColor: Colors.dark.primary,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Text style={{ fontSize: 8, color: "#fff" }}>★</Text>
                <Text style={{ fontSize: 8, fontWeight: "800", color: "#fff" }}>
                  {Number(driver.rating || 0).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── CARD BODY ─────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: Colors.dark.primary,
            paddingTop: driver ? 36 : 16,
            paddingHorizontal: 16,
            paddingBottom: 14,
          }}
        >
          {/* Route rows */}
          <View style={{ gap: 6, marginBottom: 14 }}>
            {/* Salida */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="navigate" size={14} color="#2563EB" />
              <ThemedText
                lightColor="#A0AECB"
                darkColor="#A0AECB"
                style={{ fontSize: 12, fontWeight: "600" }}
              >
                <Text style={{ color: "#E2EBF0", fontWeight: "700" }}>Salida: </Text>
                {startLocation}
              </ThemedText>
            </View>

            {/* Llegada */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="flag-checkered" size={14} color="#A0AECB" />
              <ThemedText
                lightColor="#A0AECB"
                darkColor="#A0AECB"
                style={{ fontSize: 12, fontWeight: "600" }}
              >
                <Text style={{ color: "#E2EBF0", fontWeight: "700" }}>Llegada: </Text>
                {endLocation}
              </ThemedText>
            </View>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: Colors.dark.borderSecondary,
              opacity: 0.4,
              marginBottom: 12,
            }}
          />

          {/* ── SEAT ROW ──────────────────────────────────────────────── */}
          {isDriverMode ? (
            /* DRIVER MODE: colored seat icons + "X/Y Asientos" */
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {Array.from({ length: totalSeats }).map((_, index) => {
                  let color: string;
                  if (index < joinedCount) {
                    color = "#2563EB"; // joined → blue
                  } else if (index < joinedCount + pendingRequestsCount) {
                    color = "#F59E0B"; // pending → amber
                  } else {
                    color = "#4B5563"; // available → gray
                  }
                  return (
                    <MaterialCommunityIcons
                      key={index}
                      name="car-seat"
                      size={28}
                      color={color}
                    />
                  );
                })}
              </View>
              <ThemedText
                lightColor="#A0AECB"
                darkColor="#A0AECB"
                style={{ fontSize: 13, fontWeight: "600" }}
              >
                {`${joinedCount}/${totalSeats} Asientos`}
              </ThemedText>
            </View>
          ) : (
            /* PASSENGER MODE: first seat reserved + "Selecciona tu Asiento" or "X/Y Asientos" */
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                {Array.from({ length: totalSeats }).map((_, index) => {
                  let color: string;
                  if (index < joinedCount) {
                    color = "#2563EB"; // joined → blue
                  } else if (index < joinedCount + pendingRequestsCount) {
                    color = "#F59E0B"; // pending → amber
                  } else {
                    color = "#4B5563"; // available → gray
                  }
                  return (
                    <MaterialCommunityIcons
                      key={index}
                      name="car-seat"
                      size={28}
                      color={color}
                    />
                  );
                })}
              </View>
              <ThemedText
                lightColor="#A0AECB"
                darkColor="#A0AECB"
                style={{ fontSize: 13, fontWeight: "600" }}
              >
                {`${joinedCount}/${totalSeats} Asientos`}
              </ThemedText>
            </View>
          )}

          {passengerStatusSummary && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 8 }}>
              {passengerStatusSummary.completed > 0 && (
                <View style={{ backgroundColor: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.35)", borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: "#86EFAC", fontSize: 10, fontWeight: "700" }}>{passengerStatusSummary.completed} ok</Text>
                </View>
              )}
              {passengerStatusSummary.joined > 0 && (
                <View style={{ backgroundColor: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.35)", borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: "#93C5FD", fontSize: 10, fontWeight: "700" }}>{passengerStatusSummary.joined} unidos</Text>
                </View>
              )}
              {passengerStatusSummary.cancelled > 0 && (
                <View style={{ backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)", borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: "#FCA5A5", fontSize: 10, fontWeight: "700" }}>{passengerStatusSummary.cancelled} cancel</Text>
                </View>
              )}
              {passengerStatusSummary.left > 0 && (
                <View style={{ backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)", borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: "#FCD34D", fontSize: 10, fontWeight: "700" }}>{passengerStatusSummary.left} left</Text>
                </View>
              )}
              {passengerStatusSummary.rejected > 0 && (
                <View style={{ backgroundColor: "rgba(148,163,184,0.12)", borderColor: "rgba(148,163,184,0.35)", borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ color: "#E2E8F0", fontSize: 10, fontWeight: "700" }}>{passengerStatusSummary.rejected} rechaz</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}