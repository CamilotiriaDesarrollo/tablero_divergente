"use client";
// components/shared/sign-out-button.tsx
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await createClient().auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("No se pudo cerrar sesion", {
        description: "Intenta de nuevo.",
      });
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={loading}
      className="w-full justify-start gap-2 text-muted-foreground"
    >
      <LogOut className="size-4" />
      Cerrar sesion
    </Button>
  );
}
