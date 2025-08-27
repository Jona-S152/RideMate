import { Colors } from "@/constants/Colors";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { Link } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface HistoryRouteProps{
    title: string,
    isActive?: boolean,
}

export default function RouteCard({ title, isActive }: HistoryRouteProps) {
    return (
        <ThemedView
            lightColor={isActive ? Colors.light.historyCard.activeBackground : Colors.light.historyCard.background}
            darkColor={Colors.light.historyCard.activeBackground}
            className="flex-row justify-between rounded-[28px] my-1 p-5 overflow-hidden">
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
                <View>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text} 
                        darkColor={DarkTheme.colors.text}
                        className="text-3xl font-bold">
                            {title}
                    </ThemedText>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text} 
                        darkColor={DarkTheme.colors.text}
                        className="text-lg font-normal mb-[-8px]">
                            Punto de partida
                    </ThemedText>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text} 
                        darkColor={DarkTheme.colors.text}
                        className="text-base font-extralight">
                            Mall del sur
                    </ThemedText>
                        
                    <ThemedText
                        lightColor={DefaultTheme.colors.text} 
                        darkColor={DarkTheme.colors.text}
                        className="text-lg font-normal mb-[-8px]">
                            Punto final
                    </ThemedText>
                    <ThemedText
                        lightColor={DefaultTheme.colors.text} 
                        darkColor={DarkTheme.colors.text}
                        className="text-base font-extralight">
                            Riocentro norte
                    </ThemedText>
                    <View className="my-2">
                        {isActive ? 
                        <View className="flex-row items-center">
                            <ThemedView
                                lightColor={Colors.light.primary}
                                className="w-8 h-8 rounded-full z-30">
                                
                            </ThemedView>
                            <ThemedView
                                lightColor={Colors.light.primary}
                                className="w-8 h-8 rounded-full -ml-3 z-20 opacity-80">
                                
                            </ThemedView>
                            <ThemedView
                                lightColor={Colors.light.primary}
                                className="w-8 h-8 rounded-full -ml-3 z-10 opacity-60">
                                
                            </ThemedView>
                        </View>
                        : 
                        <Link href="/(tabs)/available-routes/route-detail" asChild>
                            <Pressable className="bg-[#FCA311] rounded-full p-1 items-center">
                                <ThemedText
                                    lightColor={DefaultTheme.colors.text} 
                                    darkColor={DarkTheme.colors.text}
                                    className="text-lg font-normal">
                                        Ver detalles
                                </ThemedText>
                            </Pressable>
                        </Link>
                        }
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
        </ThemedView>
    );
}