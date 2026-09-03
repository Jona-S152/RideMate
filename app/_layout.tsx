import PassengerActionModal from "@/components/Modals/PassengerActionModal";
import RatingModal from "@/components/Modals/RatingModal";
import { Colors } from "@/constants/Colors";
import { useAppUpdates } from "@/hooks/useAppUpdates";
import { supabase } from "@/lib/supabase";
import { ratingsService } from "@/services/ratings.service";
import { tripService } from "@/services/trip.service";
import { useTripTrackingStore } from "@/store/tripTrackinStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../services/backgroundLocation.task";
import AuthProvider, { useAuth } from "./context/AuthContext";
import SessionProvider from "./context/SessionContext";

import { toastConfig } from "@/components/common/toast-config";
import ConfirmActionModal from "@/components/Modals/ConfirmActionModal";
import { authService } from "@/services/auth.service";
import { legalService } from "@/services/legal.service";
import { registerDeviceToken, setupNotificationChannel } from "@/services/notifications.service";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const passengerAlreadyPaid = (session: {
  passenger_paid_at?: string | null;
  payment_status?: string | null;
}) =>
  !!session.passenger_paid_at ||
  session.payment_status === "paid_by_passenger" ||
  session.payment_status === "confirmed" ||
  session.payment_status === "disputed";

function MainApp() {
  const { token, user, logout } = useAuth();
  const isTracking = useTripTrackingStore((state) => state.isTracking);
  const { isUpdateReady, dismissUpdate, applyUpdate } = useAppUpdates();
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingData, setRatingData] = useState<{
    trip_session_id: number;
    driver_id: string;
    driver_name: string;
    driver_rating?: number;
    fare_amount?: number;
    payment_status?: string;
  } | null>(null);

  // Estados para el Modal Global de Acción de Pasajero
  const [passengerActionModalVisible, setPassengerActionModalVisible] = useState(false);
  const [passengerIdToProcess, setPassengerIdToProcess] = useState<string | null>(null);
  const [tripSessionIdToProcess, setTripSessionIdToProcess] = useState<number>(0);
  const handledRatingTripsRef = useRef<Set<number>>(new Set());
  const pendingRatingTripsRef = useRef<Set<number>>(new Set());

  const openRatingForTrip = useCallback(async (
    tripSessionId: number,
    notificationData?: { driver_id?: string; driver_name?: string }
  ) => {
    if (!user?.id || !Number.isFinite(tripSessionId) || tripSessionId <= 0) return false;
    if (
      handledRatingTripsRef.current.has(tripSessionId) ||
      pendingRatingTripsRef.current.has(tripSessionId)
    ) return false;

    pendingRatingTripsRef.current.add(tripSessionId);
    try {
      if (await ratingsService.hasUserRatedTrip(tripSessionId, user.id)) {
        handledRatingTripsRef.current.add(tripSessionId);
        return false;
      }

      let sessionData: any = null;
      let sessionError: unknown = null;
      for (let attempt = 0; attempt < 3 && !sessionData; attempt += 1) {
        const result = await supabase
          .from("passenger_trip_sessions")
          .select("trip_session_id, fare_amount, payment_status, passenger_paid_at")
          .eq("trip_session_id", tripSessionId)
          .eq("passenger_id", user.id)
          .eq("status", "completed")
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        sessionData = result.data;
        sessionError = result.error;
        if (!sessionData && attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }

      if (sessionError || !sessionData) {
        console.warn('[_layout] Could not fetch session for rating modal:', sessionError);
        return false;
      }

      if (passengerAlreadyPaid(sessionData)) {
        handledRatingTripsRef.current.add(tripSessionId);
        return false;
      }

      const { data: tripSession } = await supabase
        .from("trip_sessions")
        .select("driver_id")
        .eq("id", tripSessionId)
        .maybeSingle();
      const driverId = tripSession?.driver_id || notificationData?.driver_id || '';
      let driverName = notificationData?.driver_name || 'tu conductor';
      let driverRating = 0;
      if (driverId) {
        const [{ data: driver }, ratingInfo] = await Promise.all([
          supabase
            .from("users")
            .select("name, last_name")
            .eq("id", driverId)
            .maybeSingle(),
          ratingsService.getUserRating(driverId),
        ]);
        if (driver) {
          driverName = `${driver.name || ''} ${driver.last_name || ''}`.trim() || driverName;
        }
        driverRating = ratingInfo.rating;
      }

      setRatingData({
        trip_session_id: tripSessionId,
        driver_id: driverId,
        driver_name: driverName,
        driver_rating: driverRating,
        fare_amount: Number(sessionData.fare_amount) || 1.25,
        payment_status: sessionData.payment_status || 'pending',
      });
      handledRatingTripsRef.current.add(tripSessionId);
      setRatingModalVisible(true);
      return true;
    } catch (error) {
      console.error('[_layout] Error opening rating modal:', error);
      return false;
    } finally {
      pendingRatingTripsRef.current.delete(tripSessionId);
    }
  }, [user?.id]);

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
      openRatingForTrip
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, openRatingForTrip]);

  useEffect(() => {
    if (!user?.id) return;

    const reconcileCompletedTrips = async () => {
      const { data, error } = await supabase
        .from("passenger_trip_sessions")
        .select("trip_session_id, payment_status, passenger_paid_at")
        .eq("passenger_id", user.id)
        .eq("status", "completed")
        .order("id", { ascending: false })
        .limit(10);

      if (error) {
        console.error("[_layout] Error reconciling completed passenger trips:", error);
        return;
      }

      const unpaidTrips = (data || []).filter((trip) => !passengerAlreadyPaid(trip));
      for (const trip of unpaidTrips) {
        const opened = await openRatingForTrip(Number(trip.trip_session_id));
        if (opened) break;
      }
    };

    reconcileCompletedTrips();
  }, [user?.id, openRatingForTrip]);

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
          openRatingForTrip(Number(data.trip_session_id), data);
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
          openRatingForTrip(Number(data.trip_session_id), data);
        }
      },
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification.request.content.data as NotificationData | undefined;
      if (data?.type === "RATE_DRIVER") {
        openRatingForTrip(Number(data.trip_session_id), data);
      }
    });

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
  }, [openRatingForTrip]);

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
          onClose={() => {
            setRatingModalVisible(false);
            setRatingData(null);
          }}
          title="Califica a tu conductor"
          subtitle="¿Cómo fue tu experiencia en este viaje?"
          userName={ratingData.driver_name}
          userRating={ratingData.driver_rating}
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
            setRatingModalVisible(false);
            setRatingData(null);
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

      <ConfirmActionModal
        visible={isUpdateReady && !!token && !isTracking}
        title="Actualización lista"
        description="Se descargó una nueva versión de RideMate. Reinicia la app para aplicarla."
        confirmText="Actualizar ahora"
        cancelText="Más tarde"
        confirmType="info"
        iconName="download-outline"
        onConfirm={() => void applyUpdate()}
        onCancel={dismissUpdate}
      />

      <Toast config={toastConfig} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView className="flex-1" style={{ backgroundColor: Colors.dark.background }}>
        <AuthProvider>
          <SessionProvider>
            <MainApp />
          </SessionProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
