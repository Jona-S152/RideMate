import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, View } from "react-native";
import { ThemedText } from "../ThemedText";

export interface OptionItem {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  type?: "default" | "primary" | "danger" | "cancel";
}

export interface OptionsModalProps {
  visible: boolean;
  title: string;
  description?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  options: OptionItem[];
  onClose: () => void;
}

export default function OptionsModal({
  visible,
  title,
  description,
  iconName,
  options,
  onClose,
}: OptionsModalProps) {
  const getOptionStyle = (type: OptionItem["type"] = "default") => {
    switch (type) {
      case "primary":
        return {
          bg: Colors.light.secondary,
          border: Colors.light.secondary,
          textColor: "#FFFFFF",
          iconColor: "#FFFFFF",
        };
      case "danger":
        return {
          bg: "rgba(239,68,68,0.15)",
          border: "rgba(239,68,68,0.3)",
          textColor: "#EF4444",
          iconColor: "#EF4444",
        };
      case "cancel":
        return {
          bg: Colors.dark.glassSoft,
          border: Colors.dark.border,
          textColor: Colors.dark.textSecondary,
          iconColor: Colors.dark.textSecondary,
        };
      default:
        return {
          bg: Colors.dark.glassSoft,
          border: Colors.dark.border,
          textColor: "#FFFFFF",
          iconColor: Colors.dark.secondary,
        };
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center items-center bg-black/70 px-5"
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: Colors.dark.primary,
            borderColor: Colors.dark.border,
          }}
          className="rounded-3xl w-full max-w-md overflow-hidden border p-6"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="items-center mb-5">
            {iconName && (
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: "rgba(37,99,235,0.15)" }}
              >
                <Ionicons name={iconName} size={28} color={Colors.dark.secondary} />
              </View>
            )}

            <ThemedText className="text-xl font-bold text-white text-center">
              {title}
            </ThemedText>

            {description && (
              <ThemedText className="text-sm text-slate-300 text-center mt-1.5 leading-5">
                {description}
              </ThemedText>
            )}
          </View>

          {/* Options List */}
          <View className="gap-2.5">
            {options.map((option, index) => {
              const style = getOptionStyle(option.type);
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    onClose();
                    option.onPress();
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl flex-row items-center justify-center border"
                  style={{
                    backgroundColor: style.bg,
                    borderColor: style.border,
                  }}
                >
                  {option.iconName && (
                    <Ionicons
                      name={option.iconName}
                      size={20}
                      color={style.iconColor}
                      style={{ marginRight: 10 }}
                    />
                  )}
                  <ThemedText
                    className="font-semibold text-base"
                    style={{ color: style.textColor }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
