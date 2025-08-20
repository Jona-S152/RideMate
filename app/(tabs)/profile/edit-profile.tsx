import ChangePasswordModal from "@/components/Modals/change-password";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function EditProfileScreen() {
    const [ changePassVisibleModal, setChangePassVisibleModal ] = useState<boolean>(false);
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
                    <View className="relative w-60 h-60 my-3">
                        <View className="bg-stone-300 rounded-full w-60 h-60 my-3"/>
                        <ThemedText
                            lightColor={DefaultTheme.colors.text}
                            darkColor={DarkTheme.colors.text}
                            className="absolute top-1/3 left-1/2 -translate-x-1/3 -translate-y-1/2 text-xl">
                                Cambiar foto
                        </ThemedText>
                    </View>
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
                            <ThemedTextInput
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4 mb-2"
                                placeholder="Nombres">
                                    
                            </ThemedTextInput>
                        </Pressable>
                        <Pressable className="active:bg-slate-300">
                            <ThemedTextInput
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4 mb-2"
                                placeholder="Apellidos">
                                    
                            </ThemedTextInput>
                        </Pressable>
                        <Pressable className="active:bg-slate-300">
                            <ThemedTextInput
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4 mb-2"
                                placeholder="Correo electrónico">
                                    
                            </ThemedTextInput>
                        </Pressable>
                        <Pressable 
                            className="active:bg-slate-300 rounded-full" 
                            onPress={() => setChangePassVisibleModal(true)}>
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4 mb-2">
                                    Cambiar contraseña
                            </ThemedText>
                        </Pressable>
                        <View className="rounded-lg w-52 h-52 flex-1">
                            <ChangePasswordModal
                                animationType="fade"
                                transparent={true}
                                visible={changePassVisibleModal}
                                setVisible={setChangePassVisibleModal}>

                            </ChangePasswordModal>
                        </View>
                </View>
            </ScrollView>
        </Screen>
    );
}