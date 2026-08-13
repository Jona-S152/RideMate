import PassengerActionModal from "@/components/Modals/PassengerActionModal";
import RatingModal from "@/components/Modals/RatingModal";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
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

  // Estados para el Modal Global de Acción de Pasajero
  const [passengerActionModalVisible, setPassengerActionModalVisible] = useState(false);
  const [passengerIdToProcess, setPassengerIdToProcess] = useState<string | null>(null);
  const [tripSessionIdToProcess, setTripSessionIdToProcess] = useState<number>(0);

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
          // En lugar de redirigir, abrimos el modal globalmente
          setPassengerIdToProcess(data.passenger_id || null);
          setTripSessionIdToProcess(Number(data.trip_session_id));
          setPassengerActionModalVisible(true);
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
          // When the app is in foreground, the conductor can see the passenger
          // directly in the route-detail list. We do NOT open the modal here
          // to avoid having two modal instances simultaneously (which caused
          // duplicate records in trip_session_meeting_points).
          console.log("[_layout] NEW_PASSENGER notification received in foreground – handled via route-detail list.");
          return;
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

    // Escuchar Deep Links para callback de autenticación por correo
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;
      console.log("[_layout] Deep link recibido:", url);
      const decodedUrl = decodeURIComponent(url);
      console.log("[_layout] Decoded URL:", decodedUrl);

      const isAuthLink =
        decodedUrl.includes("email-confirmation") ||
        decodedUrl.includes("access_token") ||
        decodedUrl.includes("refresh_token") ||
        decodedUrl.includes("type=signup");

      const pendingReg = await AsyncStorage.getItem("pendingRegistration").catch(() => null);

      if (isAuthLink || (pendingReg && decodedUrl.includes("expo-development-client"))) {
        console.log("[_layout] Link de autenticación / registro pendiente detectado. Navegando a email-confirmation...");
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) console.error("[_layout] Error obteniendo sesión tras deep link:", error);
          else console.log("[_layout] Sesión tras deep link:", data.session?.user?.email);
        } catch (e) {
          console.error("[_layout] Error en deep link handler:", e);
        }

        // Navegar a la pantalla de confirmación de correo
        router.replace("/(auth)/email-confirmation");
      }
    };

    const linkSubscription = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
      linkSubscription.remove();
    };
  }, []);

  // Mientras carga el token desde AsyncStorage
  if (token === undefined) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>

      {/* Modal Global para calificar conductor */}
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

      {/* Modal Global para Aceptar/Rechazar Pasajero */}
      <PassengerActionModal
        visible={passengerActionModalVisible}
        passengerId={passengerIdToProcess}
        tripSessionId={tripSessionIdToProcess}
        onClose={() => setPassengerActionModalVisible(false)}
        onActionComplete={() => {
          // Aquí se podría disparar un evento global de refresco si fuera necesario
          console.log("Acción de pasajero completada globalmente");
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1" style={{ backgroundColor: Colors.dark.background }}>
      <AuthProvider>
        <SessionProvider>
          <MainApp />
        </SessionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
