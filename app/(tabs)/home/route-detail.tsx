import { ThemedView } from "@/components/ThemedView";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { ImageBackground } from "react-native";

export default function RouteDetail(){
    return (
        <ImageBackground
            source={{ uri: "https://media.wired.com/photos/59269cd37034dc5f91bec0f1/master/pass/GoogleMapTA.jpg" }} // URL o require local
            resizeMode="cover"
            className="flex-1 items-stretch justify-end"
            >
                <ThemedView
                    lightColor={DefaultTheme.colors.background}
                    darkColor={DarkTheme.colors.background}
                    className="m-5 rounded-3xl h-56 shadow-xl">
                </ThemedView>
        </ImageBackground>
    );
}