"use client";

import { EarthNavigationProvider } from "@/contexts/EarthNavigationContext";
import type { ReactNode } from "react";

export default function NewExploreProviders({
  children,
}: {
  children: ReactNode;
}) {
  return <EarthNavigationProvider>{children}</EarthNavigationProvider>;
}
