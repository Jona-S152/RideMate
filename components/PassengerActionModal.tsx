import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import { Ionicons } from "@expo/vector-icons";
import Mapbox, { Camera, MarkerView } from "@rnmapbox/maps";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface PassengerActionModalProps {
    visible: boolean;
    passengerId: string | null;
    tripSessionId: number;
    onClose: () => void;
    onActionComplete: () => void; // Callback para refrescar la lista
}

interface PassengerDetails {
    id: string;
    name: string;
    avatar_profile: string;
    pickup_location?: string;
    pickup_latitude?: number;
    pickup_longitude?: number;
    rating?: number;
}

export default function PassengerActionModal({
    visible,
    passengerId,
    tripSessionId,
    onClose,
    onActionComplete
}: PassengerActionModalProps) {
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState<PassengerDetails | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (visible && passengerId) {
            fetchDetails();
        }
    }, [visible, passengerId]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // 1. Obtener perfil del usuario
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id, name, avatar_profile")
                .eq("id", passengerId)
                .single();

            if (userError) throw userError;

            // 2. Obtener punto de encuentro (si existe)
            const { data: meetingData, error: meetingError } = await supabase
                .from("passenger_meeting_points")
                .select("location, latitude, longitude")
                .eq("trip_session_id", tripSessionId)
                .eq("passenger_id", passengerId)
                .single();

            console.log("Meeting Data:", meetingData);

            if (meetingError) console.warn("No meeting point found", meetingError);

            // 3. Obtener rating del usuario
            const ratingInfo = await ratingsService.getUserRating(userData.id);

            setDetails({
                id: userData.id,
                name: userData.name,
                avatar_profile: userData.avatar_profile,
                pickup_location: meetingData?.location || "Punto desconocido",
                pickup_latitude: meetingData?.latitude,
                pickup_longitude: meetingData?.longitude,
                rating: ratingInfo.rating,
            });

        } catch (error) {
            console.error("Error fetching passenger details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (status: 'joined' | 'rejected') => {
        if (!passengerId) return;
        setActionLoading(true);

        try {
            let updateResult;
            if (status === 'rejected') {
                updateResult = await supabase
                    .from("passenger_trip_sessions")
                    .update({ rejected: true })
                    .eq("trip_session_id", tripSessionId)
                    .eq("passenger_id", passengerId)
                    .select();
            } else {
                updateResult = await supabase
                    .from("passenger_trip_sessions")
                    .update({ status: 'joined', rejected: false })
                    .eq("trip_session_id", tripSessionId)
                    .eq("passenger_id", passengerId)
                    .select();
            }

            const { data, error } = updateResult;

            if (error) {
                console.error("Supabase error updating status:", error);
                alert("Error al actualizar estado: " + error.message);
                throw error;
            }

            console.log("Status update success. Data:", data);

            if (!data || data.length === 0) {
                console.warn("No rows were updated. Check if the tripSessionId and passengerId are correct.");
                alert("No se encontró el registro para actualizar.");
            } else {
                alert("Estado actualizado correctamente a: " + status);
            }

            onActionComplete();
            onClose();
        } catch (error) {
            console.error("Error updating status:", error);
            // Podrías agregar una alerta aquí si lo deseas
        } finally {
            setActionLoading(false);
        }
    };

    if (!visible) return null;

    const hasCoordinates = details?.pickup_latitude && details?.pickup_longitude;

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50 px-6">
                <View className="bg-white w-full rounded-3xl p-6 shadow-2xl items-center relative">

                    {/* Close Button */}
                    <Pressable
                        onPress={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-slate-100 rounded-full"
                    >
                        <Ionicons name="close" size={20} color="black" />
                    </Pressable>

                    {loading ? (
                        <View className="py-10">
                            <ActivityIndicator size="large" color={Colors.light.primary} />
                            <Text className="text-slate-500 mt-4">Cargando información...</Text>
                        </View>
                    ) : details ? (
                        <>
                            {/* Avatar */}
                            <View className="w-24 h-24 rounded-full border-4 border-white shadow-lg -mt-16 mb-4">
                                <Image
                                    source={{ uri: details.avatar_profile }}
                                    className="w-full h-full rounded-full bg-slate-200"
                                    resizeMode="cover"
                                />
                            </View>

                            <Text className="text-xl font-bold text-slate-800 text-center mb-1">
                                {details.name}
                            </Text>
                            <View className="flex-row items-center mb-1">
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Text className="text-sm font-bold text-slate-700 ml-1">
                                    {details.rating || "0.0"}
                                </Text>
                            </View>
                            <Text className="text-sm font-semibold text-slate-500 mb-6 text-center">
                                Quiere unirse a tu viaje
                            </Text>

                            {/* Mini Map */}
                            {hasCoordinates && (
                                <View className="w-full h-40 rounded-xl overflow-hidden mb-4 border border-slate-200">
                                    <Mapbox.MapView
                                        style={StyleSheet.absoluteFillObject}
                                        styleURL={Mapbox.StyleURL.Street}
                                        scrollEnabled={false}
                                        zoomEnabled={false}
                                        pitchEnabled={false}
                                        rotateEnabled={false}
                                    >
                                        <Camera
                                            zoomLevel={14}
                                            centerCoordinate={[details.pickup_longitude!, details.pickup_latitude!]}
                                        />
                                        <MarkerView
                                            id="pickup-marker"
                                            coordinate={[details.pickup_longitude!, details.pickup_latitude!]}
                                            anchor={{ x: 0.5, y: 1 }}
                                        >
                                            <View className="items-center">
                                                <Ionicons name="location-sharp" size={32} color="#2563eb" />
                                            </View>
                                        </MarkerView>
                                    </Mapbox.MapView>
                                </View>
                            )}

                            {/* Info Card */}
                            <View className="w-full bg-slate-50 p-4 rounded-xl mb-6 flex-row items-center border border-slate-100">
                                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                                    <Ionicons name="location" size={20} color="#2563eb" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs text-slate-400 font-bold uppercase">Punto de Recogida</Text>
                                    <Text className="text-slate-800 font-medium" numberOfLines={2}>
                                        {details.pickup_location}
                                    </Text>
                                </View>
                            </View>

                            {/* Buttons */}
                            <View className="flex-row w-full gap-4">
                                <Pressable
                                    onPress={() => handleAction('rejected')}
                                    disabled={actionLoading}
                                    className="flex-1 bg-red-100 h-12 rounded-xl items-center justify-center border border-red-200"
                                >
                                    <Text className="text-red-600 font-bold">Rechazar</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handleAction('joined')}
                                    disabled={actionLoading}
                                    className="flex-1 h-12 rounded-xl items-center justify-center"
                                    style={{ backgroundColor: Colors.light.secondary }}
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
                        <Text className="text-red-500 py-10">No se pudo cargar la información.</Text>
                    )}

                </View>
            </View>
        </Modal>
    );
}
