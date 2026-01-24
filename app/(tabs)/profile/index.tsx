import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { UserData } from "@/interfaces/available-routes";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
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

    return (
        <View className="flex-1">
            <ThemedView lightColor={Colors.light.primary} className="w-full px-4 py-6 rounded-bl-[40px]">
                <ThemedText
                    lightColor={Colors.light.text}
                    darkColor={DarkTheme.colors.text}
                    className="text-3xl mt-6">
                    Perfil
                </ThemedText>
                <View className="items-center">
                    <ThemedText
                        lightColor={Colors.light.text}
                        darkColor={DarkTheme.colors.text}
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
                        lightColor={Colors.light.text}
                        darkColor={DarkTheme.colors.text}
                        className="text-2xl mt-4">
                        {userData?.rating || '5.0'}
                    </ThemedText>
                </View>
            </ThemedView>
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <Link href="/(tabs)/profile/edit-profile" asChild>
                    <Pressable className="active:bg-slate-300 w-full">
                        <ThemedText
                            lightColor={DefaultTheme.colors.text}
                            darkColor={DarkTheme.colors.text}
                            className="py-6 px-4">
                            Editar perfil
                        </ThemedText>
                    </Pressable>
                </Link>
                <Link href="/(tabs)/profile/activity" asChild>
                    <Pressable className="active:bg-slate-300">
                        <ThemedText
                            lightColor={DefaultTheme.colors.text}
                            darkColor={DarkTheme.colors.text}
                            className="py-6 px-4">
                            Mi actividad
                        </ThemedText>
                    </Pressable>
                </Link>
                {!user?.is_driver &&
                    <Link href="/(tabs)/profile/become-driver" asChild>
                        <Pressable className="active:bg-slate-300">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4">
                                Convertirme en conductor
                            </ThemedText>
                        </Pressable>
                    </Link>
                }
                {/* <Pressable className="active:bg-slate-300">
                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        darkColor={DarkTheme.colors.text}
                        className="py-6 px-4">
                        Editar vehículo
                    </ThemedText>
                </Pressable> */}
                <Pressable className="active:bg-red-300" onPress={() => { logout() }}>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        darkColor={DarkTheme.colors.text}
                        className="py-6 px-4 text-red-600">
                        Cerrar sesion
                    </ThemedText>
                </Pressable>
            </ScrollView>
            <View className="h-28 w-full" />
        </View>
    );
}