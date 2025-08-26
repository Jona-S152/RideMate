import HistoryRouteCard from "@/components/history-route-card";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useState } from "react";
import { ScrollView, Switch, View } from "react-native";

export default function HomeScreen() {
    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => setIsEnabled(previousState => !previousState);
    return (
            <ScrollView >
                <View className={`bg-[${Colors.light.primary}] h-[393px] w-full rounded-bl-[40px]`}>
                    <View className="flex-row justify-between mx-8 my-16">
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
                        <View className="flex-col gap-4">
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
                    </View>
                </View>
                
                <View className="flex-1 mx-1 rounded-xl">
                        <HistoryRouteCard title="Ruta 1"/>
                        <HistoryRouteCard title="Ruta 2"/>
                        <HistoryRouteCard title="Ruta 2"/>
                </View>
            </ScrollView>
    );
}