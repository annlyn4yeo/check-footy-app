"use client";

import type { ReactNode } from "react";
import { LiveEventToastProvider } from "@/app/components/ui/live-event-toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return <LiveEventToastProvider>{children}</LiveEventToastProvider>;
}
