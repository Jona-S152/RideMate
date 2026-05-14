import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    const [userData, setUserData] = useState<UserData | null>(null);

    const fetchUser = async () => {
        if (!user?.id) return;

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq('id', user.id)
            .maybeSingle();

        if (data) {
            const ratingInfo = await ratingsService.getUserRating(user.id);
            setUserData({
                ...(data as UserData),
                rating: ratingInfo.rating,
                rating_count: ratingInfo.count
            });
        }
    }

    useEffect(() => {
        fetchUser();
    }, []);

    const contentTextColor = Colors.dark.text;

    return (
        <ThemedView lightColor={Colors.dark.background} darkColor={Colors.dark.background} className="flex-1">
            <ThemedView lightColor={Colors.light.glass} darkColor={Colors.dark.glass} className="w-full px-4 py-6 rounded-bl-[40px]">
                <ThemedText
                    className="text-3xl mt-6">
                    Perfil
                </ThemedText>
                <View className="items-center">
                    <ThemedText
                        className="text-2xl mt-6">
                        {userData?.name}
                    </ThemedText>
                    <View className="relative w-60 h-60 my-3">
                        {userData?.avatar_profile ?
                            (
                                <Image
                                    className="rounded-full w-60 h-60 my-3"
                                    source={{ uri: userData?.avatar_profile }}
                                />
                            )
                            :
                            (
                                <View className="bg-stone-300 rounded-full w-60 h-60 my-3" />
                            )
                        }
                    </View>
                    <ThemedText
                        className="text-2xl mt-4">
                        {userData?.rating || '5.0'}
                    </ThemedText>
                </View>
            </ThemedView>
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-4">
                <Link href="/(tabs)/profile/edit-profile" asChild>
                    <Pressable
                        className="w-full rounded-2xl mb-3"
                        style={({ pressed }) => [{
                            backgroundColor: pressed ? "rgba(12,22,42,0.95)" : Colors.dark.glassSoft,
                            borderWidth: 1,
                            borderColor: Colors.dark.border,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.22,
                            shadowRadius: 14,
                            elevation: 6,
                        }]}
                    >
                        <ThemedText
                            style={{ color: contentTextColor }}
                            className="py-6 px-4">
                            Editar perfil
                        </ThemedText>
                    </Pressable>
                </Link>
                <Link href="/(tabs)/profile/activity" asChild>
                    <Pressable
                        className="rounded-2xl mb-3"
                        style={({ pressed }) => [{
                            backgroundColor: pressed ? "rgba(12,22,42,0.95)" : Colors.dark.glassSoft,
                            borderWidth: 1,
                            borderColor: Colors.dark.border,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.22,
                            shadowRadius: 14,
                            elevation: 6,
                        }]}
                    >
                        <ThemedText
                            style={{ color: contentTextColor }}
                            className="py-6 px-4">
                            Mi actividad
                        </ThemedText>
                    </Pressable>
                </Link>
                {!user?.is_driver &&
                    <Link href="/(tabs)/profile/become-driver" asChild>
                        <Pressable
                            className="rounded-2xl mb-3"
                            style={({ pressed }) => [{
                                backgroundColor: pressed ? "rgba(12,22,42,0.95)" : Colors.dark.glassSoft,
                                borderWidth: 1,
                                borderColor: Colors.dark.border,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.22,
                                shadowRadius: 14,
                                elevation: 6,
                            }]}
                        >
                            <ThemedText
                                style={{ color: contentTextColor }}
                                className="py-6 px-4">
                                Convertirme en conductor
                            </ThemedText>
                        </Pressable>
                    </Link>
                }
                {/* <Pressable className="active:bg-slate-300">
                    <ThemedText
                        style={{ color: contentTextColor }}
                        className="py-6 px-4">
                        Editar vehículo
                    </ThemedText>
                </Pressable> */}
                <Pressable
                    onPress={() => { logout() }}
                    className="rounded-2xl mt-2"
                    style={({ pressed }) => [{
                        backgroundColor: pressed ? "rgba(245,158,11,0.22)" : "rgba(245,158,11,0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(245,158,11,0.38)",
                    }]}
                >
                    <ThemedText
                        lightColor={Colors.dark.secondary}
                        darkColor={Colors.dark.secondary}
                        className="py-6 px-4">
                        Cerrar sesion
                    </ThemedText>
                </Pressable>
            </ScrollView>
            <View className="h-28 w-full" />
        </ThemedView>
    );
}