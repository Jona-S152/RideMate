import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";

interface StepIndicatorProps {
  currentStep: number; // 1, 2, or 3
  totalSteps?: number;
}

const STEPS = [
  { step: 1, title: "Licencia", icon: "card-outline" },
  { step: 2, title: "Vehículo", icon: "car-sport-outline" },
  { step: 3, title: "Revisión", icon: "checkmark-circle-outline" },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps = 3 }) => {
  return (
    <View className="w-full px-4 py-3 my-2">
      <View className="flex-row items-center justify-between relative">
        {STEPS.map((item, index) => {
          const isCompleted = currentStep > item.step;
          const isCurrent = currentStep === item.step;

          return (
            <React.Fragment key={item.step}>
              {/* Connector line between steps */}
              {index > 0 && (
                <View
                  className="flex-1 height-1 h-[2px] mx-2"
                  style={{
                    backgroundColor: currentStep >= item.step ? Colors.light.secondary : "rgba(255, 255, 255, 0.15)",
                  }}
                />
              )}

              {/* Step Circle & Label */}
              <View className="items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center border"
                  style={{
                    backgroundColor: isCompleted
                      ? Colors.light.secondary
                      : isCurrent
                      ? "rgba(18, 182, 234, 0.2)"
                      : "rgba(255, 255, 255, 0.05)",
                    borderColor: isCompleted || isCurrent ? Colors.light.secondary : Colors.dark.border,
                    borderWidth: isCurrent ? 2 : 1,
                  }}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={20} color="white" />
                  ) : (
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={isCurrent ? "white" : "rgba(255, 255, 255, 0.4)"}
                    />
                  )}
                </View>
                <ThemedText
                  className="text-[11px] font-medium mt-1 text-center"
                  style={{
                    color: isCurrent || isCompleted ? "white" : Colors.dark.textSecondary,
                    fontWeight: isCurrent ? "700" : "400",
                  }}
                >
                  {item.title}
                </ThemedText>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};
