"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on explore page
  if (pathname === "/explore") {
    return null;
  }
  
  return <Footer />;
}
