import { Colors } from "@/constants/Colors";
import { UserData } from "@/interfaces/available-routes";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

interface PassengerToRate extends UserData {
    selectedRating: number;
    comment: string;
}

interface DriverRatingListModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (ratings: { passenger_id: string; rating: number; comment: string }[]) => Promise<void>;
    passengers: UserData[];
}

export default function DriverRatingListModal({
    visible,
    onClose,
    onSubmit,
    passengers,
}: DriverRatingListModalProps) {
    const [items, setItems] = useState<PassengerToRate[]>([]);
    const [loading, setLoading] = useState(false);

    // Sync items when passengers prop changes or modal becomes visible
    // Solo inicializamos si items está vacío y tenemos pasajeros, 
    // así evitamos que se borren las estrellas si hay un update en segundo plano.
    React.useEffect(() => {
        if (visible && items.length === 0 && passengers.length > 0) {
            setItems(passengers.map((p) => ({ ...p, selectedRating: 0, comment: "" })));
        }

        // Limpiar cuando se cierra el modal
        if (!visible && items.length > 0) {
            setItems([]);
        }
    }, [passengers, visible, items.length]);

    const updateRating = (index: number, value: number) => {
        const newItems = [...items];
        newItems[index].selectedRating = value;
        setItems(newItems);
    };

    const updateComment = (index: number, text: string) => {
        const newItems = [...items];
        newItems[index].comment = text;
        setItems(newItems);
    };

    const handleSubmit = async () => {
        const incomplete = items.some((p) => p.selectedRating === 0);
        if (incomplete && items.length > 0) {
            Toast.show({
                type: "info",
                text1: "Por favor califica a todos los pasajeros",
            });
            return;
        }

        setLoading(true);
        try {
            await onSubmit(
                items.map((p) => ({
                    passenger_id: p.id,
                    rating: p.selectedRating,
                    comment: p.comment,
                }))
            );
            onClose();
        } catch (error) {
            console.error("Error submitting driver ratings:", error);
            Toast.show({
                type: "error",
                text1: "No se pudieron enviar las calificaciones",
            });
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }: { item: PassengerToRate; index: number }) => (
        <View style={styles.card}>
            <View style={styles.passengerHeader}>
                <Image
                    source={{ uri: item.avatar_profile || "https://via.placeholder.com/150" }}
                    style={styles.avatar}
                />
                <View style={styles.passengerInfo}>
                    <Text style={styles.passengerName}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.passengerRole}>Pasajero</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                            <Ionicons name="star" size={10} color={Colors.light.danger} />
                            <Text style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2, fontWeight: 'bold' }}>
                                {item.rating || "0.0"}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable
                        key={value}
                        onPress={() => updateRating(index, value)}
                        style={styles.star}
                    >
                        <Ionicons
                            name={item.selectedRating >= value ? "star" : "star-outline"}
                            size={32}
                            color={item.selectedRating >= value ? Colors.dark.danger : "#475569"}
                        />
                    </Pressable>
                ))}
            </View>

            <TextInput
                style={styles.input}
                placeholder="Comentario opcional..."
                value={item.comment}
                onChangeText={(text) => updateComment(index, text)}
                placeholderTextColor="#94a3b8"
            />
        </View>
    );

    return (
        <Modal
            transparent
            animationType="slide"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: Colors.dark.primary }]}>
                    <Pressable
                        onPress={onClose}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={20} color="white" />
                    </Pressable>

                    <View style={styles.header}>
                        <Text style={styles.title}>Calificar Pasajeros</Text>
                        <Text style={styles.subtitle}>
                            Tu opinión ayuda a mantener la comunidad segura
                        </Text>
                    </View>

                    <FlatList
                        data={items}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />

                    <View style={styles.footer}>
                        <Pressable
                            onPress={handleSubmit}
                            disabled={loading}
                            style={[styles.submitButton, loading && styles.disabledButton]}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitText}>Finalizar y Calificar</Text>
                            )}
                        </Pressable>
                        <Pressable onPress={onClose} style={styles.skipButton}>
                            <Text style={styles.skipText}>Omitir</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "flex-end",
    },
    container: {
        width: "100%",
        height: "85%",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        borderTopWidth: 1,
        borderColor: "#334155",
        position: "relative",
    },
    closeButton: {
        position: "absolute",
        top: 20,
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: "#1e293b",
        borderRadius: 20,
    },
    header: {
        marginBottom: 24,
        marginTop: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#ffffff",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#94a3b8",
    },
    listContent: {
        paddingBottom: 24,
    },
    card: {
        backgroundColor: "rgba(30, 41, 59, 0.5)",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#334155",
    },
    passengerHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#334155",
        marginRight: 12,
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#f1f5f9",
    },
    passengerRole: {
        fontSize: 12,
        color: "#94a3b8",
    },
    starsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 16,
    },
    star: {
        padding: 2,
    },
    input: {
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: "#ffffff",
        borderWidth: 1,
        borderColor: "#334155",
    },
    footer: {
        paddingTop: 16,
        gap: 12,
    },
    submitButton: {
        backgroundColor: Colors.dark.secondary,
        width: "100%",
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    skipButton: {
        width: "100%",
        height: 44,
        justifyContent: "center",
        alignItems: "center",
    },
    skipText: {
        color: "#94a3b8",
        fontSize: 14,
        fontWeight: "500",
    },
});
