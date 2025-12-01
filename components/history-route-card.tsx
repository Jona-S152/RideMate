import { Colors } from "@/constants/Colors";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Href, Link } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface HistoryRouteProps{
    title: string;
    startLocation: string; // Nueva prop para el punto de partida
    endLocation: string;   // Nueva prop para el punto final
    passengerCount: number; // Nueva prop para el número de círculos
    isActive?: boolean;
    routeScreen: Href;
}

export default function RouteCard({ 
    title, 
    isActive, 
    routeScreen, 
    startLocation, 
    endLocation, 
    passengerCount = 0 
}: HistoryRouteProps) {
    
    // Limitamos el número máximo de círculos visibles
    const maxCircles = 3;
    const circlesToRender = Math.min(passengerCount, maxCircles);

    return (
        <Link href={routeScreen} asChild>
            <Pressable>
                <ThemedView
                    lightColor={isActive ? Colors.light.historyCard.activeBackground : Colors.light.historyCard.background}
                    darkColor={Colors.light.historyCard.activeBackground}
                    className=" rounded-[28px] my-1 p-5 overflow-hidden">
                        {isActive && (
                            <View
                            className="
                                absolute -top-12 -left-12 
                                w-[150%] h-40 
                                bg-[#FFD369]/40 
                                -rotate-[70deg]
                            "
                            />
                        )}
                        <View className="">
                            <ThemedText
                                lightColor={DefaultTheme.colors.text} 
                                darkColor={DarkTheme.colors.text}
                                className="text-sm font-bold text-center">
                                    {title}
                            </ThemedText>
                        </View>
                        <View className="flex-row justify-between">
                            <View>
                                
                                <ThemedText
                                    lightColor={DefaultTheme.colors.text} 
                                    darkColor={DarkTheme.colors.text}
                                    className="text-base font-normal mb-[-8px]">
                                        Punto de partida
                                </ThemedText>
                                <ThemedText
                                    lightColor={DefaultTheme.colors.text} 
                                    darkColor={DarkTheme.colors.text}
                                    className="text-sm font-extralight">
                                        {startLocation} {/* 👈 Dinámico */}
                                </ThemedText>
                                        
                                <ThemedText
                                    lightColor={DefaultTheme.colors.text} 
                                    darkColor={DarkTheme.colors.text}
                                    className="text-base font-normal mb-[-8px]">
                                        Punto final
                                </ThemedText>
                                <ThemedText
                                    lightColor={DefaultTheme.colors.text} 
                                    darkColor={DarkTheme.colors.text}
                                    className="text-sm font-extralight">
                                        {endLocation} {/* 👈 Dinámico */}
                                </ThemedText>
                                <View className="my-2">
                                    <View className="flex-row items-center">
                                        {/* 👈 Círculos Dinámicos */}
                                        {[...Array(circlesToRender)].map((_, i) => (
                                            <ThemedView
                                                key={i}
                                                lightColor={Colors.light.primary}
                                                // Usamos un estilo dinámico simple para el solapamiento y la opacidad
                                                style={{ 
                                                    width: 32, 
                                                    height: 32, 
                                                    borderRadius: 16, 
                                                    marginLeft: i === 0 ? 0 : -12, 
                                                    zIndex: 30 - i, // Para el orden de solapamiento
                                                    opacity: 1 - (i * 0.2), // Efecto de atenuación
                                                }}
                                                className="z-30" 
                                            />
                                        ))}
                                        {passengerCount > maxCircles && (
                                            <ThemedText className="ml-2 text-sm">
                                                +{passengerCount - maxCircles}
                                            </ThemedText>
                                        )}
                                    </View>
                                </View> 
                            </View>
                            <View className="justify-center">
                                <View className="w-44 h-28">
                                    <Image
                                        source={require('@/assets/images/mapExample.png')}
                                        resizeMode="cover"
                                        className="w-full h-full rounded-2xl"/>
                                </View>
                            </View>
                        </View>  
                </ThemedView>
            </Pressable>
        </Link>
    );
}