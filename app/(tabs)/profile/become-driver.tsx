import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from "react-native-toast-message";

import { useAuth } from "@/app/context/AuthContext";
import { AddVehicleModal } from "@/components/driver/AddVehicleModal";
import { ImageUploadPicker } from "@/components/driver/ImageUploadPicker";
import { StepIndicator } from "@/components/driver/StepIndicator";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useSafeBackHandler } from "@/hooks/useSafeBackHandler";
import {
  BecomeDriverFormData,
  DriverProfile,
  UpdateDriverProfileData,
  Vehicle,
} from "@/interfaces/driver";
import { driverService } from "@/services/driver.service";
import { formatDateInput, isValidDate } from "@/utils/formatDate";

export default function BecomeDriverScreen() {
  useSafeBackHandler("/(tabs)/profile");
  const { user } = useAuth();
  const router = useRouter();

  // Screen & Status State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState<DriverProfile | null>(null);
  const [existingVehicle, setExistingVehicle] = useState<Vehicle | null>(null);
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);

  // Editing Approved Driver State
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [addVehicleModalVisible, setAddVehicleModalVisible] = useState(false);

  // Form Step State (1: Licencia, 2: Vehículo, 3: Revisión)
  const [currentStep, setCurrentStep] = useState(1);

  // Initial Form Fields
  const [formData, setFormData] = useState<BecomeDriverFormData>({
    license_number: "",
    license_expiration_date: "",
    license_image_uri: "",
    brand: "",
    model: "",
    year: String(new Date().getFullYear()),
    plate: "",
    color: "",
    seats_capacity: 4,
    registration_doc_uri: "",
    vehicle_image_uri: "",
    terms_accepted: false,
  });

  // Edit Approved Form Fields
  const [editFormData, setEditFormData] = useState<UpdateDriverProfileData>({
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
    checkDriverStatus();
  }, []);

  const checkDriverStatus = async () => {
    if (!user?.id) return;
    try {
      setLoadingInitial(true);
      const statusData = await driverService.getDriverApplicationStatus(user.id);

      if (statusData.hasApplied && statusData.profile) {
        setExistingProfile(statusData.profile);
        setExistingVehicle(statusData.defaultVehicle);
        setVehiclesList(statusData.vehicles || []);

        // Pre-fill form if rejected and retrying
        if (statusData.profile.status === "rejected") {
          setFormData((prev) => ({
            ...prev,
            license_number: statusData.profile?.license_number || "",
            license_expiration_date: statusData.profile?.license_expiration_date || "",
            license_image_uri: statusData.profile?.license_image_url || "",
            brand: statusData.defaultVehicle?.brand || "",
            model: statusData.defaultVehicle?.model || "",
            year: String(statusData.defaultVehicle?.year || new Date().getFullYear()),
            plate: statusData.defaultVehicle?.plate || "",
            color: statusData.defaultVehicle?.color || "",
            seats_capacity: statusData.defaultVehicle?.seats_capacity || 4,
            registration_doc_uri: statusData.defaultVehicle?.registration_doc_url || "",
            vehicle_image_uri: statusData.defaultVehicle?.vehicle_image_url || "",
          }));
        }
      }
    } catch (error: any) {
      console.error("Error al consultar estado de conductor:", error.message);
    } finally {
      setLoadingInitial(false);
    }
  };

  const updateFormField = <K extends keyof BecomeDriverFormData>(key: K, value: BecomeDriverFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditFormField = <K extends keyof UpdateDriverProfileData>(key: K, value: UpdateDriverProfileData[K]) => {
    setEditFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartEditApproved = () => {
    if (!existingProfile) return;
    setEditFormData({
      license_number: existingProfile.license_number || "",
      license_expiration_date: existingProfile.license_expiration_date || "",
      license_image_uri: existingProfile.license_image_url || "",
      vehicle_id: existingVehicle?.id || "",
      brand: existingVehicle?.brand || "",
      model: existingVehicle?.model || "",
      year: String(existingVehicle?.year || new Date().getFullYear()),
      plate: existingVehicle?.plate || "",
      color: existingVehicle?.color || "",
      seats_capacity: existingVehicle?.seats_capacity || 4,
      registration_doc_uri: existingVehicle?.registration_doc_url || "",
      vehicle_image_uri: existingVehicle?.vehicle_image_url || "",
    });
    setIsEditingApproved(true);
  };

  const handleSetDefaultVehicle = async (vehicleId: string) => {
    if (!user?.id) return;
    try {
      setLoadingInitial(true);
      await driverService.setDefaultVehicle(user.id, vehicleId);
      Toast.show({
        type: "success",
        text1: "Vehículo Predeterminado",
        text2: "Tu auto principal ha sido actualizado.",
      });
      await checkDriverStatus();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });
    } finally {
      setLoadingInitial(false);
    }
  };

  // Step Validations for initial wizard
  const validateStep1 = (): boolean => {
    if (!formData.license_number.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Por favor ingresa tu número de licencia." });
      return false;
    }
    if (!formData.license_expiration_date.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa la fecha de vencimiento de tu licencia (AAAA-MM-DD)." });
      return false;
    }
    if (!formData.license_image_uri) {
      Toast.show({ type: "error", text1: "Documento Faltante", text2: "Por favor adjunta la foto de tu licencia de conducir." });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.brand.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa la marca de tu vehículo." });
      return false;
    }
    if (!formData.model.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa el modelo de tu vehículo." });
      return false;
    }
    if (!formData.year || isNaN(Number(formData.year))) {
      Toast.show({ type: "error", text1: "Año Inválido", text2: "Ingresa un año válido para el auto." });
      return false;
    }
    if (!formData.plate.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa la placa de tu vehículo." });
      return false;
    }
    if (!formData.color.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa el color de tu auto." });
      return false;
    }
    if (!formData.registration_doc_uri) {
      Toast.show({ type: "error", text1: "Documento Faltante", text2: "Adjunta la foto de la matrícula o SOAT del vehículo." });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      handleGoBack();
    }
  };

  const handleGoBack = () => {
    if (isEditingApproved) {
      setIsEditingApproved(false);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  // Submit Initial Application
  const handleSubmitApplication = async () => {
    if (!user?.id) return;
    if (!formData.terms_accepted) {
      Toast.show({
        type: "error",
        text1: "Términos Obligatorios",
        text2: "Debes aceptar la política de protección de datos (LOPDP) para continuar.",
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

    try {
      setSubmitting(true);
      await driverService.submitDriverApplication(user.id, formData);

      Toast.show({
        type: "success",
        text1: "¡Solicitud Enviada!",
        text2: "Tu perfil de conductor y vehículo están en proceso de verificación.",
      });

      await checkDriverStatus();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error en el Envío",
        text2: error.message || "Ocurrió un error al procesar tu registro.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Update for Approved Driver (resets status to 'pending')
  const handleSubmitUpdateReverification = async () => {
    if (!user?.id) return;
    if (!editFormData.license_number.trim()) {
      Toast.show({ type: "error", text1: "Campo Requerido", text2: "Ingresa el número de licencia." });
      return;
    }

    if (editFormData.license_expiration_date) {
      const dateCheck = isValidDate(editFormData.license_expiration_date);
      if (!dateCheck.isValid) {
        Toast.show({
          type: "error",
          text1: "Fecha inválida",
          text2: dateCheck.message,
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      await driverService.updateDriverProfileForReverification(user.id, editFormData);

      Toast.show({
        type: "success",
        text1: "Solicitud de Edición Enviada",
        text2: "Tus datos han sido enviados a revisión por la administración.",
      });

      setIsEditingApproved(false);
      await checkDriverStatus();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error al Actualizar",
        text2: error.message || "No se pudieron actualizar los datos.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color={Colors.light.secondary} />
        <ThemedText className="mt-4 text-sm opacity-70">Cargando información...</ThemedText>
      </View>
    );
  }

  // ----------------------------------------------------
  // VIEW: EDIT APPROVED DRIVER (Triggers Re-Verification)
  // ----------------------------------------------------
  if (existingProfile && existingProfile.status === "approved" && isEditingApproved) {
    return (
      <KeyboardAwareScrollView className="flex-1 bg-background" bounces={false}>
        <ThemedView lightColor={Colors.dark.glassStrong} className="w-full px-6 pt-12 pb-6 rounded-bl-[40px] relative">
          <Pressable
            onPress={() => setIsEditingApproved(false)}
            className="absolute top-12 left-6 p-2 rounded-full z-20"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.08)", borderWidth: 1, borderColor: Colors.dark.border }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <View className="items-center mt-2">
            <ThemedText className="text-xl font-bold text-center">Editar Perfil de Conductor</ThemedText>
            <ThemedText className="text-xs opacity-70 text-center px-4 mt-1">
              Modifica la información de tu licencia o vehículo activo
            </ThemedText>
          </View>
        </ThemedView>

        <View className="px-6 py-6">
          {/* Warning Re-Verification Card */}
          <View className="p-4 rounded-2xl mb-6 bg-amber-500/15 border border-amber-500/40">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="alert-circle" size={20} color="#eab308" />
              <ThemedText className="text-amber-400 font-bold text-sm">Re-Verificación Requerida</ThemedText>
            </View>
            <ThemedText className="text-xs text-amber-200 opacity-90">
              Al guardar los cambios, tu solicitud pasará nuevamente a estado 'En Revisión' para ser verificada por administración.
            </ThemedText>
          </View>

          {/* License Details */}
          <ThemedText className="text-sm font-bold uppercase mb-4" style={{ color: Colors.light.secondary }}>
            Datos de Licencia
          </ThemedText>

          <View className="mb-4">
            <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
              Número de Licencia *
            </ThemedText>
            <ThemedTextInput
              lightColor={Colors.dark.glassSoft}
              className="py-3 px-4 rounded-2xl border text-white"
              style={{ borderColor: Colors.dark.border }}
              value={editFormData.license_number}
              onChangeText={(val) => updateEditFormField("license_number", val)}
            />
          </View>

          <View className="mb-4">
            <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
              Fecha Expiración (AAAA-MM-DD)
            </ThemedText>
            <ThemedTextInput
              lightColor={Colors.dark.glassSoft}
              className="py-3 px-4 rounded-2xl border text-white"
              style={{ borderColor: Colors.dark.border }}
              value={editFormData.license_expiration_date || ""}
              maxLength={10}
              keyboardType="number-pad"
              onChangeText={(val) => {
                const formatted = formatDateInput(val);
                updateEditFormField("license_expiration_date", formatted);
              }}
            />
          </View>

          <ImageUploadPicker
            label="Foto Licencia de Conducir"
            imageUri={editFormData.license_image_uri || ""}
            onImageSelected={(uri) => updateEditFormField("license_image_uri", uri)}
          />

          {/* Vehicle Details */}
          {editFormData.vehicle_id ? (
            <>
              <ThemedText className="text-sm font-bold uppercase mb-4 mt-4" style={{ color: Colors.light.secondary }}>
                Datos de Vehículo Activo
              </ThemedText>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                    Marca
                  </ThemedText>
                  <ThemedTextInput
                    lightColor={Colors.dark.glassSoft}
                    className="py-3 px-4 rounded-2xl border text-white"
                    style={{ borderColor: Colors.dark.border }}
                    value={editFormData.brand}
                    onChangeText={(val) => updateEditFormField("brand", val)}
                  />
                </View>

                <View className="flex-1">
                  <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                    Modelo
                  </ThemedText>
                  <ThemedTextInput
                    lightColor={Colors.dark.glassSoft}
                    className="py-3 px-4 rounded-2xl border text-white"
                    style={{ borderColor: Colors.dark.border }}
                    value={editFormData.model}
                    onChangeText={(val) => updateEditFormField("model", val)}
                  />
                </View>
              </View>

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                    Año
                  </ThemedText>
                  <ThemedTextInput
                    lightColor={Colors.dark.glassSoft}
                    className="py-3 px-4 rounded-2xl border text-white"
                    style={{ borderColor: Colors.dark.border }}
                    keyboardType="numeric"
                    value={editFormData.year}
                    onChangeText={(val) => updateEditFormField("year", val)}
                  />
                </View>

                <View className="flex-1">
                  <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                    Placa
                  </ThemedText>
                  <ThemedTextInput
                    lightColor={Colors.dark.glassSoft}
                    className="py-3 px-4 rounded-2xl border text-white uppercase"
                    style={{ borderColor: Colors.dark.border }}
                    autoCapitalize="characters"
                    value={editFormData.plate}
                    onChangeText={(val) => updateEditFormField("plate", val)}
                  />
                </View>
              </View>

              <ImageUploadPicker
                label="Foto de Matrícula / SOAT"
                imageUri={editFormData.registration_doc_uri || ""}
                onImageSelected={(uri) => updateEditFormField("registration_doc_uri", uri)}
              />
            </>
          ) : null}

          <View className="flex-row gap-3 mt-4">
            <Pressable
              className="flex-1 py-4 rounded-full items-center border"
              style={{ borderColor: Colors.dark.border, backgroundColor: Colors.dark.glassSoft }}
              onPress={() => setIsEditingApproved(false)}
              disabled={submitting}
            >
              <ThemedText className="text-white font-semibold">Cancelar</ThemedText>
            </Pressable>

            <Pressable
              style={{ backgroundColor: Colors.light.secondary }}
              className="flex-1 py-4 rounded-full items-center shadow-lg"
              onPress={handleSubmitUpdateReverification}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText className="text-white font-bold text-base">Enviar a Revisión</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollView>
    );
  }

  // ----------------------------------------------------
  // STATUS VIEW: PENDING / REJECTED (Non-editing mode) / APPROVED
  // ----------------------------------------------------
  if (existingProfile && existingProfile.status !== "rejected") {
    const isPending = existingProfile.status === "pending";
    const isApproved = existingProfile.status === "approved";

    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <ThemedView lightColor={Colors.dark.glassStrong} className="w-full px-6 pt-12 pb-8 rounded-bl-[40px] relative">
          <Pressable
            onPress={handleGoBack}
            className="absolute top-12 left-6 p-2 rounded-full z-20"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.08)", borderWidth: 1, borderColor: Colors.dark.border }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <View className="items-center mt-6">
            <View
              className="p-5 rounded-full mb-3"
              style={{
                backgroundColor: isApproved ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                borderColor: isApproved ? "#22c55e" : "#eab308",
                borderWidth: 1,
              }}
            >
              <Ionicons
                name={isApproved ? "shield-checkmark" : "time-outline"}
                size={54}
                color={isApproved ? "#22c55e" : "#eab308"}
              />
            </View>
            <ThemedText className="text-2xl font-bold text-center">
              {isApproved ? "Conductor Verificado" : "Solicitud en Revisión"}
            </ThemedText>
            <ThemedText className="text-sm opacity-80 text-center px-6 mt-1">
              {isApproved
                ? "Tu cuenta de conductor está activa. Puedes gestionar tus vehículos y perfil."
                : "Estamos verificando tus documentos. Te notificaremos cuando tu cuenta sea aprobada."}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Content Body */}
        <View className="px-6 py-6">
          {/* Status Badge */}
          <View
            className="p-4 rounded-2xl mb-6 flex-row items-center justify-between"
            style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons
                name={isApproved ? "checkmark-circle" : "alert-circle"}
                size={24}
                color={isApproved ? "#22c55e" : "#eab308"}
              />
              <View>
                <ThemedText className="text-xs uppercase font-bold" style={{ color: Colors.dark.textSecondary }}>
                  Estado de Solicitud
                </ThemedText>
                <ThemedText className="text-base font-bold" style={{ color: isApproved ? "#22c55e" : "#eab308" }}>
                  {isApproved ? "APROBADO" : "PENDIENTE DE REVISIÓN"}
                </ThemedText>
              </View>
            </View>

            {isApproved && (
              <Pressable
                onPress={handleStartEditApproved}
                className="px-3 py-1 rounded-full border border-sky-400/50 bg-sky-500/10 flex-row items-center justify-center"
              >
                <View className="items-center justify-center">
                  <Ionicons name="create-outline" size={14} color={Colors.light.secondary} />
                </View>
                <View className="items-center justify-center">
                  <ThemedText
                    className="text-xs font-bold text-sky-400 leading-none"
                    style={{ includeFontPadding: false, textAlignVertical: "center" }}
                  >
                    Editar Datos
                  </ThemedText>
                </View>
              </Pressable>
            )}
          </View>

          {/* License Info Card */}
          <View
            className="p-5 rounded-2xl mb-6"
            style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}
          >
            <ThemedText className="text-sm font-bold uppercase mb-3" style={{ color: Colors.light.secondary }}>
              Información de Licencia
            </ThemedText>
            <View className="flex-row justify-between items-center border-b pb-2 mb-2" style={{ borderColor: Colors.dark.border }}>
              <ThemedText className="text-xs" style={{ color: Colors.dark.textSecondary }}>Licencia:</ThemedText>
              <ThemedText className="text-sm font-semibold">{existingProfile.license_number}</ThemedText>
            </View>
            <View className="flex-row justify-between items-center">
              <ThemedText className="text-xs" style={{ color: Colors.dark.textSecondary }}>Expiración:</ThemedText>
              <ThemedText className="text-sm font-semibold">{existingProfile.license_expiration_date || "No registrada"}</ThemedText>
            </View>
          </View>

          {/* Vehicles List Section (1:N) */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <ThemedText className="text-sm font-bold uppercase" style={{ color: Colors.light.secondary }}>
                Mis Vehículos Registrados ({vehiclesList.length})
              </ThemedText>

              {isApproved && (
                <Pressable
                  onPress={() => setAddVehicleModalVisible(true)}
                  className="flex-row items-center px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: Colors.light.secondary }}
                >
                  <View className="items-center justify-center">
                    <Ionicons name="add" size={16} color="white" />
                  </View>
                  <View className="items-center justify-center">
                    <ThemedText className="text-white text-xs font-bold">Agregar Auto</ThemedText>
                  </View>
                </Pressable>
              )}
            </View>

            {vehiclesList.length === 0 ? (
              <ThemedText className="text-xs opacity-60 text-center py-4">No hay vehículos registrados.</ThemedText>
            ) : (
              vehiclesList.map((item) => (
                <View
                  key={item.id}
                  className="p-4 rounded-2xl mb-3 flex-row items-center justify-between gap-2"
                  style={{
                    backgroundColor: Colors.dark.glassSoft,
                    borderColor: item.is_default ? Colors.light.secondary : Colors.dark.border,
                    borderWidth: item.is_default ? 2 : 1,
                  }}
                >
                  <View className="flex-1">
                    {/* Fila de título y Badge */}
                    <View className="flex-row items-center gap-2 flex-1">
                      <ThemedText
                        className="text-base font-bold flex-shrink"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.brand} {item.model} ({item.year})
                      </ThemedText>

                      {item.is_default && (
                        <View className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400 shrink-0">
                          <ThemedText className="text-[10px] font-bold text-sky-400">PREDETERMINADO</ThemedText>
                        </View>
                      )}
                    </View>

                    <ThemedText
                      className="text-xs opacity-70 mt-1"
                      style={{ color: Colors.dark.textSecondary }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Placa: {item.plate} | Color: {item.color} | Asientos: {item.seats_capacity}
                    </ThemedText>
                  </View>

                  {!item.is_default && isApproved && (
                    <Pressable
                      onPress={() => handleSetDefaultVehicle(item.id)}
                      className="ml-2 px-3 py-2 rounded-xl bg-white/10 shrink-0 self-center items-center justify-center"
                    >
                      <ThemedText
                        className="text-xs font-semibold text-sky-400 leading-none"
                        style={{ includeFontPadding: false }}
                      >
                        Usar por defecto
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>

          <Pressable
            style={{ backgroundColor: Colors.light.secondary }}
            className="w-full py-4 rounded-full items-center shadow-lg"
            onPress={handleGoBack}
          >
            <ThemedText className="text-white font-bold text-base">Volver al Perfil</ThemedText>
          </Pressable>
        </View>

        {/* Modal para agregar nuevos vehículos */}
        {user?.id && (
          <AddVehicleModal
            visible={addVehicleModalVisible}
            userId={user.id}
            onClose={() => setAddVehicleModalVisible(false)}
            onVehicleAdded={checkDriverStatus}
          />
        )}
      </ScrollView>
    );
  }

  // ----------------------------------------------------
  // MULTI-STEP FORM WIZARD VIEW (Initial Application)
  // ----------------------------------------------------
  return (
    <KeyboardAwareScrollView className="flex-1 bg-background" bounces={false}>
      <ThemedView lightColor={Colors.dark.glassStrong} className="w-full px-6 pt-12 pb-4 rounded-bl-[40px] relative">
        <Pressable
          onPress={handlePrevStep}
          className="absolute top-12 left-6 p-2 rounded-full z-20"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.08)", borderWidth: 1, borderColor: Colors.dark.border }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>

        <View className="items-center mt-2">
          <ThemedText className="text-xl font-bold text-center">Conviértete en Conductor</ThemedText>
          <ThemedText className="text-xs opacity-70 text-center px-4 mt-1">
            Paso {currentStep} de 3 — Completa tu solicitud para compartir viajes
          </ThemedText>
        </View>

        <StepIndicator currentStep={currentStep} />
      </ThemedView>

      <View className="px-6 py-6">
        {existingProfile?.status === "rejected" && (
          <View className="p-4 rounded-2xl mb-6 bg-red-500/15 border border-red-500/40">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="alert-circle" size={20} color="#f87171" />
              <ThemedText className="text-red-400 font-bold text-sm">Solicitud Previa Rechazada</ThemedText>
            </View>
            <ThemedText className="text-xs text-red-200 opacity-90">
              {existingProfile.rejection_reason || "Revisa tus documentos e intenta de nuevo."}
            </ThemedText>
          </View>
        )}

        {/* PASO 1: LICENCIA DE CONDUCIR */}
        {currentStep === 1 && (
          <View>
            <ThemedText className="text-lg font-bold mb-4" style={{ color: Colors.light.secondary }}>
              1. Información de Conductor y Licencia
            </ThemedText>

            <View className="mb-5">
              <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                Número de Licencia de Conducir *
              </ThemedText>
              <ThemedTextInput
                lightColor={Colors.dark.glassSoft}
                className="py-3.5 px-4 rounded-2xl border text-white"
                style={{ borderColor: Colors.dark.border }}
                placeholder="Ej. 1723456789"
                value={formData.license_number}
                onChangeText={(val) => updateFormField("license_number", val)}
              />
            </View>

            <View className="mb-5">
              <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                Fecha de Expiración de Licencia (AAAA-MM-DD) *
              </ThemedText>
              <ThemedTextInput
                lightColor={Colors.dark.glassSoft}
                className="py-3.5 px-4 rounded-2xl border text-white"
                style={{ borderColor: Colors.dark.border }}
                placeholder="Ej. 2028-12-31"
                maxLength={10}
                keyboardType="number-pad"
                value={formData.license_expiration_date}
                onChangeText={(val) => {
                  const formatted = formatDateInput(val);
                  updateFormField("license_expiration_date", formatted);
                }}
              />
            </View>

            <ImageUploadPicker
              label="Foto Frontal de la Licencia de Conducir"
              sublabel="Asegúrate de que la foto sea clara y legible"
              imageUri={formData.license_image_uri}
              onImageSelected={(uri) => updateFormField("license_image_uri", uri)}
              onImageRemoved={() => updateFormField("license_image_uri", "")}
              required
            />

            <Pressable
              style={{ backgroundColor: Colors.light.secondary }}
              className="w-full py-4 rounded-full items-center shadow-lg mt-4 flex-row justify-center gap-2"
              onPress={handleNextStep}
            >
              <ThemedText className="text-white font-bold text-base">Siguiente: Datos del Auto</ThemedText>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </Pressable>
          </View>
        )}

        {/* PASO 2: INFORMACIÓN DEL VEHÍCULO */}
        {currentStep === 2 && (
          <View>
            <ThemedText className="text-lg font-bold mb-4" style={{ color: Colors.light.secondary }}>
              2. Información del Vehículo
            </ThemedText>

            <View className="flex-row gap-3 mb-5">
              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Marca *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3.5 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. Chevrolet"
                  value={formData.brand}
                  onChangeText={(val) => updateFormField("brand", val)}
                />
              </View>

              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Modelo *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3.5 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. Sail"
                  value={formData.model}
                  onChangeText={(val) => updateFormField("model", val)}
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-5">
              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Año *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3.5 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. 2022"
                  keyboardType="numeric"
                  value={formData.year}
                  onChangeText={(val) => updateFormField("year", val)}
                />
              </View>

              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Placa *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3.5 px-4 rounded-2xl border text-white uppercase"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. ABC-1234"
                  autoCapitalize="characters"
                  value={formData.plate}
                  onChangeText={(val) => updateFormField("plate", val)}
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-5">
              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Color *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3.5 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. Blanco"
                  value={formData.color}
                  onChangeText={(val) => updateFormField("color", val)}
                />
              </View>

              <View className="flex-1">
                <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
                  Asientos *
                </ThemedText>
                <ThemedTextInput
                  lightColor={Colors.dark.glassSoft}
                  className="py-3.5 px-4 rounded-2xl border text-white"
                  style={{ borderColor: Colors.dark.border }}
                  placeholder="Ej. 4"
                  keyboardType="numeric"
                  value={String(formData.seats_capacity)}
                  onChangeText={(val) => {
                    const cleanVal = val.replace(/[^0-9]/g, "");
                    updateEditFormField("seats_capacity", cleanVal === "" ? 0 : parseInt(cleanVal, 10));
                  }}
                />
              </View>
            </View>

            <ImageUploadPicker
              label="Documento de Matrícula / SOAT"
              sublabel="Carga la foto oficial de la matrícula del auto"
              imageUri={formData.registration_doc_uri}
              onImageSelected={(uri) => updateFormField("registration_doc_uri", uri)}
              onImageRemoved={() => updateFormField("registration_doc_uri", "")}
              required
            />

            <ImageUploadPicker
              label="Foto del Vehículo (Opcional)"
              sublabel="Foto frontal o lateral para reconocimiento del auto"
              imageUri={formData.vehicle_image_uri}
              onImageSelected={(uri) => updateFormField("vehicle_image_uri", uri)}
              onImageRemoved={() => updateFormField("vehicle_image_uri", "")}
            />

            <View className="flex-row gap-3 mt-4">
              <Pressable
                className="flex-1 py-4 rounded-full items-center border"
                style={{ borderColor: Colors.dark.border, backgroundColor: Colors.dark.glassSoft }}
                onPress={handlePrevStep}
              >
                <ThemedText className="text-white font-semibold">Anterior</ThemedText>
              </Pressable>

              <Pressable
                style={{ backgroundColor: Colors.light.secondary }}
                className="flex-1 py-4 rounded-full items-center shadow-lg flex-row justify-center gap-1"
                onPress={handleNextStep}
              >
                <ThemedText className="text-white font-bold text-base">Revisar Datos</ThemedText>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </Pressable>
            </View>
          </View>
        )}

        {/* PASO 3: REVISIÓN Y TÉRMINOS LOPDP */}
        {currentStep === 3 && (
          <View>
            <ThemedText className="text-lg font-bold mb-4" style={{ color: Colors.light.secondary }}>
              3. Resumen y Confirmación Legal
            </ThemedText>

            <View
              className="p-4 rounded-2xl mb-4"
              style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}
            >
              <View className="flex-row justify-between items-center mb-2">
                <ThemedText className="text-xs font-bold uppercase" style={{ color: Colors.light.secondary }}>
                  Licencia de Conducir
                </ThemedText>
                <Pressable onPress={() => setCurrentStep(1)}>
                  <ThemedText className="text-xs font-bold text-sky-400">Editar</ThemedText>
                </Pressable>
              </View>
              <ThemedText className="text-sm font-semibold">Número: {formData.license_number}</ThemedText>
              <ThemedText className="text-xs opacity-75 mt-1">Expiración: {formData.license_expiration_date}</ThemedText>
            </View>

            <View
              className="p-4 rounded-2xl mb-6"
              style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border, borderWidth: 1 }}
            >
              <View className="flex-row justify-between items-center mb-2">
                <ThemedText className="text-xs font-bold uppercase" style={{ color: Colors.light.secondary }}>
                  Vehículo Registrado
                </ThemedText>
                <Pressable onPress={() => setCurrentStep(2)}>
                  <ThemedText className="text-xs font-bold text-sky-400">Editar</ThemedText>
                </Pressable>
              </View>
              <ThemedText className="text-sm font-semibold">
                {formData.brand} {formData.model} ({formData.year})
              </ThemedText>
              <ThemedText className="text-xs opacity-75 mt-1">
                Placa: {formData.plate.toUpperCase()} | Color: {formData.color} | Capacidad: {formData.seats_capacity} asientos
              </ThemedText>
            </View>

            {/* LOPDP Terms Checkbox Card */}
            <Pressable
              onPress={() => updateFormField("terms_accepted", !formData.terms_accepted)}
              className="p-4 rounded-2xl mb-6 flex-row items-center justify-between border"
              style={{
                backgroundColor: Colors.dark.glassSoft,
                borderColor: formData.terms_accepted ? Colors.light.secondary : Colors.dark.border,
              }}
            >
              <View className="flex-1 mr-3">
                <ThemedText className="text-xs font-bold mb-1" style={{ color: "white" }}>
                  Aceptación de Términos (LOPDP) *
                </ThemedText>
                <ThemedText className="text-xs opacity-75" style={{ color: Colors.dark.textSecondary }}>
                  Confirmo que los documentos son verídicos y acepto la Política de Protección de Datos Personales y Términos de Servicio.
                </ThemedText>
              </View>

              <View
                className="w-6 h-6 rounded-md items-center justify-center border"
                style={{
                  backgroundColor: formData.terms_accepted ? Colors.light.secondary : "transparent",
                  borderColor: formData.terms_accepted ? Colors.light.secondary : Colors.dark.border,
                }}
              >
                {formData.terms_accepted && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
            </Pressable>

            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-4 rounded-full items-center border"
                style={{ borderColor: Colors.dark.border, backgroundColor: Colors.dark.glassSoft }}
                onPress={handlePrevStep}
                disabled={submitting}
              >
                <ThemedText className="text-white font-semibold">Anterior</ThemedText>
              </Pressable>

              <Pressable
                style={{
                  backgroundColor: formData.terms_accepted ? Colors.light.secondary : "rgba(18, 182, 234, 0.4)",
                }}
                className="flex-1 py-4 rounded-full items-center shadow-lg"
                onPress={handleSubmitApplication}
                disabled={submitting || !formData.terms_accepted}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText className="text-white font-bold text-base">Enviar Solicitud</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </KeyboardAwareScrollView>
  );
}
