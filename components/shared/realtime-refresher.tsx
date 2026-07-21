"use client";
// components/shared/realtime-refresher.tsx
// Sincronizacion en vivo entre dispositivos (Supabase Realtime). Al detectar
// cambios en tasks o projects del usuario, refresca los Server Components.
// Silencioso: no muestra UI. Filtra por user_id para no reaccionar a ruido.
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { isEchoOfLocalMutation } from "@/lib/realtime/echo-guard";

export function RealtimeRefresher({ userId }: { userId: string }) {
  const router = useRouter();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;
    const supabase = createClient();

    // Debounce: varios cambios seguidos = un solo refresh.
    // Guard anti-eco: si el cambio lo origino este mismo cliente hace un instante,
    // la Server Action ya refresco la ruta; ignoramos el eco para no re-consultar.
    const scheduleRefresh = () => {
      if (isEchoOfLocalMutation()) return;
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => router.refresh(), 300);
    };

    const channel = supabase
      .channel("tablero-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timeout.current) clearTimeout(timeout.current);
      supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
