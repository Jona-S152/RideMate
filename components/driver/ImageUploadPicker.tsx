import React from "react";
import { View, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "@/components/ThemedText";

interface ImageUploadPickerProps {
  label: string;
  sublabel?: string;
  imageUri: string;
  onImageSelected: (uri: string) => void;
  onImageRemoved?: () => void;
  required?: boolean;
}

export const ImageUploadPicker: React.FC<ImageUploadPickerProps> = ({
  label,
  sublabel,
  imageUri,
  onImageSelected,
  onImageRemoved,
  required = false,
}) => {
  const pickImage = async (useCamera = false) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso Denegado", "Se requiere acceso a la cámara para tomar la fotografía.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permiso Denegado", "Se requiere acceso a la galería para seleccionar la fotografía.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("Error al seleccionar imagen:", error);
      Alert.alert("Error", "No se pudo cargar la imagen seleccionada.");
    }
  };

  const handlePressOptions = () => {
    Alert.alert(
      label,
      "Selecciona una opción para adjuntar el documento:",
      [
        { text: "Tomar Foto", onPress: () => pickImage(true) },
        { text: "Elegir de Galería", onPress: () => pickImage(false) },
        { text: "Cancelar", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  return (
    <View className="mb-5">
      <View className="flex-row items-center mb-2 ml-1">
        <ThemedText className="text-xs font-bold uppercase" style={{ color: Colors.dark.textSecondary }}>
          {label}
        </ThemedText>
        {required && <ThemedText className="text-red-400 font-bold ml-1">*</ThemedText>}
      </View>

      {sublabel && (
        <ThemedText className="text-xs opacity-70 mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
          {sublabel}
        </ThemedText>
      )}

      {imageUri ? (
        <View
          className="relative w-full h-48 rounded-2xl overflow-hidden border"
          style={{ borderColor: Colors.light.secondary, backgroundColor: Colors.dark.glassSoft }}
        >
          <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />

          {/* Action Overlay */}
          <View className="absolute bottom-2 right-2 flex-row gap-2">
            <Pressable
              onPress={handlePressOptions}
              className="p-2.5 rounded-full flex-row items-center gap-1 shadow-md"
              style={{ backgroundColor: Colors.light.secondary }}
            >
              <Ionicons name="camera-outline" size={16} color="white" />
              <ThemedText className="text-white text-xs font-bold">Cambiar</ThemedText>
            </Pressable>

            {onImageRemoved && (
              <Pressable
                onPress={onImageRemoved}
                className="p-2.5 rounded-full bg-red-600/80 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={16} color="white" />
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handlePressOptions}
          className="w-full h-36 rounded-2xl border-2 border-dashed items-center justify-center p-4"
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? "rgba(255, 255, 255, 0.08)" : Colors.dark.glassSoft,
              borderColor: Colors.dark.border,
            },
          ]}
        >
          <View
            className="p-3 rounded-full mb-2"
            style={{ backgroundColor: "rgba(18, 182, 234, 0.15)" }}
          >
            <Ionicons name="cloud-upload-outline" size={26} color={Colors.light.secondary} />
          </View>
          <ThemedText className="text-sm font-semibold text-center" style={{ color: "white" }}>
            Adjuntar imagen o documento
          </ThemedText>
          <ThemedText className="text-xs text-center mt-1 opacity-60" style={{ color: Colors.dark.textSecondary }}>
            Toca aquí para tomar foto o buscar en tu dispositivo
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};
