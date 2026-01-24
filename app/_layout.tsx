import RatingModal from "@/components/RatingModal";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import * as Notifications from "expo-notifications";
import { router, Slot } from "expo-router";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../services/backgroundLocation.task";
import AuthProvider, { useAuth } from "./context/AuthContext";
import SessionProvider from "./context/SessionContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function MainApp() {
  const { token, user } = useAuth();
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingData, setRatingData] = useState<{
    trip_session_id: number;
    driver_id: string;
    driver_name: string;
  } | null>(null);

  useEffect(() => {
    // Definimos la estructura esperada de los datos de la notificación
    interface NotificationData {
      type?: string;
      trip_session_id?: string | number;
      passenger_id?: string;
      driver_id?: string;
      driver_name?: string;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationData;

        if (data.type === "NEW_PASSENGER") {
          setTimeout(() => {
            router.push({
              pathname: "/(tabs)/home/route-detail",
              params: {
                trip_session_id: String(data.trip_session_id),
                passenger_id: data.passenger_id,
                autoOpenModal: "true",
              },
            });
          }, 500);
        } else if (data.type === "RATE_DRIVER") {
          setRatingData({
            trip_session_id: Number(data.trip_session_id),
            driver_id: data.driver_id || "",
            driver_name: data.driver_name || "tu conductor",
          });
          setRatingModalVisible(true);
        }
      },
    );

    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data as NotificationData;

        if (data.type === "NEW_PASSENGER") {
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();

          if (currentUser?.id === data.passenger_id) {
            return;
          }

          router.push({
            pathname: "/(tabs)/home/route-detail",
            params: {
              trip_session_id: String(data.trip_session_id),
              passenger_id: data.passenger_id,
              autoOpenModal: "true",
            },
          });
        } else if (data.type === "RATE_DRIVER") {
          setRatingData({
            trip_session_id: Number(data.trip_session_id),
            driver_id: data.driver_id || "",
            driver_name: data.driver_name || "tu conductor",
          });
          setRatingModalVisible(true);
        }
      },
    );

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  // Mientras carga el token desde AsyncStorage
  if (token === undefined) return null;

  return (
    <>
      <Slot />
      {ratingData && (
        <RatingModal
          visible={ratingModalVisible}
          onClose={() => setRatingModalVisible(false)}
          title="Califica a tu conductor"
          subtitle="¿Cómo fue tu experiencia en este viaje?"
          userName={ratingData.driver_name}
          onSubmit={async (rating, comment) => {
            await ratingsService.saveRating({
              trip_session_id: ratingData.trip_session_id,
              rater_id: user?.id || "",
              ratee_id: ratingData.driver_id,
              rating,
              comment,
            });
          }}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <AuthProvider>
        <SessionProvider>
          <MainApp />
        </SessionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
