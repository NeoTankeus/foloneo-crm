import { createContext, useContext } from "react";
import type { Commercial } from "@/types";

export interface AuthContextValue {
  currentCommercial: Commercial | null;
  email: string | null;
  signOut: () => Promise<void>;
  isDemoMode: boolean;
  reloadCommercial: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre appele a l'interieur d'un <AuthGate>");
  return ctx;
}
