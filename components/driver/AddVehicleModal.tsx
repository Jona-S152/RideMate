import React, { useState } from "react";
import { Modal, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { Colors } from "@/constants/Colors";
import { ImageUploadPicker } from "@/components/driver/ImageUploadPicker";
import { driverService } from "@/services/driver.service";
import { AddVehicleFormData } from "@/interfaces/driver";

interface AddVehicleModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onVehicleAdded: () => void;
}

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  visible,
  userId,
  onClose,
  onVehicleAdded,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AddVehicleFormData>({
    brand: "",
    model: "",
    year: String(new Date().getFullYear()),
    plate: "",
    color: "",
    seats_capacity: 4,
    registration_doc_uri: "",
    vehicle_image_uri: "",
    set_as_default: true,
  });

  const updateField = <K extends keyof AddVehicleFormData>(key: K, value: AddVehicleFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveVehicle = async () => {
    if (!formData.brand.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa la marca del vehículo." });
      return;
    }
    if (!formData.model.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa el modelo del vehículo." });
      return;
    }
    if (!formData.year || isNaN(Number(formData.year))) {
      Toast.show({ type: "error", text1: "Año Inválido", text2: "Ingresa un año válido." });
      return;
    }
    if (!formData.plate.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa la placa del vehículo." });
      return;
    }
    if (!formData.color.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa el color del auto." });
      return;
    }
    if (!formData.registration_doc_uri) {
      Toast.show({ type: "error", text1: "Documento Faltante", text2: "Adjunta la foto de la matrícula o SOAT." });
      return;
    }

    try {
      setSubmitting(true);
      await driverService.addNewVehicle(userId, formData);

      Toast.show({
        type: "success",
        text1: "Vehículo Registrado",
        text2: "Tu nuevo vehículo fue registrado exitosamente.",
      });

      // Reset form
      setFormData({
        brand: "",
        model: "",
        year: String(new Date().getFullYear()),
        plate: "",
        color: "",
        seats_capacity: 4,
        registration_doc_uri: "",
        vehicle_image_uri: "",
        set_as_default: true,
      });

      onVehicleAdded();
      onClose();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error al Registrar",
        text2: error.message || "Ocurrió un error al guardar el vehículo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 justify-end">
        <View
          className="w-full max-h-[90%] rounded-t-[36px] p-6"
          style={{ backgroundColor: Colors.dark.glassStrong, borderColor: Colors.dark.border, borderWidth: 1 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-white/10 mb-4">
            <View className="flex-row items-center gap-2">
              <View className="p-2 rounded-xl" style={{ backgroundColor: "rgba(18, 182, 234, 0.15)" }}>
                <Ionicons name="car-sport-outline" size={22} color={Colors.light.secondary} />
              </View>
              <ThemedText className="text-lg font-bold">Agregar Nuevo Vehículo</ThemedText>
            </View>

            <Pressable onPress={onClose} className="p-2 rounded-full bg-white/10">
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Brand & Model */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Marca *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. Toyota"
                  value={formData.brand}
                  onChangeText={(val) => updateField("brand", val)}
                />
              </View>

              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Modelo *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. Yaris"
                  value={formData.model}
                  onChangeText={(val) => updateField("model", val)}
                />
              </View>
            </View>

            {/* Year & Plate */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Año *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. 2023"
                  keyboardType="numeric"
                  value={formData.year}
                  onChangeText={(val) => updateField("year", val)}
                />
              </View>

              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Placa *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3 px-4 rounded-2xl border text-white uppercase"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. PBX-5678"
                  autoCapitalize="characters"
                  value={formData.plate}
                  onChangeText={(val) => updateField("plate", val)}
                />
              </View>
            </View>

            {/* Color & Seats */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Color *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. Negro"
                  value={formData.color}
                  onChangeText={(val) => updateField("color", val)}
                />
              </View>

              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Capacidad Asientos *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. 4"
                  keyboardType="numeric"
                  value={String(formData.seats_capacity)}
                  onChangeText={(val) => updateField("seats_capacity", Number(val) || 1)}
                />
              </View>
            </View>

            {/* Document Pickers */}
            <ImageUploadPicker
              label="Documento de Matrícula / SOAT *"
              imageUri={formData.registration_doc_uri}
              onImageSelected={(uri) => updateField("registration_doc_uri", uri)}
              onImageRemoved={() => updateField("registration_doc_uri", "")}
              required
            />

            <ImageUploadPicker
              label="Foto del Vehículo (Opcional)"
              imageUri={formData.vehicle_image_uri}
              onImageSelected={(uri) => updateField("vehicle_image_uri", uri)}
              onImageRemoved={() => updateField("vehicle_image_uri", "")}
            />

            {/* Set as Default Checkbox */}
            <Pressable
              onPress={() => updateField("set_as_default", !formData.set_as_default)}
              className="p-3.5 rounded-2xl mb-6 flex-row items-center justify-between border"
              style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border }}
            >
              <ThemedText className="text-xs font-medium">Establecer como auto predeterminado para viajes</ThemedText>
              <View
                className="w-5 h-5 rounded-md items-center justify-center border"
                style={{
                  backgroundColor: formData.set_as_default ? Colors.light.secondary : "transparent",
                  borderColor: formData.set_as_default ? Colors.light.secondary : Colors.dark.border,
                }}
              >
                {formData.set_as_default && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
            </Pressable>

            {/* Submit Button */}
            <Pressable
              style={{ backgroundColor: Colors.light.secondary }}
              className="w-full py-4 rounded-full items-center shadow-lg"
              onPress={handleSaveVehicle}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText className="text-white font-bold text-base">Guardar Vehículo</ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
