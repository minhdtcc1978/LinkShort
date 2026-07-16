"use client";

import type { ReactNode } from "react";
import { PiAuthProvider } from "@/contexts/pi-auth-context";

// Provides Pi Network auth state to the app. Deliberately does NOT block
// rendering while auth is checked/loading — that was the cause of the
// black-screen bug in earlier versions. The UI always renders immediately;
// components can read `usePiAuth()` and show a sign-in prompt when needed.
export function AppWrapper({ children }: { children: ReactNode }) {
  return <PiAuthProvider>{children}</PiAuthProvider>;
}
