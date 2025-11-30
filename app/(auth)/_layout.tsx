import { Redirect, Slot } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function AuthLayout() {
  const { token } = useAuth();

  if (token === undefined) return null;

  if (token) return <Redirect href="/(tabs)/home" />;

  return <Slot initialRouteName="login" />;
}