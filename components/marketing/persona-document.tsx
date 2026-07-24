"use client";
// components/marketing/persona-document.tsx
// La ficha completa mantiene sus titulos siempre visibles; cada detalle se
// abre desde su propio acordeon para consultar solo lo necesario.
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PersonaBlockView } from "@/components/marketing/persona-blocks";
import { projectColorValue } from "@/components/proyectos/project-colors";
import type { MarketingAvatar, PersonaBlock, PersonaSection } from "@/types/db";

const PERSONA_NAMES: Record<string, { selected: string; alternate: string }> = {
  mateo: { selected: "Mateo", alternate: "Mariana" },
  diana: { selected: "Diana", alternate: "Jaime" },
  juan: { selected: "Juan", alternate: "Valentina" },
  laura: { selected: "Laura", alternate: "Andr\\u00e9s" },
};

function personalizeText(text: string, avatar: MarketingAvatar) {
  const names = PERSONA_NAMES[avatar.slug];
  if (!names) return text;
  const selected = names.selected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alternate = names.alternate;
  const pair = new RegExp(
    `\\b(?:${selected}|${alternate})\\s*(?:o|y|/)\\s*(?:${selected}|${alternate})\\b`,
    "gi",
  );
  const alternateOnly = new RegExp(`\\b${alternate}\\b`, "gi");
  return text.replace(pair, names.selected).replace(alternateOnly, names.selected);
}

function personalizeBlock(block: PersonaBlock, avatar: MarketingAvatar): PersonaBlock {
  const label = block.label ? personalizeText(block.label, avatar) : undefined;
  switch (block.type) {
    case "text":
    case "quote":
      return { ...block, label, body: personalizeText(block.body, avatar) };
    case "list":
      return {
        ...block,
        label,
        body: block.body ? personalizeText(block.body, avatar) : undefined,
        items: block.items.map((item) => personalizeText(item, avatar)),
      };
    case "table":
      return {
        ...block,
        label,
        headers: block.headers.map((header) => personalizeText(header, avatar)),
        rows: block.rows.map((row) => row.map((cell) => personalizeText(cell, avatar))),
      };
    case "grid":
      return {
        ...block,
        label,
        columns: block.columns.map((column) => ({
          ...column,
          label: personalizeText(column.label, avatar),
          body: column.body ? personalizeText(column.body, avatar) : undefined,
          items: column.items?.map((item) => personalizeText(item, avatar)),
        })),
      };
  }
}

function personalizeSections(
  sections: PersonaSection[],
  avatar: MarketingAvatar,
): PersonaSection[] {
  return sections.map((section) => ({
    title: personalizeText(section.title, avatar),
    blocks: section.blocks.map((block) => personalizeBlock(block, avatar)),
  }));
}

export function PersonaDocument({ avatar }: { avatar: MarketingAvatar }) {
  const sections = personalizeSections(avatar.persona_sections ?? [], avatar);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const accent = projectColorValue(avatar.color);

  if (!sections.length) return null;

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <Accordion
        multiple
        value={openIds}
        onValueChange={(value) => setOpenIds(value as string[])}
        className="px-4"
      >
        {sections.map((section, index) => (
          <AccordionItem key={section.title} value={String(index)}>
            <AccordionTrigger>
              <span className="flex items-start gap-2.5 text-left">
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
