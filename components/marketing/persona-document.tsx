"use client";
// components/marketing/persona-document.tsx
// Ficha completa de un avatar (buyer persona extenso, 6 a 10 secciones), en
// una columna angosta. Dos niveles: una fila resumen colapsada por defecto
// ("Ver ficha completa") y, al expandirla, un acordeon con una seccion por
// tema. Si el avatar no tiene ficha (persona_sections vacio), no renderiza nada.
import { useState } from "react";
import {
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PersonaBlockView } from "@/components/marketing/persona-blocks";
import { projectColorValue } from "@/components/proyectos/project-colors";
import type { MarketingAvatar } from "@/types/db";

export function PersonaDocument({ avatar }: { avatar: MarketingAvatar }) {
  const sections = avatar.persona_sections ?? [];
  const [open, setOpen] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>(sections.length ? ["0"] : []);
  const accent = projectColorValue(avatar.color);
  const allOpen = openIds.length === sections.length;

  if (!sections.length) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3.5 text-left transition-colors hover:border-foreground/20"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="font-heading text-sm font-medium">
              Ficha completa de {avatar.name}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              · {sections.length} secciones
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-input px-2.5 py-1 text-xs font-medium text-foreground">
          Ver ficha
          <ChevronDown className="size-3.5" />
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0">
            <span className="font-heading text-sm font-medium">
              Ficha completa de {avatar.name}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              · {sections.length} secciones
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={allOpen ? "Colapsar todo" : "Expandir todo"}
            onClick={() =>
              setOpenIds(allOpen ? [] : sections.map((_, i) => String(i)))
            }
          >
            {allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cerrar ficha completa"
            onClick={() => setOpen(false)}
          >
            <ChevronUp />
          </Button>
        </span>
      </div>

      <Accordion
        multiple
        value={openIds}
        onValueChange={(value) => setOpenIds(value as string[])}
        className="px-4"
      >
        {sections.map((section, index) => (
          <AccordionItem key={section.title} value={String(index)}>
            <AccordionTrigger>
              <span className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-semibold"
                  style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-heading text-sm font-semibold leading-snug">
                  {section.title}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pl-8">
                {section.blocks.map((block, blockIndex) => (
                  <PersonaBlockView key={blockIndex} block={block} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default PersonaDocument;
