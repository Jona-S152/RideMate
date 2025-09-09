import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({children}: { children: React.ReactNode}) {
    const [ token, setToken ] = useState<string | null>(null);

    useEffect(() => {
        const loadToken = async () => {
            const savedToken = await AsyncStorage.getItem('userToken');
            if (savedToken) setToken(savedToken);
        }

        loadToken();
    }, []);

    const login = async (token: string) => {
        await AsyncStorage.setItem("userToken", token);
        setToken(token);
        console.log('Iniciando sesion', token);
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('userToken'); // Elimina el token
            setToken(null)
            console.log("Sesión cerrada");
        } catch (e) {
            console.error("Error cerrando sesión:", e);
        }
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
        {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}