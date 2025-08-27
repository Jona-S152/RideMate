import RouteCard from "@/components/history-route-card";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useState } from "react";
import { Image, ScrollView, Switch, View } from "react-native";

export default function HomeScreen() {
    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => setIsEnabled(previousState => !previousState);
    return (
            <ScrollView>
                <ThemedView lightColor={Colors.light.primary} className="w-full rounded-bl-[40px]">
                    <View className="flex-row justify-between px-8 pt-16">
                        <View>
                            <ThemedText
                                lightColor={Colors.light.text}
                                className="font-semibold text-4xl">
                                    Hola, Usuario
                            </ThemedText>
                            <ThemedText
                                lightColor={Colors.light.text}
                                className="font-light text-sm">
                                    ¿Que ruta quieres tomar?
                            </ThemedText>
                        </View>
                        <Switch
                            trackColor={{ false: Colors.light.tird, true: Colors.light.tird }}
                            thumbColor={isEnabled ? Colors.light.secondary : Colors.light.primary}
                            ios_backgroundColor={Colors.light.text}
                            value={isEnabled}
                            onValueChange={toggleSwitch}>

                        </Switch>
                    </View>
                    <View className="flex-row justify-between mx-8">
                        <View className="flex-col gap-4  my-14">
                            <ThemedText
                                lightColor={Colors.light.text}
                                className="font-light text-base">
                                    Te has unido a 10 rutas
                            </ThemedText>
                            <ThemedText
                                lightColor={Colors.light.text}
                                className="font-light text-base">
                                    Has ahorrado $20
                            </ThemedText>
                            <ThemedText
                                lightColor={Colors.light.text}
                                className="font-light text-base">
                                    Conociste +1 estudiante
                            </ThemedText>
                        </View>
                        <View className="">
                            <Image
                                source={require('@/assets/images/studentWalk.png')}
                                resizeMode="contain"
                                className="h-64"/>
                        </View>
                    </View>
                </ThemedView>
                
                <View className="flex-col gap-4 m-4">
                    <RouteCard title="Sur - Norte" isActive={true}/>
                    <RouteCard title="Sur - Norte" isActive={false}/>
                </View>
            </ScrollView>
    );
}