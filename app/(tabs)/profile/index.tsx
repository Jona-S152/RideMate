import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/ThemedText";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Pressable, ScrollView, View } from "react-native";

export default function ProfileScreen() {
    return (
        <Screen>
            <ScrollView>
                <View className="flex-1 items-center">
                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        darkColor={DarkTheme.colors.text}
                        className="text-3xl">
                            Jhon Doe
                    </ThemedText>
                    <View className="bg-stone-500 rounded-full w-60 h-60 my-3"/>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text}
                        darkColor={DarkTheme.colors.text}
                        className="text-2xl">
                            4.8
                    </ThemedText>
                </View> 
                {/* Divider */}
                <View className="my-2 h-px bg-gray-300" />
                <View className="flex-1">

                        <Pressable className="active:bg-slate-300">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4">
                                    Editar perfil
                            </ThemedText>
                        </Pressable>
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
        </Screen>
    );
}