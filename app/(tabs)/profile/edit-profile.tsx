import ChangePasswordModal from "@/components/Modals/change-password";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function EditProfileScreen() {
    const [ changePassVisibleModal, setChangePassVisibleModal ] = useState<boolean>(false);
    return (
            <ScrollView>
                <ThemedView lightColor={Colors.light.primary} className="w-full px-4 py-6 rounded-bl-[40px]">
                    <View className="items-center">
                        <ThemedText
                            lightColor={Colors.light.text}
                            className="text-3xl mt-6">
                                Jhon Doe
                        </ThemedText>
                        <View className="w-60 h-60 my-3">
                            <View className="bg-stone-300 rounded-full w-60 h-60 my-3"/>
                        </View>
                        <ThemedText
                            lightColor={Colors.light.text}
                            className="text-2xl mt-4">
                                4.8
                        </ThemedText>
                    </View> 
                </ThemedView>
                {/* Divider */}
                <View className="my-2 h-px bg-gray-300" />
                <View className="flex-1">
                        <Pressable className="active:bg-slate-300">
                            <ThemedTextInput
                                lightColor={Colors.light.background}
                                className="py-6 px-4 mb-2"
                                placeholder="Nombres">
                                    
                            </ThemedTextInput>
                        </Pressable>
                        <Pressable className="active:bg-slate-300">
                            <ThemedTextInput
                                lightColor={Colors.light.background}
                                className="py-6 px-4 mb-2"
                                placeholder="Apellidos">
                                    
                            </ThemedTextInput>
                        </Pressable>
                        <Pressable className="active:bg-slate-300">
                            <ThemedTextInput
                                lightColor={Colors.light.background}
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
    );
}