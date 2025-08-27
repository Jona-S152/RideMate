import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { ImageBackground } from "react-native";

export default function RouteDetail() {
    return (
        <ImageBackground
            source={{ uri: "https://media.wired.com/photos/59269cd37034dc5f91bec0f1/master/pass/GoogleMapTA.jpg" }} // URL o require local
            resizeMode="cover"
            className="flex-1 justify-end items-center"
            >
                <ThemedView
                    lightColor={Colors.light.primary}
                    className="rounded-t-full h-40 w-[500] shadow-xl">
                </ThemedView>
        </ImageBackground>
    );
}