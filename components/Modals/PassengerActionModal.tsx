import { Colors } from "@/constants/Colors";
import { sendPushNotification } from "@/services/notifications.service";
import { ratingsService } from "@/services/ratings.service";
import { tripService } from "@/services/trip.service";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, { Camera, MarkerView } from "@rnmapbox/maps";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface PassengerActionModalProps {
  visible: boolean;
  passengerId: string | null;
  tripSessionId: number;
  onClose: () => void;
  onActionComplete: () => void;
}

interface PassengerDetails {
  id: string;
  name: string;
  avatar_profile: string;
  rating?: number;
  // Pending request data
  request_id?: number;
  route_id?: number;
  // Pickup point
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  // Destination point
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
}

export default function PassengerActionModal({
  visible,
  passengerId,
  tripSessionId,
  onClose,
  onActionComplete,
}: PassengerActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PassengerDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible && passengerId) {
      fetchDetails();
    } else {
      setDetails(null);
    }
  }, [visible, passengerId]);

  const fetchDetails = async () => {
    if (!passengerId) return;
    console.log("Fetching passenger details...", visible, passengerId);
    if (details !== null) return;
    setLoading(true);
    try {
      const { userData, requestData, sessionData } = await tripService.getPassengerRequestDetails(
        tripSessionId,
        passengerId
      );
      console.log("Passenger details:", userData, requestData, sessionData);

      const ratingInfo = await ratingsService.getUserRating(userData.id);
      const pickupCoords = requestData.pickup_point?.coordinates;
      const destCoords = requestData.destination_point?.coordinates;

      setDetails({
        id: userData.id,
        name: userData.name,
        avatar_profile: userData.avatar_profile,
        rating: ratingInfo.rating,
        request_id: requestData.id,
        route_id: sessionData?.route_id,
        pickup_address: requestData.pickup_address || "Punto de recogida",
        pickup_latitude: pickupCoords ? Number(pickupCoords[1]) : 0,
        pickup_longitude: pickupCoords ? Number(pickupCoords[0]) : 0,
        destination_address: requestData.destination_address || "Destino",
        destination_latitude: destCoords ? Number(destCoords[1]) : 0,
        destination_longitude: destCoords ? Number(destCoords[0]) : 0,
      });
    } catch (error: any) {
      // If the request was already approved/rejected, silently close the modal
      if (error?.message === "NO_PENDING_REQUEST") {
        console.log("Request already processed, closing modal.");
        onClose();
        return;
      }
      console.error("Error fetching passenger details:", error);
      Alert.alert("Error", "No se pudo cargar la información del pasajero.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!passengerId || !details || !details.request_id) return;
    setActionLoading(true);

    try {
      await tripService.approvePassengerRequest(
        details.request_id,
        tripSessionId,
        passengerId,
      );

      // ── PASO 6: Notificar al pasajero ──
      try {
        await sendPushNotification(
          passengerId,
          "¡Solicitud aceptada! 🎉",
          "El conductor aceptó tu solicitud. Dirígete al punto de recogida.",
          {
            type: "REQUEST_APPROVED",
            trip_session_id: tripSessionId,
          }
        );
      } catch (notifErr) {
        console.warn("No se pudo enviar notificación al pasajero:", notifErr);
      }

      onActionComplete();
      onClose();
    } catch (error: any) {
      console.error("Error approving passenger:", error);
      Alert.alert("Error", error?.message || "No se pudo aprobar la solicitud.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!passengerId || !details?.request_id) return;
    setActionLoading(true);

    try {
      await tripService.rejectPassengerRequest(details.request_id, "Solicitud rechazada por el conductor");

      // Notificar al pasajero
      try {
        await sendPushNotification(
          passengerId,
          "Solicitud rechazada",
          "El conductor no pudo aceptar tu solicitud en esta ocasión.",
          {
            type: "REQUEST_REJECTED",
            trip_session_id: tripSessionId,
          }
        );
      } catch (notifErr) {
        console.warn("No se pudo enviar notificación al pasajero:", notifErr);
      }

      onActionComplete();
      onClose();
    } catch (error: any) {
      console.error("Error rejecting passenger:", error);
      Alert.alert("Error", error?.message || "No se pudo rechazar la solicitud.");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmAction = (type: "approve" | "reject") => {
    if (type === "approve") {
      Alert.alert(
        "Aceptar pasajero",
        `¿Confirmas aceptar a ${details?.name}? Se añadirá su destino como parada en tu ruta.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Aceptar", onPress: handleApprove },
        ]
      );
    } else {
      Alert.alert(
        "Rechazar pasajero",
        `¿Confirmas rechazar la solicitud de ${details?.name}?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Rechazar", style: "destructive", onPress: handleReject },
        ]
      );
    }
  };

  if (!visible) return null;

  const hasPickup = details && details.pickup_latitude !== 0 && details.pickup_longitude !== 0;
  const hasDest = details && details.destination_latitude !== 0 && details.destination_longitude !== 0;
  // Center map between pickup and destination
  const mapCenterLat = hasPickup && hasDest
    ? (details.pickup_latitude + details.destination_latitude) / 2
    : (hasPickup ? details!.pickup_latitude : hasDest ? details!.destination_latitude : 0);
  const mapCenterLng = hasPickup && hasDest
    ? (details.pickup_longitude + details.destination_longitude) / 2
    : (hasPickup ? details!.pickup_longitude : hasDest ? details!.destination_longitude : 0);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View
          style={{ backgroundColor: Colors.dark.primary }}
          className="w-full rounded-3xl shadow-2xl relative border border-slate-700 overflow-hidden"
        >
          {/* Close Button */}
          <Pressable
            onPress={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-slate-800 rounded-full"
          >
            <Ionicons name="close" size={20} color="white" />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="p-6 items-center">
              {loading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color={Colors.dark.secondary} />
                  <Text className="text-slate-400 mt-4">Cargando solicitud...</Text>
                </View>
              ) : details ? (
                <>
                  {/* Avatar */}
                  <View className="w-20 h-20 rounded-full border-4 border-slate-700 shadow-lg mb-3 mt-2">
                    <Image
                      source={{ uri: details.avatar_profile }}
                      className="w-full h-full rounded-full bg-slate-200"
                      resizeMode="cover"
                    />
                  </View>

                  <Text className="text-xl font-bold text-white text-center mb-1">
                    {details.name}
                  </Text>
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="star" size={14} color={Colors.dark.secondary} />
                    <Text className="text-sm font-bold text-slate-300 ml-1">
                      {details.rating?.toFixed(1) || "0.0"}
                    </Text>
                  </View>
                  <Text className="text-sm font-semibold text-slate-400 mb-5 text-center">
                    Quiere unirse a tu viaje
                  </Text>

                  {/* Mini Map — shows pickup + destination */}
                  {(hasPickup || hasDest) && (
                    <View className="w-full h-44 rounded-xl overflow-hidden mb-4 border border-slate-700">
                      <Mapbox.MapView
                        style={StyleSheet.absoluteFillObject}
                        styleURL={Mapbox.StyleURL.TrafficNight}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                      >
                        <Camera
                          zoomLevel={13}
                          centerCoordinate={[mapCenterLng, mapCenterLat]}
                        />
                        {hasPickup && (
                          <MarkerView
                            id="req-pickup"
                            coordinate={[details.pickup_longitude, details.pickup_latitude]}
                            anchor={{ x: 0.5, y: 1 }}
                          >
                            <View className="items-center">
                              <View className="bg-secondary p-1.5 rounded-full border-2 border-white shadow">
                                <Ionicons name="person" size={14} color="white" />
                              </View>
                            </View>
                          </MarkerView>
                        )}
                        {hasDest && (
                          <MarkerView
                            id="req-destination"
                            coordinate={[details.destination_longitude, details.destination_latitude]}
                            anchor={{ x: 0.5, y: 1 }}
                          >
                            <View className="items-center">
                              <View className="bg-red-500 p-1.5 rounded-full border-2 border-white shadow">
                                <Ionicons name="flag" size={14} color="white" />
                              </View>
                            </View>
                          </MarkerView>
                        )}
                      </Mapbox.MapView>
                    </View>
                  )}

                  {/* Pickup card */}
                  <View className="w-full bg-slate-800/50 p-3 rounded-xl mb-2 flex-row items-center border border-slate-700">
                    <View className="w-9 h-9 rounded-full bg-secondary/20 items-center justify-center mr-3">
                      <Ionicons name="person" size={18} color={Colors.dark.secondary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                        Punto de Recogida
                      </Text>
                      <Text className="text-slate-200 font-medium text-sm" numberOfLines={2}>
                        {details.pickup_address}
                      </Text>
                    </View>
                  </View>

                  {/* Destination card */}
                  <View className="w-full bg-slate-800/50 p-3 rounded-xl mb-6 flex-row items-center border border-slate-700">
                    <View className="w-9 h-9 rounded-full bg-red-900/30 items-center justify-center mr-3">
                      <Ionicons name="flag" size={18} color="#f87171" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                        Destino → Nueva Parada
                      </Text>
                      <Text className="text-slate-200 font-medium text-sm" numberOfLines={2}>
                        {details.destination_address}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row w-full gap-3">
                    <Pressable
                      onPress={() => confirmAction("reject")}
                      disabled={actionLoading}
                      className="flex-1 bg-red-900/20 h-12 rounded-xl items-center justify-center border border-red-900/40"
                    >
                      <Text className="text-red-400 font-bold">Rechazar</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => confirmAction("approve")}
                      disabled={actionLoading}
                      className="flex-1 h-12 rounded-xl items-center justify-center"
                      style={{ backgroundColor: Colors.dark.secondary }}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white font-bold">Aceptar</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <Text className="text-red-400 py-10 text-center">
                  No se pudo cargar la información de la solicitud.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
