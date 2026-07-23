// components/marketing/persona-blocks.tsx
// Renderers de los bloques de la ficha completa de un avatar, ajustados para
// una columna angosta (~300px): sin tablas HTML ni grids lado a lado (no caben
// a ese ancho), todo se apila con divide-y. Reglas validadas contra los casos
// mas dificiles de las 4 fichas reales (tabla comparativa de 3 columnas,
// listas de 12-15 bullets, grids de 2 columnas con parrafos largos).
import type { PersonaBlock } from "@/types/db";

const SHORT_KEY_MAX = 32;
const INLINE_VALUE_MAX = 24;

function BlockLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold text-foreground">{children}</p>
  );
}

function TextBlock({ block }: { block: Extract<PersonaBlock, { type: "text" }> }) {
  return (
    <div>
      {block.label ? <BlockLabel>{block.label}</BlockLabel> : null}
      <p className="text-xs leading-relaxed text-muted-foreground break-words">
        {block.body}
      </p>
    </div>
  );
}

function QuoteBlock({ block }: { block: Extract<PersonaBlock, { type: "quote" }> }) {
  return (
    <blockquote className="border-l-2 border-foreground/20 pl-3">
      {block.label ? (
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {block.label}
        </p>
      ) : null}
      <p className="text-sm leading-snug font-medium text-foreground break-words">
        {block.body}
      </p>
    </blockquote>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-4 marker:text-muted-foreground/40">
      {items.map((item) => (
        <li
          key={item}
          className="text-xs leading-snug text-muted-foreground break-words"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function ListBlock({ block }: { block: Extract<PersonaBlock, { type: "list" }> }) {
  return (
    <div>
      {block.label ? <BlockLabel>{block.label}</BlockLabel> : null}
      {block.body ? (
        <p className="mb-1.5 text-xs leading-relaxed text-muted-foreground break-words">
          {block.body}
        </p>
      ) : null}
      <BulletList items={block.items} />
    </div>
  );
}

/** Tabla clave -> valor corta: se apila como lista de definicion, sin <table>. */
function KeyValueTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
        {headers[0]} → {headers[1]}
      </p>
      <dl className="divide-y divide-border">
        {rows.map(([key, value]) => (
          <div key={key} className="py-2.5 first:pt-0 last:pb-0">
            <dt className="text-xs font-semibold text-foreground leading-snug">
              {key}
            </dt>
            <dd className="mt-0.5 text-xs leading-snug text-muted-foreground break-words">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Tabla de 3+ columnas o 2 columnas con clave larga: filas planas, pares
 * etiqueta:valor con densidad adaptativa (en linea si el valor es corto). */
function ComparisonRows({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const pairHeaders = headers.slice(1);
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
        {headers.join(" · ")}
      </p>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row[0]} className="py-2.5 first:pt-0 last:pb-0">
            <p className="text-xs font-semibold text-foreground">{row[0]}</p>
            <div className="mt-1 space-y-1">
              {pairHeaders.map((label, index) => {
                const value = row[index + 1] ?? "";
                const inline = value.length <= INLINE_VALUE_MAX;
                return inline ? (
                  <p
                    key={label}
                    className="text-xs leading-snug break-words text-foreground"
                  >
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      {label}:{" "}
                    </span>
                    {value}
                  </p>
                ) : (
                  <div key={label}>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug break-words text-foreground">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableBlock({ block }: { block: Extract<PersonaBlock, { type: "table" }> }) {
  const { headers, rows } = block;
  const isShortKeyTable =
    headers.length === 2 && rows.every((row) => (row[0]?.length ?? 0) <= SHORT_KEY_MAX);
  return (
    <div>
      {block.label ? <BlockLabel>{block.label}</BlockLabel> : null}
      {isShortKeyTable ? (
        <KeyValueTable headers={headers} rows={rows} />
      ) : (
        <ComparisonRows headers={headers} rows={rows} />
      )}
    </div>
  );
}

/** Grid de 2-3 columnas lado a lado en el original: se apila, nunca lado a
 * lado (no cabe a este ancho). */
function GridBlock({ block }: { block: Extract<PersonaBlock, { type: "grid" }> }) {
  return (
    <div>
      {block.label ? <BlockLabel>{block.label}</BlockLabel> : null}
      <div className="divide-y divide-border">
        {block.columns.map((column) => (
          <div key={column.label} className="py-2 first:pt-0 last:pb-0">
            <p className="mb-1 text-xs font-semibold text-foreground">
              {column.label}
            </p>
            {column.body ? (
              <p className="text-xs leading-relaxed text-muted-foreground break-words">
                {column.body}
              </p>
            ) : null}
            {column.items ? <BulletList items={column.items} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonaBlockView({ block }: { block: PersonaBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "list":
      return <ListBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "grid":
      return <GridBlock block={block} />;
    default:
      return null;
  }
}
