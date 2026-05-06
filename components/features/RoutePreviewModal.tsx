import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, Modal, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";

interface RoutePreviewModalProps {
    visible: boolean;
    onClose: () => void;
    // Route info
    start: string;
    end: string;
    driverName?: string;
    driverAvatar?: string;
    driverRating?: number;
    imageUrl?: string;
    passengers?: number;
    passengersData?: { id: string; avatar: string }[];
    // Actions
    onJoin?: () => void;
    onStartTrip?: () => void;
}

export default function RoutePreviewModal({
    visible,
    onClose,
    start,
    end,
    driverName,
    driverAvatar,
    driverRating,
    imageUrl,
    passengers = 0,
    passengersData = [],
    onJoin,
    onStartTrip,
}: RoutePreviewModalProps) {
    console.log("RoutePreviewModal rendered, visible:", visible);
    const { user } = useAuth();
    const isDriver = user?.driver_mode === true;

    const occupiedCount = passengersData.length > 0 ? passengersData.length : passengers;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                {/* Backdrop overlay */}
                <Pressable
                    style={styles.backdrop}
                    onPress={onClose}
                />

                {/* Sheet Content */}
                <View style={styles.modalView}>
                    {/* Map Image Header */}
                    <View className="w-full h-52 relative">
                        <Image
                            source={
                                imageUrl
                                    ? { uri: imageUrl }
                                    : require('@/assets/images/mapExample.png')
                            }
                            resizeMode="cover"
                            className="w-full h-full"
                        />
                        {/* Drag handle */}
                        <View className="absolute top-3 w-full items-center">
                            <View className="w-10 h-1 bg-white/40 rounded-full" />
                        </View>
                        {/* Close button */}
                        <Pressable
                            onPress={onClose}
                            className="absolute top-4 right-4 bg-black/40 rounded-full p-2"
                        >
                            <Text className="text-white text-xs">✕</Text>
                        </Pressable>
                    </View>

                    {/* Driver Info overlapping the map */}
                    {driverName && (
                        <View className="flex-row items-center px-5 -mt-8 z-10 mb-2">
                            <View className="relative">
                                <Image
                                    source={{ uri: driverAvatar || "https://via.placeholder.com/150" }}
                                    className="w-16 h-16 rounded-full border-[3px] border-[#1C2431]"
                                />
                                <View className="absolute bottom-0 right-0 bg-[#10B981] rounded-full px-1 border-2 border-[#1C2431]">
                                    <Text className="text-[9px] font-bold text-white">
                                        ★ {driverRating ? driverRating.toFixed(1) : "0.0"}
                                    </Text>
                                </View>
                            </View>
                            <View className="ml-3 flex-1 pt-6">
                                <Text className="text-white text-base font-bold">{driverName}</Text>
                                <Text className="text-[#9CA3AF] text-xs">Conductor</Text>
                            </View>
                        </View>
                    )}

                    <ScrollView className="px-5 pb-6" showsVerticalScrollIndicator={false}>
                        {/* Route Info */}
                        <View className="mt-4 mb-4">
                            <Text className="text-[#9CA3AF] text-xs mb-2 uppercase tracking-wider">Detalles de la Ruta</Text>
                            <View className="flex-row items-start">
                                <View className="items-center mr-3 mt-1">
                                    <View className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                                    <View className="w-0.5 h-12 bg-[#374151]" />
                                    <View className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                </View>
                                <View className="flex-1">
                                    <View>
                                        <Text className="text-[#9CA3AF] text-[10px] mb-0.5">ORIGEN</Text>
                                        <Text className="text-white font-semibold text-sm" numberOfLines={2}>
                                            {start}
                                        </Text>
                                    </View>
                                    <View className="h-4" />
                                    <View>
                                        <Text className="text-[#9CA3AF] text-[10px] mb-0.5">DESTINO</Text>
                                        <Text className="text-white font-semibold text-sm" numberOfLines={2}>
                                            {end}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Seats section — only for passengers */}
                        {!isDriver && (
                            <View className="mb-5 bg-[#242C3B] p-4 rounded-2xl">
                                <Text className="text-[#9CA3AF] text-xs mb-3 uppercase tracking-wider">Asientos disponibles</Text>
                                <View className="flex-row items-center" style={{ gap: 10 }}>
                                    <View className="flex-row" style={{ gap: 6 }}>
                                        {[0, 1, 2, 3].map((index) => {
                                            const isOccupied = index < occupiedCount;
                                            return (
                                                <MaterialCommunityIcons
                                                    key={index}
                                                    name="car-seat"
                                                    size={26}
                                                    color={isOccupied ? "#10B981" : "#6B7280"}
                                                />
                                            );
                                        })}
                                    </View>
                                    <Text className="text-white text-sm font-medium ml-2">
                                        {4 - occupiedCount} Libres
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Passengers Avatars — only for passengers */}
                        {!isDriver && passengersData.length > 0 && (
                            <View className="mb-5">
                                <Text className="text-[#9CA3AF] text-xs mb-2 uppercase tracking-wider">Pasajeros a bordo</Text>
                                <View className="flex-row" style={{ gap: -10 }}>
                                    {passengersData.map((p, i) => (
                                        <Image
                                            key={p.id}
                                            source={{ uri: p.avatar }}
                                            className="w-10 h-10 rounded-full border-2 border-[#1C2431]"
                                            style={{ zIndex: 30 - i }}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Action Button */}
                        <Pressable
                            style={({ pressed }) => [
                                { backgroundColor: Colors.light.primary, opacity: pressed ? 0.8 : 1 },
                                styles.actionButton
                            ]}
                            onPress={() => {
                                onClose();
                                if (isDriver) {
                                    onStartTrip?.();
                                } else {
                                    onJoin?.();
                                }
                            }}
                        >
                            <Text className="text-[#000A1C] font-bold text-base">
                                {isDriver ? "Iniciar Ruta" : "Unirse a la Ruta"}
                            </Text>
                        </Pressable>
                        <View className="h-4" />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
        backgroundColor: '#1C2431',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        width: '100%',
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    actionButton: {
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    }
});
