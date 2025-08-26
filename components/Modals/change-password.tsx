import { Colors } from "@/constants/Colors";
import { DefaultTheme } from "@react-navigation/native";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedTextInput } from "../ThemedTextInput";


interface ChangePasswordModalProps{
    animationType: "none" | "slide" | "fade" | undefined,
    transparent: boolean,
    visible: boolean,
    setVisible: (isVisible: boolean) => void
}

export default function ChangePasswordModal({ animationType, transparent, visible, setVisible }: ChangePasswordModalProps){
    const [ visibleVerificationCode, setVisibleVerificationCode ] = useState<boolean>(false)
    return (
        <View>
            <Modal
                animationType={animationType}
                transparent={transparent}
                visible={visible}
                onRequestClose={() => setVisible(false)}
                >
                    <Pressable 
                        className="flex-1 justify-center items-center bg-black/50"
                        onPress={() => setVisible(false)} // cerrar al tocar afuera
                        >
                        {/* TODO: Validar codigo de verificación */}
                        {/* <ThemedText 
                            lightColor={DefaultTheme.colors.text}
                            darkColor={DarkTheme.colors.text}
                            >
                                Codigo
                        </ThemedText>
                        <ThemedTextInput
                            lightColor={DefaultTheme.colors.background}
                            darkColor={DarkTheme.colors.background}
                            placeholder="...">

                        </ThemedTextInput> */}
                        <Pressable 
                                style={{ backgroundColor: DefaultTheme.colors.background }}
                                className="rounded-2xl w-80 overflow-hidden"
                                onPress={(e) => e.stopPropagation()} 
                                >
                            {visibleVerificationCode ? 
                            <View>
                                <View style={{ backgroundColor: Colors.light.tint }} className="p-4">
                                    <ThemedText
                                        lightColor={Colors.light.text}
                                        darkColor={Colors.dark.text}
                                        className="text-2xl">
                                            Codigo de verificación
                                    </ThemedText>
                                </View>
                                <View className="mt-2">
                                    <ThemedTextInput
                                        lightColor={Colors.light.background}
                                        placeholder=""
                                        className="text-xl mx-4 mb-2">

                                    </ThemedTextInput>
                                </View>
                                <View className="m-2">
                                    <Pressable 
                                        className={`rounded-2xl p-3 bg-[${Colors.light.tint}] active:bg-yellow-200 items-center`}
                                        onPress={() => {
                                            setVisibleVerificationCode(false)
                                            setVisible(false)
                                            }}>
                                        <ThemedText 
                                            lightColor={Colors.light.text}
                                            darkColor={Colors.dark.text}
                                            className="text-xl">
                                                Aceptar
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </View>
                            :
                            <View>
                                <View style={{ backgroundColor: Colors.light.primary }} className="p-4">
                                    <ThemedText
                                        lightColor={Colors.light.text}
                                        darkColor={Colors.dark.text}
                                        className="text-2xl">
                                            Cambiar contraseña
                                    </ThemedText>
                                </View>
                                <View className="mt-2">
                                    <ThemedTextInput
                                        lightColor={Colors.light.background}
                                        placeholder="Contraseña nueva"
                                        className="text-xl mx-4 mb-2">

                                    </ThemedTextInput>
                                    <ThemedTextInput
                                        lightColor={Colors.light.background}
                                        placeholder="Confirmar contraseña"
                                        className="text-xl mx-4">

                                    </ThemedTextInput>
                                </View>
                                <View className="m-2">
                                    <Pressable 
                                        className={`rounded-2xl p-3 bg-[${Colors.light.tint}] active:bg-yellow-200 items-center`}
                                        onPress={() => {setVisibleVerificationCode(true)}}>
                                        <ThemedText 
                                            lightColor={Colors.light.text}
                                            darkColor={Colors.dark.text}
                                            className="text-xl">
                                                Continuar
                                        </ThemedText>
                                    </Pressable>
                                </View>
                            </View>
                            }
                        </Pressable>
                    </Pressable>
            </Modal>
        </View>
    );
}