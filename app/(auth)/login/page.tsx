"use client";
// app/(auth)/login/page.tsx
// Autenticacion con Supabase (email + contrasena). Un solo dueno, sin registro
// abierto: el mismo formulario inicia sesion o crea la cuenta la primera vez.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  // App de un solo dueno: el registro esta cerrado por defecto. Actívalo solo
  // para crear tu cuenta (NEXT_PUBLIC_ALLOW_SIGNUP=true) y vuelve a cerrarlo.
  // Ademas, desactiva "Allow new users to sign up" en Supabase (ver DEPLOY.md).
  const allowSignup = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "true";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast.error("Falta configurar Supabase", {
        description: "Agrega tus llaves en .env.local para iniciar sesion.",
      });
      return;
    }
    if (mode === "signup" && !allowSignup) {
      toast.error("Registro cerrado", {
        description:
          "Esta app es de un solo dueno. El registro esta desactivado.",
      });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Cuenta creada", {
          description: "Revisa tu correo si la confirmacion esta activada.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo completar la accion.";
      toast.error("Algo fallo al entrar", { description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Entra para ver tu tablero."
              : "Crea tu cuenta de dueno."}
          </p>
        </div>

        {!configured && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Supabase todavia no esta configurado. Agrega{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> y
            la anon key en <code className="font-mono text-xs">.env.local</code>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Un momento..."
              : mode === "signin"
                ? "Entrar"
                : "Crear cuenta"}
          </Button>
        </form>

        {allowSignup && (
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {mode === "signin"
              ? "Primera vez? Crea tu cuenta"
              : "Ya tienes cuenta? Entra"}
          </button>
        )}
      </div>
    </main>
  );
}
