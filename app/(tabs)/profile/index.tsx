import { useAuth } from "@/app/context/AuthContext";
import ConfirmActionModal from "@/components/Modals/ConfirmActionModal";
import { ThemedText } from "@/components/ThemedText";
import { useBottomTabOverflow } from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useAppInsets } from "@/hooks/useAppInsets";
import { UserData } from "@/interfaces/available-routes";
import { DriverApplicationStatus } from "@/interfaces/driver";
import { driverService } from "@/services/driver.service";
import { ratingsService } from "@/services/ratings.service";
import { userService } from "@/services/user.service";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const insets = useAppInsets();
    const tabOverflow = useBottomTabOverflow();

    const [userData, setUserData] = useState<UserData | null>(null);
    const [driverStatus, setDriverStatus] = useState<DriverApplicationStatus | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    const handleDeleteAccountConfirm = async () => {
        if (!user?.id) return;
        setDeletingAccount(true);
        try {
            await userService.deleteAccount(user.id);
            Toast.show({
                type: "info",
                text1: "Cuenta eliminada",
                text2: "Tu cuenta ha sido eliminada exitosamente.",
            });
            setDeleteModalVisible(false);
            await logout();
        } catch (error: any) {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: error.message || "No se pudo eliminar la cuenta.",
            });
        } finally {
            setDeletingAccount(false);
        }
    };

    const fetchUser = async () => {
        if (!user?.id) return;
        setLoadingProfile(true);
        try {
            const data = await userService.getUserProfile(user.id);
            if (data) {
                const ratingInfo = await ratingsService.getUserRating(user.id);
                setUserData({
                    ...(data as any as UserData),
                    rating: ratingInfo.rating,
                    rating_count: ratingInfo.count,
                    completed_trips_count: data.completed_trips_count || 0
                });
            }

            const driverAppStatus = await driverService.getDriverApplicationStatus(user.id);
            setDriverStatus(driverAppStatus);
        } catch (error) {
            console.error("Error fetching user profile:", error);
        } finally {
            setLoadingProfile(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchUser();
        }, [user?.id])
    );

    const isDriver = userData?.is_driver ?? false;
    const hasPendingApplication = driverStatus?.hasApplied && driverStatus?.profile?.status === 'pending';
    const getRoleLabel = () => {
        if (isDriver) return "Conductor verificado";
        if (hasPendingApplication) return "Verificación pendiente";
        return "Pasajero";
    };
    const getRoleColor = () => {
        if (isDriver) return "#10B981";
        if (hasPendingApplication) return "#F59E0B";
        return Colors.light.textSecondary;
    };
    const getRoleIcon = (): keyof typeof Ionicons.glyphMap => {
        if (isDriver) return "checkmark-circle";
        if (hasPendingApplication) return "time";
        return "person";
    };

    const showEditDriver = driverStatus?.hasApplied ?? false;
    const showBecomeDriver = !isDriver && !driverStatus?.hasApplied;

    return (
        <View style={styles.container}>
            {/* ── HEADER ─────────────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        {userData?.avatar_profile || user?.avatar_profile ? (
                            <Image
                                source={{ uri: userData?.avatar_profile || user?.avatar_profile }}
                                style={styles.avatar}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={48} color={Colors.light.textSecondary} />
                            </View>
                        )}
                        {isDriver && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                            </View>
                        )}
                    </View>

                    <ThemedText lightColor={Colors.light.text} darkColor={Colors.light.text} style={styles.userName}>
                        {userData ? `${userData.name} ${userData.last_name || ""}`.trim() : user?.name || "Usuario"}
                    </ThemedText>

                    <View style={styles.roleBadge}>
                        <Ionicons name={getRoleIcon()} size={14} color={getRoleColor()} />
                        <ThemedText style={[styles.roleText, { color: getRoleColor() }]}>
                            {getRoleLabel()}
                        </ThemedText>
                    </View>
                </View>

                {/* ── METRICS ──────────────────────────────────────── */}
                <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                        <View style={styles.metricIconRow}>
                            <Ionicons name="star" size={18} color="#F59E0B" />
                            <ThemedText lightColor={Colors.light.text} darkColor={Colors.light.text} style={styles.metricValue}>
                                {userData?.rating?.toFixed(1) || "5.0"}
                            </ThemedText>
                        </View>
                        <ThemedText lightColor={Colors.light.textSecondary} darkColor={Colors.light.textSecondary} style={styles.metricLabel}>
                            {userData?.rating_count ?? 0} {(userData?.rating_count ?? 0) === 1 ? "viaje" : "viajes"}
                        </ThemedText>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                        <View style={styles.metricIconRow}>
                            <Ionicons name="car-sport" size={18} color={Colors.light.secondary} />
                            <ThemedText lightColor={Colors.light.text} darkColor={Colors.light.text} style={styles.metricValue}>
                                {userData?.completed_trips_count ?? 0}
                            </ThemedText>
                        </View>
                        <ThemedText lightColor={Colors.light.textSecondary} darkColor={Colors.light.textSecondary} style={styles.metricLabel}>
                            Completados
                        </ThemedText>
                    </View>
                </View>
            </View>

            {/* ── MENU OPTIONS ─────────────────────────────────── */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScroll} contentContainerStyle={[styles.menuContent, { paddingBottom: tabOverflow }]}>
                {loadingProfile ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={Colors.light.secondary} />
                    </View>
                ) : (
                    <>
                        <Link href="/(tabs)/profile/edit-profile" asChild>
                            <Pressable className='flex-row items-center py-4'>
                                <View className="w-12 h-12 justify-center items-center mr-5 rounded-xl" style={{ backgroundColor: "rgba(37,99,235,0.12)" }}>
                                    <Ionicons name="person-outline" size={20} color={Colors.light.secondary} />
                                </View>
                                <View className="flex-1">
                                    <ThemedText lightColor={Colors.light.text} darkColor={Colors.light.text} style={styles.menuTitle}>Editar perfil</ThemedText>
                                    <ThemedText lightColor={Colors.light.textSecondary} darkColor={Colors.light.textSecondary} style={styles.menuSubtitle}>Nombre, foto y datos personales</ThemedText>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
                            </Pressable>
                        </Link>

                        {showEditDriver && (
                            <Link href="/(tabs)/profile/become-driver" asChild>
                                <Pressable className='flex-row items-center py-4'>
                                    <View className="w-12 h-12 justify-center items-center mr-5 rounded-xl" style={{ backgroundColor: "rgba(16,185,129,0.12)" }}>
                                        <Ionicons name="car-outline" size={20} color="#10B981" />
                                    </View>
                                    <View className="flex-1">
                                        <ThemedText lightColor={Colors.light.text} darkColor={Colors.light.text} style={styles.menuTitle}>Datos de conductor</ThemedText>
                                        <ThemedText lightColor={Colors.light.textSecondary} darkColor={Colors.light.textSecondary} style={styles.menuSubtitle}>Licencia y vehículo</ThemedText>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
                                </Pressable>
                            </Link>
                        )}

                        <Link href="/(tabs)/profile/activity" asChild>
                            <Pressable className='flex-row items-center py-4'>
                                <View className="w-12 h-12 justify-center items-center mr-5 rounded-xl" style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>
                                    <Ionicons name="time-outline" size={20} color="#F59E0B" />
                                </View>
                                <View className="flex-1">
                                    <ThemedText lightColor={Colors.light.text} darkColor={Colors.light.text} style={styles.menuTitle}>Mi actividad</ThemedText>
                                    <ThemedText lightColor={Colors.light.textSecondary} darkColor={Colors.light.textSecondary} style={styles.menuSubtitle}>Historial de viajes</ThemedText>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
                            </Pressable>
                        </Link>

                        {showBecomeDriver && (
                            <Link href="/(tabs)/profile/become-driver" asChild>
                                <Pressable className='flex-row items-center py-4'>
                                    <View className="w-12 h-12 justify-center items-center mr-5 rounded-xl" style={{ backgroundColor: "rgba(37,99,235,0.12)" }}>
                                        <Ionicons name="shield-checkmark-outline" size={20} color={Colors.light.secondary} />
                                    </View>
                                    <View className="flex-1">
                                        <ThemedText lightColor={Colors.light.text} darkColor={Colors.light.text} style={styles.menuTitle}>Convertirme en conductor</ThemedText>
                                        <ThemedText lightColor={Colors.light.textSecondary} darkColor={Colors.light.textSecondary} style={styles.menuSubtitle}>Registra tu licencia y vehículo</ThemedText>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={Colors.light.textSecondary} />
                                </Pressable>
                            </Link>
                        )}

                        <Pressable
                            onPress={() => { logout(); }}
                            style={({ pressed }) => [styles.menuItem, styles.logoutItem, pressed && styles.logoutItemPressed]}
                        >
                            <View className="w-12 h-12 justify-center items-center mr-5 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
                                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                            </View>
                            <View className="flex-1">
                                <ThemedText style={[styles.menuTitle, { color: "#EF4444" }]}>Cerrar sesión</ThemedText>
                            </View>
                        </Pressable>

                        <Pressable
                            onPress={() => setDeleteModalVisible(true)}
                            style={({ pressed }) => [styles.menuItem, styles.deleteItem, pressed && styles.deleteItemPressed]}
                        >
                            <View className="w-12 h-12 justify-center items-center mr-5 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.18)" }}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </View>
                            <View className="flex-1">
                                <ThemedText style={[styles.menuTitle, { color: "#EF4444" }]}>Eliminar cuenta</ThemedText>
                            </View>
                        </Pressable>
                    </>
                )}
            </ScrollView>

            <ConfirmActionModal
                visible={deleteModalVisible}
                title="¿Eliminar cuenta?"
                description="Tu perfil y datos personales serán eliminados de la plataforma de forma permanente. Esta acción no se puede deshacer."
                confirmText="Sí, eliminar cuenta"
                cancelText="Cancelar"
                confirmType="danger"
                iconName="trash-outline"
                loading={deletingAccount}
                onConfirm={handleDeleteAccountConfirm}
                onCancel={() => setDeleteModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        paddingBottom: 24,
        paddingHorizontal: 20,
        backgroundColor: Colors.light.glass,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    avatarSection: {
        alignItems: "center",
        marginBottom: 20,
    },
    avatarContainer: {
        position: "relative",
        width: 110,
        height: 110,
        marginBottom: 14,
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 3,
        borderColor: "rgba(226,235,240,0.18)",
    },
    avatarPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.light.glassSoft,
    },
    verifiedBadge: {
        position: "absolute",
        bottom: 2,
        right: 2,
        backgroundColor: Colors.light.background,
        borderRadius: 15,
        padding: 2,
    },
    userName: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 6,
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    roleText: {
        fontSize: 13,
        fontWeight: "600",
    },
    metricsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.light.border,
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    metricItem: {
        flex: 1,
        alignItems: "center",
    },
    metricIconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: "700",
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: "500",
    },
    metricDivider: {
        width: 1,
        height: 34,
        backgroundColor: Colors.light.border,
        marginHorizontal: 16,
    },
    menuScroll: {
        flex: 1,
        paddingHorizontal: 16,
    },
    menuContent: {
        paddingTop: 20,
        paddingBottom: 20,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: "center",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: Colors.light.glassSoft,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    menuItemPressed: {
        backgroundColor: Colors.light.surface,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: "600",
    },
    menuSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    logoutItem: {
        marginTop: 8,
        backgroundColor: "rgba(239,68,68,0.06)",
        borderColor: "rgba(239,68,68,0.18)",
    },
    logoutItemPressed: {
        backgroundColor: "rgba(239,68,68,0.14)",
    },
    deleteItem: {
        marginTop: 4,
        backgroundColor: "rgba(239,68,68,0.06)",
        borderColor: "rgba(239,68,68,0.22)",
    },
    deleteItemPressed: {
        backgroundColor: "rgba(239,68,68,0.16)",
    },
});