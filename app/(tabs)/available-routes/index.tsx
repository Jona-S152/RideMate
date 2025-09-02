import FilterCard from "@/components/FilterCard";
import HistoryRouteCard from "@/components/history-route-card";
import { ThemedText } from "@/components/ThemedText";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, View } from "react-native";

export default function AvailableRoutesScreen() {
    const [ text, setText ] = useState<string>('');
    const [ visibleFilters, setVisibleFilters ] = useState<boolean>(false);
    const slideAnim = useRef(new Animated.Value(0)).current; 

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: visibleFilters ? 1 : 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [visibleFilters]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 0]
    })

    const opacity = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    })

    const switchVisibleFilters = () => setVisibleFilters(visiblePrev => !visiblePrev);
    return (
        <View>
            <ThemedView lightColor={Colors.light.primary} className="w-full px-4 py-6 rounded-bl-[40px]">
                <ThemedText
                    lightColor={Colors.light.text}
                    className="font-semibold text-4xl py-3">
                        Hola, Usuario
                </ThemedText>
                <View className="flex-row items-center mb-4">
                    <ThemedTextInput 
                        lightColor={Colors.light.background}
                        placeholder="Buscar..." 
                        onChangeText={setText} value={text} 
                        className="flex-1 mr-2"
                        />
                    
                    <Pressable 
                        onPress={switchVisibleFilters}
                        style={{ backgroundColor: Colors.light.secondary }} className="rounded-full justify-center items-center w-10 h-10">
                        <Ionicons name="filter" size={30} color="black" />
                    </Pressable>
                </View>
                {visibleFilters ?
                <Animated.View
                    style={{
                        transform: [{translateY}],
                        opacity,
                    }}>
                    <View className="flex-row items-center">
                        <FilterCard title="Punto de partida" value="puntoPartida" isSelected={true}/>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            >
                            <FilterCard title="Punto Final" value="puntoFinal" />
                            <FilterCard title="Ruta" value="nombreRuta"/>
                            <FilterCard title="Conductor" value="nombreRuta"/>
                            <FilterCard title="2 pasajeros" value="nombreRuta"/>
                        </ScrollView>
                    </View>
                </Animated.View>
                :
                <></>
                }
            </ThemedView>
            <View className="m-4">
                <ScrollView>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                    <HistoryRouteCard title="Sur - Norte" routeScreen="/(tabs)/available-routes/route-detail"/>
                </ScrollView>
            </View>
        </View>
    );
}