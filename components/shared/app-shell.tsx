"use client";
// components/shared/app-shell.tsx
// Cascaron autenticado: nav lateral, barra superior con Cmd/Ctrl+K y asistente,
// panel de chat, sincronizacion en vivo. Los Server Components entran por children.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Menu, Search, Sparkles } from "lucide-react";
import { navIcon } from "@/components/shared/nav-icons";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";
import { NAV_ITEMS } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { CommandPalette } from "@/components/shared/command-palette";
import { ChatPanel } from "@/components/assistant/chat-panel";
import { RealtimeRefresher } from "@/components/shared/realtime-refresher";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = navIcon(item.icon);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  userEmail,
  userId,
}: {
  children: React.ReactNode;
  userEmail: string;
  userId: string;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
            <Layers className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <NavLinks />
        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between px-2">
            <span className="truncate text-xs text-muted-foreground" title={userEmail}>
              {userEmail}
            </span>
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/80 px-3 py-2 backdrop-blur md:px-6">
          {/* Mobile nav trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir navegacion"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Sheet open={mobileNav} onOpenChange={setMobileNav}>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="mb-4 font-heading">{APP_NAME}</SheetTitle>
              <NavLinks onNavigate={() => setMobileNav(false)} />
              <div className="mt-6 space-y-2 border-t border-border pt-3">
                <ThemeToggle />
                <SignOutButton />
              </div>
            </SheetContent>
          </Sheet>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 md:max-w-xs"
          >
            <Search className="size-4" />
            <span className="flex-1">Buscar o navegar</span>
            <kbd className="hidden rounded border border-border px-1.5 font-mono text-[10px] sm:inline">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={() => setAssistantOpen(true)}
              className="gap-2"
            >
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">Asistente</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenAssistant={() => setAssistantOpen(true)}
      />
      <ChatPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
      <RealtimeRefresher userId={userId} />
    </div>
  );
}
