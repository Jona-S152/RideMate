import { useAuth } from "@/app/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

export default function BecomeDriverScreen() {
    const { user, updateUser } = useAuth();
    const [ loading, setLoading ] = useState(false);

    const HandleApply = async () => {
        try {
            if (!user?.id) {
                Alert.alert("Error", "Parece que no te encuentras autenticado, por favor intenta iniciar sesion primero.");
                return;
            }

            setLoading(true);

            const { error } = await supabase
                .from("users")
                .update({ is_driver: true })
                .eq("id", user.id);

            if (error) {
                Alert.alert("Error al actualizar", error.message);
                return;
            }

             // ACTUALIZAR EL CONTEXT DESPUÉS DEL UPDATE
            const updatedUser = {
            ...user,
            is_driver: true, // <-- cambio
            };

            await updateUser(updatedUser);
            
        } catch (error: any) {
            Alert.alert("Error inesperado", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
            <View>
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
                <View className="mx-4">
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
                            className="active:bg-slate-300" 
                            onPress={HandleApply}
                            disabled={loading}>
                            <ThemedText
                                lightColor={DefaultTheme.colors.text}
                                darkColor={DarkTheme.colors.text}
                                className="py-6 px-4 mb-2">
                                    { loading ? "Actualizando..." : "Aplicar" }
                            </ThemedText>
                        </Pressable>
                </View>
            </View>
    );
}