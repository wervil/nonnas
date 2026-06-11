"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/features/new-explore/query-client";

export default function NewExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
