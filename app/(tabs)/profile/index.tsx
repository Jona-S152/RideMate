import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Link } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

export default function ProfileScreen() {
    return (
            <ScrollView>
                <ThemedView lightColor={Colors.light.primary} className="w-full px-4 py-6 rounded-bl-[40px]">
                    <View className="items-center">
                        <ThemedText
                            lightColor={Colors.light.text}
                            darkColor={DarkTheme.colors.text}
                            className="text-3xl mt-6">
                                Jhon Doe
                        </ThemedText>
                        <View className="relative w-60 h-60 my-3">
                            <View className="bg-stone-300 rounded-full w-60 h-60 my-3"/>
                        </View>
                        <ThemedText
                            lightColor={Colors.light.text}
                            darkColor={DarkTheme.colors.text}
                            className="text-2xl mt-4">
                                4.8
                        </ThemedText>
                    </View> 
                </ThemedView>
                <View className="flex-1">
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
                        <Pressable className="active:bg-slate-300">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4">
                                    Mi actividad
                            </ThemedText>
                        </Pressable>
                        <Pressable className="active:bg-slate-300">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4">
                                    Stonks
                            </ThemedText>
                        </Pressable>
                        <Pressable className="active:bg-slate-300">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4">
                                    Convertirme en conductor
                            </ThemedText>
                        </Pressable>
                        <Pressable className="active:bg-slate-300">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4">
                                    Editar vehículo
                            </ThemedText>
                        </Pressable>
                        <Pressable className="active:bg-red-300">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4 text-red-600">
                                    Cerrar sesion
                            </ThemedText>
                        </Pressable>
                </View>
            </ScrollView>
    );
}