import RouteCard from "@/components/history-route-card";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, Switch, View } from "react-native";

export default function HomeScreen() {
    const [isEnabled, setIsEnabled] = useState(false);
    const toggleSwitch = () => setIsEnabled(previousState => !previousState);

    const slideStudent = useRef(new Animated.Value(0)).current; // 0 visible, 300 fuera
    const opacityAnimStudent = useRef(new Animated.Value(0)).current;
    const slideCar = useRef(new Animated.Value(300)).current; // 300 fuera, 0 visible
    const opacityAnimCar = useRef(new Animated.Value(0)).current;

    const slideAnim = useRef(new Animated.Value(300)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (isEnabled) {
            // Student se mueve a la derecha y Car entra desde la izquierda
            Animated.timing(slideStudent, {
            toValue: 300, // fuera
            duration: 500,
            useNativeDriver: true,
            }).start();

            Animated.timing(slideCar, {
            toValue: 0, // visible
            duration: 500,
            useNativeDriver: true,
            }).start();
        } else {
            // Student entra y Car sale
            Animated.timing(slideStudent, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            }).start();

            Animated.timing(slideCar, {
            toValue: 300,
            duration: 500,
            useNativeDriver: true,
            }).start();
        }
    }, [isEnabled]);
    
    useEffect(() => {
        Animated.timing(opacityAnimStudent, {
            toValue: isEnabled ? 0 : 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [isEnabled]);

    useEffect(() => {
        Animated.timing(opacityAnimCar, {
            toValue: isEnabled ? 1 : 0,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [isEnabled]);

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
                    <View className="flex-col gap-4 mt-4">
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
                    <View className="relative">
                        <View className="w-full h-[270px]"/>
                        <Animated.Image
                            source={require('@/assets/images/studentWalk.png')}
                            resizeMode="contain"
                            className="h-64 absolute right-1"
                            style={{ transform : [{ translateX: slideStudent }], opacity: opacityAnimStudent, }}/>
                        <Animated.Image
                            source={require('@/assets/images/CarHome.png')}
                            resizeMode="contain"
                            className="mt-32 absolute -right-14"
                            style={{ transform : [{ translateX: slideCar }], opacity: opacityAnimCar, }}/>
                    </View>
                </View>
            </ThemedView>
            
            <View className="flex-col gap-4 m-4">
                <RouteCard title="Sur - Norte" isActive={true} routeScreen="/(tabs)/home/route-detail"/>
                <RouteCard title="Sur - Norte" isActive={false} routeScreen="/(tabs)/home/route-detail"/>
            </View>
        </ScrollView>
    );
}