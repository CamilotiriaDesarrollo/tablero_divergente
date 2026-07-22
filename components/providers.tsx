"use client";
// components/providers.tsx
// Providers globales de cliente: TanStack Query (UI optimista), tema (next-themes)
// y tooltips. Se monta una sola vez en el layout raiz.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Agentation } from "agentation";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delay={200}>
          {children}
          {process.env.NODE_ENV === "development" ? <Agentation /> : null}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
