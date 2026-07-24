"use client";
// components/marketing/channels-view.tsx
// Pestana Canales: caracterizacion de redes sociales por avatar, transcrita del
// documento fuente (lib/marketing/channels-data.ts). Material de lectura, no
// editable. Panorama fijo arriba (principio de concentracion + matriz avatar/red
// + regla editorial); debajo, cada canal como seccion desplegable con su logo de
// marca como unico acento, y al final el sistema de produccion. Diseno calmo,
// casi monocromatico (CLAUDE.md): el color solo identifica la red.
import { useState } from "react";
import { ArrowRight, Check, Compass, Radio } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChannelMark } from "@/components/marketing/channel-mark";
import {
  CHANNELS,
  CHANNELS_OVERVIEW,
  PRODUCTION_SYSTEM,
  type Channel,
  type ChannelBlock,
} from "@/lib/marketing/channels-data";

function BlockLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h4>
  );
}

/** Envuelve una tabla ancha para que haga scroll horizontal sin empujar la pagina. */
function ScrollTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table className="text-sm">{children}</Table>
    </div>
  );
}

function ChannelBlockView({ block, accent }: { block: ChannelBlock; accent: string }) {
  switch (block.kind) {
    case "prose":
      return (
        <div className="space-y-1.5">
          <BlockLabel>{block.label}</BlockLabel>
          <p className="text-sm leading-relaxed text-foreground/80">{block.body}</p>
        </div>
      );

    case "priority":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <ul className="space-y-1.5">
            {block.items.map((item) => (
              <li key={item.avatar} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: `#${accent}1f`, color: `#${accent}` }}
                >
                  {item.level}
                </span>
                <span className="text-foreground/80">{item.avatar}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "bullets":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground/80 marker:text-muted-foreground/40">
            {block.items.map((item) => (
              <li key={item} className="leading-snug">
                {item}
              </li>
            ))}
          </ul>
        </div>
      );

    case "columns":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {block.columns.map((column, index) => (
              <div key={column.label ?? index} className="space-y-1.5">
                {column.label ? (
                  <p className="text-xs font-medium text-foreground">{column.label}</p>
                ) : null}
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground/80 marker:text-muted-foreground/40">
                  {column.items.map((item) => (
                    <li key={item} className="leading-snug">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );

    case "table":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <ScrollTable>
            <TableHeader>
              <TableRow>
                {block.headers.map((header) => (
                  <TableHead key={header} className="whitespace-nowrap text-foreground">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((row) => (
                <TableRow key={row[0]}>
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      className={
                        cellIndex === 0
                          ? "align-top font-medium text-foreground"
                          : "align-top text-foreground/80"
                      }
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </ScrollTable>
        </div>
      );

    case "definitions":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <dl className="divide-y divide-border rounded-lg border border-border">
            {block.items.map((item) => (
              <div key={item.term} className="grid gap-0.5 px-3 py-2.5 sm:grid-cols-[minmax(9rem,auto)_1fr] sm:gap-4">
                <dt className="text-sm font-medium text-foreground">{item.term}</dt>
                <dd className="text-sm leading-snug text-foreground/80">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      );

    case "lines":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {block.groups.map((group) => (
              <div key={group.avatar} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">{group.avatar}</p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-foreground/80 marker:text-muted-foreground/40">
                  {group.items.map((item) => (
                    <li key={item} className="leading-snug">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );

    case "steps":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <ol className="space-y-2">
            {block.items.map((item, index) => (
              <li key={item} className="flex gap-2.5 text-sm text-foreground/80">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "checklist":
      return (
        <div className="space-y-2">
          <BlockLabel>{block.label}</BlockLabel>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {block.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-foreground/80">
                <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

function ChannelSection({ channel }: { channel: Channel }) {
  return (
    <AccordionItem value={`ch-${channel.number}`} className="rounded-xl border border-border px-4 last:border-b">
      <AccordionTrigger className="py-3.5">
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `#${channel.color}14` }}
          >
            <ChannelMark name={channel.name} slug={channel.slug} color={channel.color} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{channel.number}</span>
              <span className="font-heading text-base font-semibold">{channel.name}</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {channel.tagline}
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div
          className="space-y-5 border-l-2 pl-4"
          style={{ borderColor: `#${channel.color}40` }}
        >
          {channel.blocks.map((block, index) => (
            <ChannelBlockView key={`${block.kind}-${index}`} block={block} accent={channel.color} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function OverviewSection() {
  const o = CHANNELS_OVERVIEW;
  return (
    <AccordionItem value="panorama" className="rounded-xl border border-border px-4 last:border-b">
      <AccordionTrigger className="py-3.5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Compass className="size-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="font-heading text-base font-semibold">{o.title}</span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {o.subtitle}
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-5 border-l-2 border-border pl-4">
          <p className="text-sm text-foreground/80">{o.intro}</p>

          <div className="rounded-lg border border-dashed border-border p-3.5">
            <BlockLabel>{o.principle.title}</BlockLabel>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{o.principle.body}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{o.principle.note}</p>
          </div>

          <div className="space-y-2">
            <BlockLabel>Matriz de avatar y red</BlockLabel>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Avatar</TableHead>
                    <TableHead className="text-foreground">Personajes</TableHead>
                    <TableHead className="text-foreground">Red principal</TableHead>
                    <TableHead className="text-foreground">Red secundaria</TableHead>
                    <TableHead className="text-foreground">Conversion</TableHead>
                    <TableHead className="text-foreground">Oferta prioritaria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {o.matrix.map((row) => (
                    <TableRow key={row.personas}>
                      <TableCell className="align-top font-medium text-foreground">{row.avatar}</TableCell>
                      <TableCell className="align-top whitespace-nowrap text-foreground/80">{row.personas}</TableCell>
                      <TableCell className="align-top whitespace-nowrap text-foreground/80">{row.primary}</TableCell>
                      <TableCell className="align-top whitespace-nowrap text-foreground/80">{row.secondary}</TableCell>
                      <TableCell className="align-top text-foreground/80">{row.conversion}</TableCell>
                      <TableCell className="align-top text-foreground/80">{row.offer}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <BlockLabel>{o.editorialRule.title}</BlockLabel>
            <ul className="space-y-1.5">
              {o.editorialRule.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2 text-sm text-foreground/80">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ChannelsView() {
  const [open, setOpen] = useState<string[]>([]);

  return (
    <Accordion
      multiple
      value={open}
      onValueChange={(value) => setOpen(value as string[])}
      className="space-y-2"
    >
      <OverviewSection />

      {CHANNELS.map((channel) => (
        <ChannelSection key={channel.number} channel={channel} />
      ))}

      <AccordionItem value="produccion" className="rounded-xl border border-border px-4 last:border-b">
          <AccordionTrigger className="py-3.5">
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Radio className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {PRODUCTION_SYSTEM.number}
                  </span>
                  <span className="font-heading text-base font-semibold">
                    {PRODUCTION_SYSTEM.title}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {PRODUCTION_SYSTEM.tagline}
                </span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-5 border-l-2 border-border pl-4">
              {PRODUCTION_SYSTEM.blocks.map((block, index) => (
                <ChannelBlockView key={`${block.kind}-${index}`} block={block} accent="64748b" />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
  );
}

export default ChannelsView;
