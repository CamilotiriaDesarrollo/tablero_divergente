// lib/nav.ts
// Rutas y etiquetas de navegacion. Una sola fuente para el nav lateral y la
// barra de comando. Nombres en espanol (CLAUDE.md).
import { MARKETING_ENABLED } from "@/lib/config";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // nombre de icono lucide-react
  description: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: "Home",
    description: "Vencido, hoy y proximo, con captura rapida",
  },
  {
    href: "/proyectos",
    label: "Proyectos",
    icon: "FolderKanban",
    description: "Galeria y tablero de proyectos",
  },
  {
    href: "/tareas",
    label: "Tareas",
    icon: "ListChecks",
    description: "Tabla, Kanban, buckets de tiempo y diarias",
  },
  {
    href: "/ideas",
    label: "Ideas",
    icon: "Lightbulb",
    description: "Banco de ideas para promover a proyecto",
  },
  {
    href: "/marketing",
    label: "Marketing",
    icon: "Megaphone",
    description: "Avatares e ideas de contenido",
  },
  {
    href: "/calendario",
    label: "Calendario",
    icon: "CalendarDays",
    description: "Vista de mes por fecha de entrega",
  },
];

export const NAV_ITEMS: NavItem[] = MARKETING_ENABLED
  ? ALL_NAV_ITEMS
  : ALL_NAV_ITEMS.filter((item) => item.href !== "/marketing");
