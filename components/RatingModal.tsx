import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    title?: string;
    subtitle?: string;
    userName?: string;
    userRating?: number;
}

export default function RatingModal({
    visible,
    onClose,
    onSubmit,
    title = "Calificar",
    subtitle = "¿Cómo fue tu experiencia?",
    userName,
    userRating,
}: RatingModalProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRating = (value: number) => {
        setRating(value);
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            alert("Por favor selecciona una calificación");
            return;
        }

        setLoading(true);
        try {
            await onSubmit(rating, comment);
            setRating(0);
            setComment("");
            onClose();
        } catch (error) {
            console.error("Error in RatingModal submit:", error);
            alert("No se pudo enviar la calificación");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </Pressable>

                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="star" size={32} color="#fbbf24" />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        {userName && (
                            <View style={{ alignItems: 'center' }}>
                                <Text style={styles.userName}>{userName}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Ionicons name="star" size={14} color="#fbbf24" />
                                    <Text style={{ fontSize: 14, color: '#64748b', marginLeft: 4, fontWeight: 'bold' }}>
                                        {userRating || "0.0"}
                                    </Text>
                                </View>
                            </View>
                        )}
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </View>

                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((value) => (
                            <Pressable
                                key={value}
                                onPress={() => handleRating(value)}
                                style={styles.star}
                            >
                                <Ionicons
                                    name={rating >= value ? "star" : "star-outline"}
                                    size={40}
                                    color={rating >= value ? "#fbbf24" : "#cbd5e1"}
                                />
                            </Pressable>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Escribe un comentario opcional..."
                        multiline
                        numberOfLines={4}
                        value={comment}
                        onChangeText={setComment}
                        placeholderTextColor="#94a3b8"
                    />

                    <Pressable
                        onPress={handleSubmit}
                        disabled={loading}
                        style={[styles.submitButton, loading && styles.disabledButton]}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitText}>Enviar calificación</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    container: {
        backgroundColor: "white",
        width: "100%",
        borderRadius: 32,
        padding: 24,
        alignItems: "center",
        position: "relative",
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: "#f1f5f9",
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
        marginTop: 8,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#fffbeb",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 4,
    },
    userName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748b",
        textAlign: "center",
    },
    starsContainer: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 24,
    },
    star: {
        padding: 4,
    },
    input: {
        width: "100%",
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        color: "#1e293b",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginBottom: 24,
        textAlignVertical: "top",
    },
    submitButton: {
        backgroundColor: "#001147",
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
});
