import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

interface CustomDateRangePickerModalProps {
  visible: boolean;
  startDate: Date | null;
  endDate: Date | null;
  onClose: () => void;
  onApply: (startDate: Date | null, endDate: Date | null) => void;
}

export default function CustomDateRangePickerModal({
  visible,
  startDate,
  endDate,
  onClose,
  onApply,
}: CustomDateRangePickerModalProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(startDate || new Date());
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

  useEffect(() => {
    if (!visible) return;
    setTempStart(startDate);
    setTempEnd(endDate);
    setCurrentMonth(startDate || endDate || new Date());
  }, [visible, startDate, endDate]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isInRange = (day: Date) => {
    if (!tempStart || !tempEnd) return false;
    const start = new Date(tempStart.getFullYear(), tempStart.getMonth(), tempStart.getDate());
    const end = new Date(tempEnd.getFullYear(), tempEnd.getMonth(), tempEnd.getDate());
    const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return target >= start && target <= end;
  };

  const handleDayPress = (dayNumber: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(selected);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (selected < tempStart) {
        setTempStart(selected);
        setTempEnd(null);
      } else {
        setTempEnd(selected);
      }
    }
  };

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newMonth);
  };

  // Presets
  const applyPreset = (preset: "today" | "7days" | "30days" | "thisMonth" | "clear") => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case "today":
        setTempStart(today);
        setTempEnd(today);
        break;
      case "7days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        setTempStart(start);
        setTempEnd(today);
        break;
      }
      case "30days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        setTempStart(start);
        setTempEnd(today);
        break;
      }
      case "thisMonth": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setTempStart(start);
        setTempEnd(end);
        break;
      }
      case "clear":
        setTempStart(null);
        setTempEnd(null);
        break;
    }
  };

  // Render Calendar Grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const daysGrid: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
        <View
          className="w-full max-w-md p-6 rounded-3xl"
          style={{
            backgroundColor: Colors.dark.background,
            borderColor: Colors.dark.border,
            borderWidth: 1,
          }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={22} color={Colors.dark.secondary} />
              <Text className="ml-2 text-lg font-bold text-white">Filtrar por Fecha</Text>
            </View>
            <Pressable onPress={onClose} className="p-1.5 rounded-full bg-white/10">
              <Ionicons name="close" size={20} color="white" />
            </Pressable>
          </View>

          {/* Quick Presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => applyPreset("today")}
                className="px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10"
              >
                <Text className="text-xs font-semibold text-blue-400">Hoy</Text>
              </Pressable>
              <Pressable
                onPress={() => applyPreset("7days")}
                className="px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10"
              >
                <Text className="text-xs font-semibold text-blue-400">Últimos 7 días</Text>
              </Pressable>
              <Pressable
                onPress={() => applyPreset("30days")}
                className="px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10"
              >
                <Text className="text-xs font-semibold text-blue-400">Últimos 30 días</Text>
              </Pressable>
              <Pressable
                onPress={() => applyPreset("thisMonth")}
                className="px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10"
              >
                <Text className="text-xs font-semibold text-blue-400">Este mes</Text>
              </Pressable>
              <Pressable
                onPress={() => applyPreset("clear")}
                className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-800"
              >
                <Text className="text-xs font-semibold text-slate-300">Limpiar</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Month Navigation */}
          <View className="flex-row justify-between items-center mb-4 px-2">
            <Pressable onPress={() => changeMonth(-1)} className="p-2 rounded-full bg-white/10">
              <Ionicons name="chevron-back" size={20} color="white" />
            </Pressable>
            <Text className="text-base font-bold text-white">
              {monthNames[month]} {year}
            </Text>
            <Pressable onPress={() => changeMonth(1)} className="p-2 rounded-full bg-white/10">
              <Ionicons name="chevron-forward" size={20} color="white" />
            </Pressable>
          </View>

          {/* Days of Week Header */}
          <View className="flex-row justify-between mb-2">
            {daysOfWeek.map((day, idx) => (
              <Text key={idx} className="w-9 text-center text-xs font-bold text-slate-400">
                {day}
              </Text>
            ))}
          </View>

          {/* Month Days Grid */}
          <View className="flex-row flex-wrap justify-between mb-6">
            {daysGrid.map((day, idx) => {
              if (!day) {
                return <View key={idx} className="w-9 h-9 m-0.5" />;
              }

              const thisDate = new Date(year, month, day);
              const isStart = isSameDay(thisDate, tempStart);
              const isEnd = isSameDay(thisDate, tempEnd);
              const inRange = isInRange(thisDate);

              let bgStyle = "bg-transparent";
              let textStyle = "text-white font-medium";

              if (isStart || isEnd) {
                bgStyle = "bg-blue-600 rounded-full";
                textStyle = "text-white font-bold";
              } else if (inRange) {
                bgStyle = "bg-blue-500/20 rounded-md";
                textStyle = "text-blue-300 font-semibold";
              }

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleDayPress(day)}
                  className={`w-9 h-9 m-0.5 items-center justify-center ${bgStyle}`}
                >
                  <Text className={`text-xs ${textStyle}`}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Selection Status Display */}
          <View className="p-3 rounded-2xl mb-6 bg-white/5 border border-white/10 flex-row justify-around">
            <View className="items-center">
              <Text className="text-[10px] text-slate-400 uppercase font-bold">Desde</Text>
              <Text className="text-xs font-bold text-blue-400 mt-0.5">
                {tempStart
                  ? tempStart.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                  : "Seleccionar"}
              </Text>
            </View>
            <View className="w-px h-8 bg-slate-700" />
            <View className="items-center">
              <Text className="text-[10px] text-slate-400 uppercase font-bold">Hasta</Text>
              <Text className="text-xs font-bold text-blue-400 mt-0.5">
                {tempEnd
                  ? tempEnd.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                  : "Seleccionar"}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3.5 rounded-2xl items-center border border-slate-700 bg-slate-800"
            >
              <Text className="text-white font-semibold text-sm">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onApply(tempStart, tempEnd);
                onClose();
              }}
              style={{ backgroundColor: Colors.dark.secondary }}
              className="flex-1 py-3.5 rounded-2xl items-center shadow-lg"
            >
              <Text className="text-white font-bold text-sm">Aplicar Filtro</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
