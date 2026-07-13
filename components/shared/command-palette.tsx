"use client";
// components/shared/command-palette.tsx
// Barra de comando (Cmd/Ctrl+K): navegacion y accion de abrir el asistente.
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { navIcon } from "@/components/shared/nav-icons";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/lib/nav";

export function CommandPalette({
  open,
  onOpenChange,
  onOpenAssistant,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenAssistant: () => void;
}) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Barra de comando"
      description="Navega o abre el asistente"
    >
      <CommandInput placeholder="Buscar seccion o accion..." />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Asistente">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onOpenAssistant();
            }}
          >
            <Sparkles className="size-4" />
            <span>Abrir asistente</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Ir a">
          {NAV_ITEMS.map((item) => {
            const Icon = navIcon(item.icon);
            return (
              <CommandItem
                key={item.href}
                value={`${item.label} ${item.description}`}
                onSelect={() => go(item.href)}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
