"use client";
// components/shared/theme-toggle.tsx
// Alterna entre tema claro y oscuro (next-themes). Oscuro es el modo por
// defecto (ver components/providers.tsx). Accesible y sin hydration mismatch.
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // El tema real solo se conoce en el cliente. Montamos tras el primer
  // render para no arriesgar un desajuste de hidratacion.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder del mismo tamano (size icon) para evitar salto de layout.
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-hidden="true"
        tabIndex={-1}
        disabled
      >
        <Sun />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const next = isDark ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={isDark ? "Activar tema claro" : "Activar tema oscuro"}
      title={isDark ? "Tema claro" : "Tema oscuro"}
    >
      {isDark ? <Sun /> : <Moon />}
      <span className="sr-only">
        {isDark ? "Activar tema claro" : "Activar tema oscuro"}
      </span>
    </Button>
  );
}

export default ThemeToggle;
