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
            alert("Por favor califica a todos los pasajeros");
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
            alert("No se pudieron enviar las calificaciones");
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
                            <Ionicons name="star" size={10} color="#BC3333" />
                            <Text style={{ fontSize: 10, color: '#64748b', marginLeft: 2, fontWeight: 'bold' }}>
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
                            color={item.selectedRating >= value ? "#BC3333" : "#cbd5e1"}
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
                <View style={styles.container}>
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
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: "white",
        width: "100%",
        height: "85%",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748b",
    },
    listContent: {
        paddingBottom: 24,
    },
    card: {
        backgroundColor: "#f8fafc",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
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
        backgroundColor: "#e2e8f0",
        marginRight: 12,
    },
    passengerInfo: {
        flex: 1,
    },
    passengerName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#334155",
    },
    passengerRole: {
        fontSize: 12,
        color: "#64748b",
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
        backgroundColor: "white",
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: "#1e293b",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    footer: {
        paddingTop: 16,
        gap: 12,
    },
    submitButton: {
        backgroundColor: "#000D3A",
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
        color: "#64748b",
        fontSize: 14,
        fontWeight: "500",
    },
});
