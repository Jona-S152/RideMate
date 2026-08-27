import { useAuth } from "@/app/context/AuthContext";
import { Colors } from "@/constants/Colors";
import {
  FeedbackCategory,
  feedbackService,
} from "@/services/feedback.service";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  screenName?: string;
}

const CATEGORIES: { key: FeedbackCategory; label: string; icon: string; color: string }[] = [
  { key: "general", label: "General", icon: "chatbubble-ellipses", color: "#2563EB" },
  { key: "bug", label: "Error / Bug", icon: "bug", color: "#EF4444" },
  { key: "suggestion", label: "Sugerencia", icon: "bulb", color: "#F59E0B" },
  { key: "ux_issue", label: "Problema de UX", icon: "eye-off", color: "#8B5CF6" },
];

export default function FeedbackModal({
  visible,
  onClose,
  screenName = "Home",
}: FeedbackModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setCategory("general");
    setMessage("");
    setSuccess(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!message.trim() || !user?.id) return;
    setLoading(true);
    setError(null);
    try {
      await feedbackService.submitFeedback({
        user_id: user.id,
        category,
        message: message.trim(),
        screen_name: screenName,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? "Error al enviar el feedback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Sheet container – tap inside does NOT close */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: Colors.dark.primary,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: Platform.OS === "ios" ? 36 : 24,
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
                  marginBottom: 20,
                }}
              />

              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <View>
                  <Text style={{ color: "#E2EBF0", fontSize: 20, fontWeight: "800" }}>
                    Feedback
                  </Text>
                  <Text style={{ color: Colors.dark.textSecondary, fontSize: 13, marginTop: 2 }}>
                    Ayúdanos a mejorar RideMate
                  </Text>
                </View>
                <Pressable onPress={handleClose} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={28} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>

              {success ? (
                /* ── Success state ── */
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: "rgba(16,185,129,0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={44} color="#10B981" />
                  </View>
                  <Text style={{ color: "#E2EBF0", fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
                    ¡Gracias por tu feedback!
                  </Text>
                  <Text style={{ color: Colors.dark.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
                    Tu comentario ha sido enviado. Lo revisaremos pronto.
                  </Text>
                  <Pressable
                    onPress={handleClose}
                    style={{
                      marginTop: 24,
                      backgroundColor: "#2563EB",
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 40,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                      Cerrar
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* ── Category chips ── */}
                  <Text style={{ color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Categoría
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 20 }}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat.key;
                      return (
                        <Pressable
                          key={cat.key}
                          onPress={() => setCategory(cat.key)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: isSelected ? cat.color : Colors.dark.borderSecondary,
                            backgroundColor: isSelected
                              ? `${cat.color}22`
                              : "transparent",
                          }}
                        >
                          <Ionicons
                            name={cat.icon as any}
                            size={14}
                            color={isSelected ? cat.color : Colors.dark.textSecondary}
                          />
                          <Text
                            style={{
                              color: isSelected ? cat.color : Colors.dark.textSecondary,
                              fontSize: 13,
                              fontWeight: isSelected ? "700" : "500",
                            }}
                          >
                            {cat.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* ── Message input ── */}
                  <Text style={{ color: Colors.dark.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Mensaje
                  </Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Cuéntanos tu experiencia o reporta un problema..."
                    placeholderTextColor={Colors.dark.textSecondary}
                    multiline
                    numberOfLines={4}
                    style={{
                      backgroundColor: Colors.dark.background,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: Colors.dark.borderSecondary,
                      color: "#E2EBF0",
                      padding: 14,
                      fontSize: 14,
                      lineHeight: 22,
                      minHeight: 110,
                      textAlignVertical: "top",
                      marginBottom: 8,
                    }}
                  />
                  <Text style={{ color: Colors.dark.textSecondary, fontSize: 11, textAlign: "right", marginBottom: 20 }}>
                    {message.length}/500
                  </Text>

                  {/* Error */}
                  {error && (
                    <View
                      style={{
                        backgroundColor: "rgba(239,68,68,0.12)",
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 16,
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={{ color: "#EF4444", fontSize: 13, flex: 1 }}>{error}</Text>
                    </View>
                  )}

                  {/* Submit button */}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!message.trim() || loading}
                    style={{
                      backgroundColor: !message.trim() ? Colors.dark.borderSecondary : "#2563EB",
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                          Enviar Feedback
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
