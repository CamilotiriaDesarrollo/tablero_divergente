// components/shared/nav-icons.tsx
// Mapa explicito de iconos de navegacion (import nombrado = tree-shaking, no
// arrastra todo lucide-react al bundle del cliente).
import {
  Home,
  FolderKanban,
  ListChecks,
  Lightbulb,
  CalendarDays,
  Circle,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Home,
  FolderKanban,
  ListChecks,
  Lightbulb,
  CalendarDays,
};

export function navIcon(name: string): LucideIcon {
  return MAP[name] ?? Circle;
}
