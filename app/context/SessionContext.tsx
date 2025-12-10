import { createContext, useContext, useState } from "react";

type SessionContextType = {
  sessionChanged: boolean;
  setSessionChanged: (v: boolean) => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionChanged, setSessionChanged] = useState(false);

  return (
    <SessionContext.Provider value={{ sessionChanged, setSessionChanged }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
