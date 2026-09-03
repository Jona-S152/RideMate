import { Colors } from "@/constants/Colors";
import { useAppInsets } from "@/hooks/useAppInsets";
import { supabase } from "@/lib/supabase";
import { tripService } from "@/services/trip.service";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

export interface PassengerRequestItem {
  id: number;
  passenger_id: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
  pickup_address: string;
  destination_address: string;
  passenger_name: string;
  passenger_avatar: string;
  passenger_rating: number;
}

interface DriverRequestsModalProps {
  visible: boolean;
  tripSessionId: number | null;
  onClose: () => void;
  onSelectPendingPassenger: (passengerId: string) => void;
}

function RequestStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: "PENDIENTE", bg: "#F59E0B", text: "#fff" },
    approved: { label: "ACEPTADO", bg: "#10B981", text: "#fff" },
    joined: { label: "ACEPTADO", bg: "#10B981", text: "#fff" },
    rejected: { label: "RECHAZADO", bg: "#EF4444", text: "#fff" },
    cancelled: { label: "CANCELADO", bg: "#6B7280", text: "#fff" },
  };

  const cfg = configs[status] || { label: status.toUpperCase(), bg: "#6B7280", text: "#fff" };

  return (
    <View
      className="px-2.5 py-1 rounded-full"
      style={{ backgroundColor: cfg.bg }}
    >
      <Text style={{ color: cfg.text, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }}>
        {cfg.label}
      </Text>
    </View>
  );
}

export default function DriverRequestsModal({
  visible,
  tripSessionId,
  onClose,
  onSelectPendingPassenger,
}: DriverRequestsModalProps) {
  const insets = useAppInsets();
  const [requests, setRequests] = useState<PassengerRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible && tripSessionId) {
      loadRequests();
    } else {
      setRequests([]);
    }
  }, [visible, tripSessionId]);

  // Realtime subscription to refresh modal list when requests change
  useEffect(() => {
    if (!visible || !tripSessionId) return;

    const channel = supabase
      .channel(`modal-requests-realtime-${tripSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "passenger_requests",
          filter: `trip_session_id=eq.${tripSessionId}`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, tripSessionId]);

  const loadRequests = async () => {
    if (!tripSessionId) return;
    setLoading(true);
    try {
      const data = await tripService.getTripSessionRequests(tripSessionId);
      setRequests(data as PassengerRequestItem[]);
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  if (!visible) return null;

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        {/* Sheet Container */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: Colors.dark.primary,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "85%",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24 + insets.bottom,
            borderTopWidth: 1,
            borderColor: Colors.dark.borderSecondary,
          }}
        >
          {/* Handle */}
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: Colors.dark.borderSecondary,
              marginBottom: 16,
            }}
          />

          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View>
              <Text style={{ color: "#E2EBF0", fontSize: 20, fontWeight: "800" }}>
                Solicitudes Recibidas
              </Text>
              <Text style={{ color: Colors.dark.textSecondary, fontSize: 13, marginTop: 2 }}>
                {pendingCount > 0
                  ? `${pendingCount} solicitud(es) pendiente(s) de aprobación`
                  : "Historial de solicitudes para este viaje"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={28} color={Colors.dark.textSecondary} />
            </Pressable>
          </View>

          {/* List */}
          {loading && !refreshing ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={{ color: Colors.dark.textSecondary, marginTop: 12, fontSize: 13 }}>
                Cargando solicitudes...
              </Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Ionicons name="clipboard-outline" size={48} color={Colors.dark.textSecondary} />
              <Text style={{ color: Colors.dark.textSecondary, marginTop: 12, fontSize: 14, textAlign: "center" }}>
                Aún no has recibido solicitudes para este viaje.
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
              }
            >
              {requests.map((item) => {
                const isPending = item.status === "pending";

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (isPending) {
                        onSelectPendingPassenger(item.passenger_id);
                      }
                    }}
                    style={{
                      backgroundColor: Colors.dark.background,
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: isPending ? "#F59E0B" : Colors.dark.borderSecondary,
                    }}
                  >
                    {/* Top Row: Avatar + Name + Rating + Status Badge */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Image
                          source={{ uri: item.passenger_avatar || "https://via.placeholder.com/150" }}
                          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.dark.primary }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#E2EBF0", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                            {item.passenger_name}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                            <Ionicons name="star" size={12} color="#10B981" />
                            <Text style={{ color: "#10B981", fontSize: 12, fontWeight: "700" }}>
                              {Number(item.passenger_rating || 0).toFixed(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <RequestStatusBadge status={item.status} />
                    </View>

                    {/* Route Details */}
                    <View style={{ gap: 4, marginTop: 4 }}>
                      {/* Pickup */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="person" size={12} color="#2563EB" />
                        <Text style={{ color: Colors.dark.textSecondary, fontSize: 12 }} numberOfLines={1}>
                          <Text style={{ color: "#E2EBF0", fontWeight: "600" }}>Recogida: </Text>
                          {item.pickup_address || "Punto de recogida"}
                        </Text>
                      </View>

                      {/* Destination */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="flag" size={12} color="#EF4444" />
                        <Text style={{ color: Colors.dark.textSecondary, fontSize: 12 }} numberOfLines={1}>
                          <Text style={{ color: "#E2EBF0", fontWeight: "600" }}>Destino: </Text>
                          {item.destination_address || "Punto de llegada"}
                        </Text>
                      </View>
                    </View>

                    {/* Pending Action Hint */}
                    {isPending && (
                      <View
                        style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: "rgba(245, 158, 11, 0.2)",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "700" }}>
                          Toca para revisar y responder
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
