import React, { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { driverService } from "@/services/driver.service";
import { Vehicle } from "@/interfaces/driver";

interface VehicleSelectorDropdownProps {
  userId: string;
  onVehicleSelected: (vehicleId: string, vehicle: Vehicle) => void;
}

export const VehicleSelectorDropdown: React.FC<VehicleSelectorDropdownProps> = ({
  userId,
  onVehicleSelected,
}) => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, [userId]);

  const loadVehicles = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await driverService.getDriverVehicles(userId);
      setVehicles(data);

      if (data.length > 0) {
        // Pre-select default vehicle or first vehicle
        const defaultVeh = data.find((v) => v.is_default) || data[0];
        setSelectedVehicle(defaultVeh);
        onVehicleSelected(defaultVeh.id, defaultVeh);
      }
    } catch (error) {
      console.error("Error al cargar vehículos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (veh: Vehicle) => {
    setSelectedVehicle(veh);
    onVehicleSelected(veh.id, veh);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <View
        className="p-4 rounded-2xl flex-row items-center justify-center my-3 border"
        style={{ backgroundColor: Colors.dark.glassSoft, borderColor: Colors.dark.border }}
      >
        <ActivityIndicator size="small" color={Colors.light.secondary} />
        <ThemedText className="ml-2 text-xs opacity-70">Cargando tus vehículos...</ThemedText>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View
        className="p-4 rounded-2xl mb-4 border bg-amber-500/10 border-amber-500/40 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <Ionicons name="warning-outline" size={20} color="#eab308" />
          <ThemedText className="text-xs text-amber-200">
            No tienes vehículos registrados. Debes registrar uno para iniciar la ruta.
          </ThemedText>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/profile/become-driver")}
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: Colors.light.secondary }}
        >
          <ThemedText className="text-white text-xs font-bold">Registrar</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="mb-4">
      <ThemedText className="text-xs font-bold uppercase mb-2 ml-1" style={{ color: Colors.dark.textSecondary }}>
        Vehículo para esta sesión *
      </ThemedText>

      {/* Main Selector Button */}
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        className="p-4 rounded-2xl flex-row items-center justify-between border shadow-sm"
        style={{
          backgroundColor: Colors.dark.glassSoft,
          borderColor: isOpen ? Colors.light.secondary : Colors.dark.border,
          borderWidth: 1,
        }}
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="p-2.5 rounded-xl justify-center items-center"
            style={{ backgroundColor: "rgba(18, 182, 234, 0.15)" }}
          >
            <Ionicons name="car-sport-outline" size={22} color={Colors.light.secondary} />
          </View>

          {selectedVehicle ? (
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <ThemedText className="text-sm font-bold">
                  {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                </ThemedText>
                {selectedVehicle.is_default && (
                  <View className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400">
                    <ThemedText className="text-[9px] font-bold text-sky-400">PREDETERMINADO</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText className="text-xs opacity-70 mt-0.5" style={{ color: Colors.dark.textSecondary }}>
                Placa: {selectedVehicle.plate} | Color: {selectedVehicle.color} | Capacidad: {selectedVehicle.seats_capacity} asientos
              </ThemedText>
            </View>
          ) : (
            <ThemedText className="text-sm opacity-60">Selecciona un vehículo...</ThemedText>
          )}
        </View>

        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors.dark.textSecondary}
        />
      </Pressable>

      {/* Dropdown Options List */}
      {isOpen && (
        <View
          className="mt-2 rounded-2xl overflow-hidden border z-50"
          style={{ backgroundColor: "#18202F", borderColor: Colors.dark.border }}
        >
          {vehicles.map((veh) => {
            const isSelected = selectedVehicle?.id === veh.id;
            return (
              <Pressable
                key={veh.id}
                onPress={() => handleSelect(veh)}
                className="p-3.5 flex-row items-center justify-between border-b"
                style={{
                  backgroundColor: isSelected ? "rgba(18, 182, 234, 0.1)" : "transparent",
                  borderColor: "rgba(255, 255, 255, 0.06)",
                }}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Ionicons
                    name="car-outline"
                    size={20}
                    color={isSelected ? Colors.light.secondary : Colors.dark.textSecondary}
                  />
                  <View className="flex-1">
                    <ThemedText className="text-sm font-semibold">
                      {veh.brand} {veh.model} ({veh.year})
                    </ThemedText>
                    <ThemedText className="text-xs opacity-60" style={{ color: Colors.dark.textSecondary }}>
                      Placa: {veh.plate} | Color: {veh.color}
                    </ThemedText>
                  </View>
                </View>

                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.secondary} />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};
