import PassengerActionModal from "@/components/Modals/PassengerActionModal";
import RatingModal from "@/components/Modals/RatingModal";
import { Colors } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import { tripService } from "@/services/trip.service";
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

import { toastConfig } from "@/components/common/toast-config";
import { registerDeviceToken, setupNotificationChannel } from "@/services/notifications.service";
import { authService } from "@/services/auth.service";
import { legalService } from "@/services/legal.service";
import Toast from "react-native-toast-message";

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
  const { token, user, logout } = useAuth();
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingData, setRatingData] = useState<{
    trip_session_id: number;
    driver_id: string;
    driver_name: string;
    fare_amount?: number;
    payment_status?: string;
  } | null>(null);

  // Estados para el Modal Global de Acción de Pasajero
  const [passengerActionModalVisible, setPassengerActionModalVisible] = useState(false);
  const [passengerIdToProcess, setPassengerIdToProcess] = useState<string | null>(null);
  const [tripSessionIdToProcess, setTripSessionIdToProcess] = useState<number>(0);

  useEffect(() => {
    setupNotificationChannel();
    if (user?.id) {
      registerDeviceToken(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!token || !user?.id) return;

    let active = true;
    const validatePersistedSession = async () => {
      try {
        const status = await legalService.getStatus(user.id);
        if (active && !status.compliant) {
          await authService.signOut();
          await logout();
        }
      } catch (error) {
        console.error("[_layout] Error verificando aceptación legal:", error);
        if (active) {
          await authService.signOut();
          await logout();
        }
      }
    };

    validatePersistedSession();
    return () => {
      active = false;
    };
  }, [token, user?.id, logout]);

  // Realtime fallback: subscribe to passenger trip completion so the rating
  // modal fires immediately even if the push notification is delayed.
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = tripService.subscribeToPassengerTripCompleted(
      user.id,
      async (tripSessionId) => {
        try {
          // Avoid double-showing if push notification already triggered the modal
          if (ratingModalVisible) return;

          // Avoid showing if user already rated this session
          // const alreadyRated = await ratingsService.hasUserRatedTrip(tripSessionId, user.id);
          // if (alreadyRated) return;

          // Fetch the driver info & fare details from the trip session
          const { data: sessionData, error } = await supabase
            .from('passenger_trip_sessions')
            .select('trip_session_id, fare_amount, payment_status, trip_sessions(driver_id, driver_profiles(full_name))')
            .eq('trip_session_id', tripSessionId)
            .eq('passenger_id', user.id)
            .maybeSingle();

          if (error || !sessionData) {
            console.warn('[_layout] Could not fetch session for rating modal:', error);
            return;
          }

          const tripSession = (sessionData as any).trip_sessions;
          const driverId: string = tripSession?.driver_id || '';
          const driverName: string = tripSession?.driver_profiles?.full_name || 'tu conductor';
          const fareAmount: number = Number((sessionData as any).fare_amount) || 1.25;
          const paymentStatus: string = (sessionData as any).payment_status || 'pending';

          setRatingData({
            trip_session_id: tripSessionId,
            driver_id: driverId,
            driver_name: driverName,
            fare_amount: fareAmount,
            payment_status: paymentStatus,
          });
          setRatingModalVisible(true);
        } catch (e) {
          console.error('[_layout] Error in subscribeToPassengerTripCompleted handler:', e);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, ratingModalVisible]);

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
        <Stack.Screen name="legal-document" />
      </Stack>

      {/* Modal Global para calificar conductor y confirmar pago */}
      {ratingData && (
        <RatingModal
          visible={ratingModalVisible}
          onClose={() => setRatingModalVisible(false)}
          title="Califica a tu conductor"
          subtitle="¿Cómo fue tu experiencia en este viaje?"
          userName={ratingData.driver_name}
          fareAmount={ratingData.fare_amount}
          paymentStatus={ratingData.payment_status}
          onConfirmPayment={async () => {
            if (user?.id && ratingData) {
              await tripService.confirmPassengerPayment(ratingData.trip_session_id, user.id);
            }
          }}
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

      <Toast config={toastConfig} />
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
