import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { ThemedText } from "../ThemedText";

export interface ConfirmActionModalProps {
  visible: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: "danger" | "warning" | "info";
  iconName?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionModal({
  visible,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmType = "danger",
  iconName,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const getHeaderIcon = (): keyof typeof Ionicons.glyphMap => {
    if (iconName) return iconName;
    if (confirmType === "danger") return "trash-outline";
    if (confirmType === "warning") return "warning-outline";
    return "help-circle-outline";
  };

  const getConfirmBg = () => {
    if (confirmType === "danger") return "#EF4444";
    if (confirmType === "warning") return "#F59E0B";
    return Colors.dark.secondary;
  };

  const getIconBg = () => {
    if (confirmType === "danger") return "rgba(239,68,68,0.15)";
    if (confirmType === "warning") return "rgba(245,158,11,0.15)";
    return "rgba(37,99,235,0.15)";
  };

  const getIconColor = () => {
    if (confirmType === "danger") return "#EF4444";
    if (confirmType === "warning") return "#F59E0B";
    return Colors.dark.secondary;
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 justify-center items-center bg-black/70 px-5"
        onPress={onCancel}
      >
        <Pressable
          style={{
            backgroundColor: Colors.dark.primary,
            borderColor: Colors.dark.border,
          }}
          className="rounded-3xl w-full max-w-md overflow-hidden border p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Icon */}
          <View className="items-center mb-4">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: getIconBg() }}
            >
              <Ionicons name={getHeaderIcon()} size={32} color={getIconColor()} />
            </View>

            <ThemedText className="text-xl font-bold text-white text-center">
              {title}
            </ThemedText>

            <ThemedText className="text-sm text-slate-300 text-center mt-2 leading-5">
              {description}
            </ThemedText>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-4">
            <Pressable
              onPress={onCancel}
              disabled={loading}
              className="flex-1 py-3.5 rounded-full items-center border"
              style={{
                borderColor: Colors.dark.border,
                backgroundColor: Colors.dark.glassSoft,
              }}
            >
              <ThemedText className="text-slate-300 font-semibold text-base">
                {cancelText}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 rounded-full items-center shadow-md"
              style={{
                backgroundColor: getConfirmBg(),
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText className="text-white font-bold text-base">
                  {confirmText}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
