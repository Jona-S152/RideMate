import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

export type User = {
  id: string;
  email: string;
  is_driver: boolean;
  driver_mode: boolean;
  name: string;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>; 
};

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      const savedToken = await AsyncStorage.getItem("userToken");
      const savedUser = await AsyncStorage.getItem("userInfo");
      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
    };
    loadAuth();
  }, []);

  const login = async (token: string, user: User) => {
    await AsyncStorage.setItem("userToken", token);
    await AsyncStorage.setItem("userInfo", JSON.stringify(user));
    setToken(token);
    setUser(user);
    console.log("Iniciando sesión", token, user);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userInfo");
      setToken(null);
      setUser(null);
      console.log("Sesión cerrada");
    } catch (e) {
      console.error("Error cerrando sesión:", e);
    }
  };

    const updateUser = async (newData: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated: User = {
                id: newData.id ?? prev.id,
                email: newData.email ?? prev.email,
                is_driver: newData.is_driver ?? prev.is_driver,
                driver_mode: newData.driver_mode ?? prev.driver_mode,
                name: newData.name ?? prev.name
            };
            AsyncStorage.setItem("userInfo", JSON.stringify(updated));
            return updated;
        });
    };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
