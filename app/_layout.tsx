import { supabase } from "@/lib/supabase";
import * as Notifications from "expo-notifications";
import { Redirect, router, Slot } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../services/backgroundLocation.task";
import AuthProvider, { useAuth } from "./context/AuthContext";
import SessionProvider from "./context/SessionContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Deprecated, but some versions still use it. Kept for safety but rely on others.
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutNav() {
  const { token, user } = useAuth();

  // Mientras carga el token desde AsyncStorage
  if (token === undefined) return null; // o ActivityIndicator

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

export default function RootLayout() {
  useEffect(() => {
    // Definimos la estructura esperada de los datos de la notificación
    interface NotificationData {
      type?: string;
      trip_session_id?: string | number;
      passenger_id?: string;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content
          .data as NotificationData;

        if (data.type === "NEW_PASSENGER") {
          // Agregamos un pequeño retraso para que el Redirect de RootLayoutNav
          // termine primero y luego nosotros lo movamos a la pantalla final.
          setTimeout(() => {
            router.push({
              pathname: "/(tabs)/home/route-detail",
              params: {
                trip_session_id: String(data.trip_session_id),
                passenger_id: data.passenger_id,
                autoOpenModal: "true",
              },
            });
          }, 500); // 500ms es suficiente para que la app cargue el Home y luego salte
        }
      },
    );

    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log("🔔 Notificación recibida en primer plano:", notification);
        const data = notification.request.content.data as NotificationData;
        console.log("📦 Datos de la notificación:", data);

        if (data.type === "NEW_PASSENGER") {
          // Evitar que se abra el modal si yo mismo soy el pasajero (Pruebas en un solo dispositivo)
          const { data: { user } } = await supabase.auth.getUser();

          if (user?.id === data.passenger_id) {
            console.log("👤 Ignorando notificación propia (Self-Notification)");
            return;
          }

          console.log("🚀 Navegando a detalle de ruta...");
          // Si la app está abierta, navegamos directamente
          router.push({
            pathname: "/(tabs)/home/route-detail",
            params: {
              trip_session_id: String(data.trip_session_id),
              passenger_id: data.passenger_id,
              autoOpenModal: "true",
            },
          });
        }
      }
    );

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <AuthProvider>
        <SessionProvider>
          <Slot />
        </SessionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
