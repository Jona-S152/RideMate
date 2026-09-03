import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from "react-native-toast-message";

import { useAuth } from "@/app/context/AuthContext";
import { ImageUploadPicker } from "@/components/driver/ImageUploadPicker";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import {
  DriverProfile,
  UpdateDriverProfileData,
  Vehicle,
} from "@/interfaces/driver";
import { driverService } from "@/services/driver.service";
import { formatDateInput, isValidDate } from "@/utils/formatDate";
import { useAppInsets } from "@/hooks/useAppInsets";
import { useSafeBackHandler } from "@/hooks/useSafeBackHandler";

export default function EditDriverScreen() {
  useSafeBackHandler("/(tabs)/profile");
  const insets = useAppInsets();
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [defaultVehicle, setDefaultVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState<UpdateDriverProfileData>({
    license_number: "",
    license_expiration_date: "",
    license_image_uri: "",
    vehicle_id: "",
    brand: "",
    model: "",
    year: "",
    plate: "",
    color: "",
    seats_capacity: 4,
    registration_doc_uri: "",
    vehicle_image_uri: "",
  });

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const status = await driverService.getDriverApplicationStatus(user.id);

      console.warn("DRIVE DATA: ", JSON.stringify(status, null, 2));

      if (status.hasApplied && status.profile) {
        setDriverProfile(status.profile);
        setDefaultVehicle(status.defaultVehicle);
        setFormData({
          license_number: status.profile.license_number || "",
          license_expiration_date: status.profile.license_expiration_date || "",
          license_image_uri: status.profile.license_image_url || "",
          vehicle_id: status.defaultVehicle?.id || "",
          brand: status.defaultVehicle?.brand || "",
          model: status.defaultVehicle?.model || "",
          year: String(status.defaultVehicle?.year || new Date().getFullYear()),
          plate: status.defaultVehicle?.plate || "",
          color: status.defaultVehicle?.color || "",
          seats_capacity: status.defaultVehicle?.seats_capacity || 4,
          registration_doc_uri: status.defaultVehicle?.registration_doc_url || "",
          vehicle_image_uri: status.defaultVehicle?.vehicle_image_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading driver data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof UpdateDriverProfileData>(
    key: K,
    value: UpdateDriverProfileData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!formData.license_number.trim()) {
      Toast.show({
        type: "error",
        text1: "Campo requerido",
        text2: "Ingresa el número de licencia.",
      });
      return;
    }

    if (!formData.seats_capacity || formData.seats_capacity < 0) {
      Toast.show({
        type: "error",
        text1: "Campo requerido",
        text2: "Ingresa el número de asientos.",
      });
      return;
    }

    if (formData.license_expiration_date) {
      const dateCheck = isValidDate(formData.license_expiration_date);
      if (!dateCheck.isValid) {
        Toast.show({
          type: "error",
          text1: "Fecha inválida",
          text2: dateCheck.message,
        });
        return;
      }
    }

    setSaving(true);
    try {
      await driverService.updateDriverProfileForReverification(user.id, formData);

      // Update auth context: RPC already sets is_driver = false in users table
      await updateUser({ is_driver: false, driver_mode: false });

      Toast.show({
        type: "success",
        text1: "Cambios enviados",
        text2: "Tu estado de conductor estará en pausa hasta que el administrador los apruebe.",
      });

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/profile");
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "No se pudieron guardar los cambios.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.dark.secondary} />
        <ThemedText style={styles.loadingText}>Cargando datos...</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView style={styles.scrollView} bounces={false}>
      {/* ── HEADER ──────────────────────────────────────────── */}
      <ThemedView
        lightColor={Colors.dark.glass}
        darkColor={Colors.dark.glass}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Pressable
          onPress={handleGoBack}
          style={({ pressed }) => [
            styles.backButton,
            { top: insets.top + 10 },
            pressed && { backgroundColor: "rgba(255,255,255,0.15)" },
          ]}
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </Pressable>

        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="car-sport" size={28} color={Colors.dark.secondary} />
          </View>
          <ThemedText style={styles.headerTitle}>
            Datos de Conductor y Vehículo
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Modifica tu licencia o vehículo predeterminado
          </ThemedText>
        </View>
      </ThemedView>

      <View style={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        {/* ── WARNING CARD ──────────────────────────────────── */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <ThemedText style={styles.warningTitle}>Re-verificación requerida</ThemedText>
          </View>
          <ThemedText style={styles.warningText}>
            Al guardar los cambios, tu solicitud pasará nuevamente a revisión administrativa.
            Tu estado de conductor estará en pausa hasta ser aprobado.
          </ThemedText>
        </View>

        {/* ── SECCIÓN: LICENCIA ────────────────────────────── */}
        <ThemedText style={styles.sectionTitle}>Datos de Licencia</ThemedText>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.fieldLabel}>Número de licencia *</ThemedText>
          <ThemedTextInput
            lightColor={Colors.dark.glassSoft}
            style={styles.input}
            placeholder="Ej. 1723456789"
            value={formData.license_number}
            onChangeText={(val) => updateField("license_number", val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={styles.fieldLabel}>Fecha de expiración (AAAA-MM-DD)</ThemedText>
          <ThemedTextInput
            lightColor={Colors.dark.glassSoft}
            style={styles.input}
            maxLength={10}
            keyboardType="phone-pad"
            placeholder="Ej. 2028-12-31"
            value={formData.license_expiration_date || ""}
            onChangeText={(val) => {
              const formatted = formatDateInput(val);
              updateField("license_expiration_date", formatted);
            }}
          />
        </View>

        <ImageUploadPicker
          label="Foto de licencia de conducir"
          imageUri={formData.license_image_uri || ""}
          onImageSelected={(uri) => updateField("license_image_uri", uri)}
        />

        {/* ── SECCIÓN: VEHÍCULO ──────────────────────────── */}
        {formData.vehicle_id ? (
          <>
            <ThemedText style={[styles.sectionTitle, { marginTop: 24 }]}>
              Datos del Vehículo
            </ThemedText>

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <ThemedText style={styles.fieldLabel}>Marca</ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  style={styles.input}
                  placeholder="Ej. Chevrolet"
                  value={formData.brand}
                  onChangeText={(val) => updateField("brand", val)}
                />
              </View>
              <View style={styles.halfField}>
                <ThemedText style={styles.fieldLabel}>Modelo</ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  style={styles.input}
                  placeholder="Ej. Sail"
                  value={formData.model}
                  onChangeText={(val) => updateField("model", val)}
                />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <ThemedText style={styles.fieldLabel}>Año</ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  style={styles.input}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholder="Ej. 2020"
                  value={formData.year}
                  onChangeText={(val) => updateField("year", val)}
                />
              </View>
              <View style={styles.halfField}>
                <ThemedText style={styles.fieldLabel}>Placa</ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  style={styles.input}
                  autoCapitalize="characters"
                  placeholder="Ej. ABC-1234"
                  value={formData.plate}
                  onChangeText={(val) => updateField("plate", val)}
                />
              </View>
            </View>

            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <ThemedText style={styles.fieldLabel}>Color</ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  style={styles.input}
                  placeholder="Ej. Blanco"
                  value={formData.color}
                  onChangeText={(val) => updateField("color", val)}
                />
              </View>
              <View style={styles.halfField}>
                <ThemedText style={styles.fieldLabel}>Asientos</ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="4"
                  value={String(formData.seats_capacity)}
                  onChangeText={(val) => {
                    // Remover cualquier carácter no numérico
                    const cleanVal = val.replace(/[^0-9]/g, "");
                    // Si está vacío, guardamos 0 temporalmente para permitir borrar; de lo contrario, convertimos a número
                    updateField("seats_capacity", cleanVal === "" ? 0 : parseInt(cleanVal, 10));
                  }}
                />
              </View>
            </View>

            <ImageUploadPicker
              label="Foto de matrícula / SOAT"
              imageUri={formData.registration_doc_uri || ""}
              onImageSelected={(uri) => updateField("registration_doc_uri", uri)}
            />

            <View style={{ marginTop: 8 }}>
              <ImageUploadPicker
                label="Foto del vehículo"
                imageUri={formData.vehicle_image_uri || ""}
                onImageSelected={(uri) => updateField("vehicle_image_uri", uri)}
              />
            </View>
          </>
        ) : null}

        {/* ── BUTTONS ──────────────────────────────────────── */}
        <View style={styles.buttonsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && { backgroundColor: "rgba(12,22,42,0.95)" },
            ]}
            onPress={handleGoBack}
            disabled={saving}
          >
            <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={styles.saveButtonText}>
                Enviar a revisión
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  headerContent: {
    alignItems: "center",
    marginTop: 8,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(37,99,235,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  warningCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F59E0B",
  },
  warningText: {
    fontSize: 12,
    color: "rgba(245,158,11,0.85)",
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    color: Colors.dark.secondary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    fontSize: 14,
  },
  rowFields: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: Colors.dark.glassSoft,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cancelButtonText: {
    color: Colors.dark.text,
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    backgroundColor: Colors.dark.secondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
});
