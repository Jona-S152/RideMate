import { Colors } from "@/constants/Colors";
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
                <View style={[styles.container, { backgroundColor: Colors.dark.primary }]}>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={20} color="white" />
                    </Pressable>

                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="star" size={32} color={Colors.dark.danger} />
                        </View>
                        <Text style={styles.title}>{title}</Text>
                        {userName && (
                            <View style={{ alignItems: 'center' }}>
                                <Text style={styles.userName}>{userName}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Ionicons name="star" size={14} color={Colors.dark.danger} />
                                    <Text style={{ fontSize: 14, color: '#94a3b8', marginLeft: 4, fontWeight: 'bold' }}>
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
                                    color={rating >= value ? Colors.dark.danger : "#475569"}
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
                        placeholderTextColor="#64748b"
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
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    container: {
        width: "100%",
        borderRadius: 32,
        padding: 24,
        alignItems: "center",
        position: "relative",
        borderWidth: 1,
        borderColor: "#334155",
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: "#1e293b",
        zIndex: 10,
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
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#ffffff",
        marginBottom: 4,
    },
    userName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#e2e8f0",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#94a3b8",
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
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        color: "#ffffff",
        borderWidth: 1,
        borderColor: "#334155",
        marginBottom: 24,
        textAlignVertical: "top",
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
});

