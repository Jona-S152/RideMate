import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
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

    const primaryColor = useThemeColor({}, 'primary');
    const textColor = useThemeColor({}, 'text');
    const textBlackColor = useThemeColor({}, 'textBlack');

    // We want "Dark Text" in Light Mode (on light bg) and "Light Text" in Dark Mode (on dark bg)
    // Colors.light.text is Light (for navy bg), Colors.light.textBlack is Black.
    // Colors.dark.text is Light.
    // So for content on "Background" (Light/Dark Page):
    // Light Mode: textBlack (#000)
    // Dark Mode: text (#ECEDEE)
    const contentTextColor = useThemeColor({ light: Colors.light.textBlack, dark: Colors.dark.text }, 'text');

    return (
        <ThemedView className="flex-1">
            <ThemedView lightColor={Colors.light.primary} darkColor={Colors.dark.primary} className="w-full px-4 py-6 rounded-bl-[40px]">
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
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <Link href="/(tabs)/profile/edit-profile" asChild>
                    <Pressable className="active:bg-slate-300 w-full">
                        <ThemedText
                            style={{ color: contentTextColor }}
                            className="py-6 px-4">
                            Editar perfil
                        </ThemedText>
                    </Pressable>
                </Link>
                <Link href="/(tabs)/profile/activity" asChild>
                    <Pressable className="active:bg-slate-300">
                        <ThemedText
                            style={{ color: contentTextColor }}
                            className="py-6 px-4">
                            Mi actividad
                        </ThemedText>
                    </Pressable>
                </Link>
                {!user?.is_driver &&
                    <Link href="/(tabs)/profile/become-driver" asChild>
                        <Pressable className="active:bg-slate-300">
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
                <Pressable className="active:bg-red-300" onPress={() => { logout() }}>
                    <ThemedText
                        lightColor="red"
                        darkColor="#ff6b6b"
                        className="py-6 px-4 text-red-600">
                        Cerrar sesion
                    </ThemedText>
                </Pressable>
            </ScrollView>
            <View className="h-28 w-full" />
        </ThemedView>
    );
}