import BottomSheetRouteDetail from "@/components/BottomSheetRouteDetail";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RouteDetail() {
    return (
        <GestureHandlerRootView className="flex-1">
            <BottomSheetRouteDetail/>
        </GestureHandlerRootView>
        // <ImageBackground
        //     source={{ uri: "https://media.wired.com/photos/59269cd37034dc5f91bec0f1/master/pass/GoogleMapTA.jpg" }} // URL o require local
        //     resizeMode="cover"
        //     className="flex-1 justify-end items-center"
        //     >
        //         {/* <ThemedView
        //             lightColor={Colors.light.primary}
        //             className="rounded-t-full h-40 w-[500] shadow-xl">
        //         </ThemedView> */}
        // </ImageBackground>
    );
}