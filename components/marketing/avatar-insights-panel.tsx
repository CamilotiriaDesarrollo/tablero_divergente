"use client";
// Registro de aprendizaje del avatar: convierte supuestos de la ficha en
// hipotesis contrastables con notas y evidencia real.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Lightbulb, NotebookPen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  MarketingAvatarObservation,
  MarketingObservationKind,
  MarketingObservationStatus,
} from "@/types/db";

const KIND_OPTIONS: { value: MarketingObservationKind; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "hipotesis", label: "Hipotesis" },
  { value: "evidencia", label: "Evidencia" },
];

const STATUS_OPTIONS: { value: MarketingObservationStatus; label: string }[] = [
  { value: "en_observacion", label: "En observacion" },
  { value: "por_validar", label: "Por validar" },
  { value: "confirmada", label: "Confirmada" },
  { value: "refutada", label: "Refutada" },
];

const STATUS_STYLES: Record<MarketingObservationStatus, string> = {
  en_observacion: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  por_validar: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  refutada: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function kindIcon(kind: MarketingObservationKind) {
  if (kind === "hipotesis") return <Lightbulb className="size-3.5" />;
  if (kind === "evidencia") return <BadgeCheck className="size-3.5" />;
  return <NotebookPen className="size-3.5" />;
}

function labelForStatus(status: MarketingObservationStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function persistenceErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Intenta de nuevo.";
}

async function observationRequest(
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
) {
  const response = await fetch("/api/marketing/observations", {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || "No se pudo completar la operacion.");
  }
  return payload;
}

export function AvatarInsightsPanel({
  avatarId,
  observations,
}: {
  avatarId: string;
  observations: MarketingAvatarObservation[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<MarketingObservationKind>("hipotesis");
  const [status, setStatus] = useState<MarketingObservationStatus>("por_validar");
  const totals = useMemo(
    () => ({
      open: observations.filter((item) => item.status === "por_validar").length,
      confirmed: observations.filter((item) => item.status === "confirmada").length,
    }),
    [observations],
  );

  function createObservation(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Escribe una nota, hipotesis o evidencia");
      return;
    }
    startTransition(async () => {
      try {
        await observationRequest("POST", {
          avatar_id: avatarId,
          title: title.trim(),
          content: null,
          kind,
          status,
        });
        setTitle("");
        toast.success("Registro guardado");
        router.refresh();
      } catch (error) {
        toast.error("No se pudo guardar", {
          description: persistenceErrorMessage(error),
        });
      }
    });
  }

  function updateStatus(id: string, nextStatus: MarketingObservationStatus) {
    startTransition(async () => {
      try {
        await observationRequest("PATCH", { id, status: nextStatus });
        router.refresh();
      } catch (error) {
        toast.error("No se pudo actualizar", {
          description: persistenceErrorMessage(error),
        });
      }
    });
  }

  function removeObservation(id: string) {
    startTransition(async () => {
      try {
        await observationRequest("DELETE", { id });
        toast.success("Registro eliminado");
        router.refresh();
      } catch (error) {
        toast.error("No se pudo eliminar", {
          description: persistenceErrorMessage(error),
        });
      }
    });
  }

  return (
    <section className="rounded-xl bg-secondary/55 p-4 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold">Contraste</h2>
        </div>
        <div className="flex gap-1.5 text-xs">
          <span className="rounded-md bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300">
            {totals.open} por validar
          </span>
          <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-700 dark:text-emerald-300">
            {totals.confirmed} confirmadas
          </span>
        </div>
      </div>

      <form onSubmit={createObservation} className="mt-3 space-y-2 border-t border-border pt-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej.: Prefiere ejemplos aplicados a su trabajo"
            maxLength={300}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(value) => setKind(value as MarketingObservationKind)}>
              <SelectTrigger size="sm" aria-label="Tipo de registro"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as MarketingObservationStatus)}>
              <SelectTrigger size="sm" aria-label="Estado de validacion"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
            Registra una frase breve: una observacion, una hipotesis o la evidencia encontrada.
          </p>
          <Button type="submit" size="sm" disabled={pending} className="sm:mb-0.5">
            <Plus />
            {pending ? "Guardando..." : "Registrar"}
          </Button>
        </div>
      </form>

      {observations.length ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {observations.map((item) => (
            <article key={item.id} className="rounded-lg border border-border px-3 py-2.5">
              <div className="flex gap-2">
                <span className="mt-0.5 text-muted-foreground">{kindIcon(item.kind)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  {item.content ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.content}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[item.status]}`}>
                      {labelForStatus(item.status)}
                    </span>
                    <Select value={item.status} onValueChange={(value) => updateStatus(item.id, value as MarketingObservationStatus)} disabled={pending}>
                      <SelectTrigger size="sm" className="h-7 text-[11px]" aria-label={`Cambiar estado de ${item.title}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon-xs" className="ml-auto text-muted-foreground hover:text-destructive" aria-label={`Eliminar ${item.title}`} onClick={() => removeObservation(item.id)} disabled={pending}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
          Aun no hay registros. Empieza por una hipotesis que puedas contrastar.
        </p>
      )}
    </section>
  );
}

export default AvatarInsightsPanel;
