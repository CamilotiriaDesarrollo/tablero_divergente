// lib/nav.ts
// Rutas y etiquetas de navegacion. Una sola fuente para el nav lateral y la
// barra de comando. Nombres en espanol (CLAUDE.md).
export interface NavItem {
  href: string;
  label: string;
  icon: string; // nombre de icono lucide-react
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
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
    href: "/calendario",
    label: "Calendario",
    icon: "CalendarDays",
    description: "Vista de mes por fecha de entrega",
  },
];
