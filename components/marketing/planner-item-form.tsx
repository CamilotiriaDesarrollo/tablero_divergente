"use client";
// components/marketing/planner-item-form.tsx
// Formato completo de una pieza de contenido para el planeador: red, tipo,
// avatares objetivo (varios), hook, angulo/problema, bullets principales, guion
// y llamada a la accion. Se usa tanto para crear como para editar. Dialogo
// controlado por el tablero; el estado interno se reinicia al abrir.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PLANNER_CONTENT_TYPES,
  PLANNER_NETWORKS,
  PLANNER_STATUS_LABEL,
} from "@/components/marketing/marketing-constants";
import { projectColorValue } from "@/components/proyectos/project-colors";
import {
  createPlannerItemAction,
  updatePlannerItemAction,
} from "@/lib/db/actions";
import {
  MARKETING_PLANNER_STATUSES,
  type MarketingPlannerItem,
  type MarketingPlannerStatus,
} from "@/types/db";
import { cn } from "@/lib/utils";

const NONE = "none";
const SCRIPT_LIMIT = 12000;

export interface PlannerAvatarOption {
  id: string;
  name: string;
  color: string | null;
}

export function PlannerItemForm({
  open,
  onOpenChange,
  avatars,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatars: PlannerAvatarOption[];
  /** Presente en edicion; ausente al crear. */
  item?: MarketingPlannerItem | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [network, setNetwork] = useState(NONE);
  const [contentType, setContentType] = useState(NONE);
  const [avatarIds, setAvatarIds] = useState<string[]>([]);
  const [hook, setHook] = useState("");
  const [angle, setAngle] = useState("");
  const [bulletsText, setBulletsText] = useState("");
  const [script, setScript] = useState("");
  const [cta, setCta] = useState("");
  const [status, setStatus] = useState<MarketingPlannerStatus>("borrador");
  const [scheduledFor, setScheduledFor] = useState("");

  // Reinicia el formulario cada vez que se abre (crear = limpio; editar = datos).
  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? "");
    setNetwork(item?.network ?? NONE);
    setContentType(item?.content_type ?? NONE);
    setAvatarIds(item?.avatar_ids ?? []);
    setHook(item?.hook ?? "");
    setAngle(item?.angle ?? "");
    setBulletsText((item?.bullets ?? []).join("\n"));
    setScript(item?.script ?? "");
    setCta(item?.cta ?? "");
    setStatus(item?.status ?? "borrador");
    setScheduledFor(item?.scheduled_for ?? "");
  }, [open, item]);

  function toggleAvatar(id: string) {
    setAvatarIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Escribe un titulo para la pieza.");
      return;
    }
    const bullets = bulletsText
      .split("\n")
      .map((line) => line.trim().slice(0, 1000))
      .filter(Boolean)
      .slice(0, 40);
    const payload = {
      title: trimmed,
      network: network !== NONE ? network : null,
      content_type: contentType !== NONE ? contentType : null,
      avatar_ids: avatarIds,
      hook: hook.trim() || null,
      angle: angle.trim() || null,
      bullets,
      script: script.trim() || null,
      cta: cta.trim() || null,
      status,
      scheduled_for: scheduledFor || null,
    };
    startTransition(async () => {
      try {
        if (item) {
          await updatePlannerItemAction(item.id, payload);
          toast.success("Contenido actualizado");
        } else {
          await createPlannerItemAction(payload);
          toast.success("Contenido creado");
        }
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo guardar el contenido", {
          description:
            error instanceof Error
              ? tableMissingHint(error.message)
              : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Editar contenido" : "Nuevo contenido"}</DialogTitle>
          <DialogDescription>
            Define la red, el tipo, los avatares a los que apunta y el guion
            completo: hook, bullets y llamada a la accion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planner-title">Titulo</Label>
            <Input
              id="planner-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="De que trata la pieza"
              maxLength={300}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Red</Label>
              <Select value={network} onValueChange={(v) => setNetwork(v ?? NONE)}>
                <SelectTrigger className="w-full" aria-label="Red">
                  <SelectValue>
                    {(v: string) => (v && v !== NONE ? v : "Sin red")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin red</SelectItem>
                  {PLANNER_NETWORKS.map((n) => (
                    <SelectItem key={n.name} value={n.name}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de contenido</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v ?? NONE)}>
                <SelectTrigger className="w-full" aria-label="Tipo de contenido">
                  <SelectValue>
                    {(v: string) => (v && v !== NONE ? v : "Sin tipo")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin tipo</SelectItem>
                  {PLANNER_CONTENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  {item?.content_type &&
                  !PLANNER_CONTENT_TYPES.includes(
                    item.content_type as (typeof PLANNER_CONTENT_TYPES)[number],
                  ) ? (
                    <SelectItem value={item.content_type}>{item.content_type}</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Avatares a los que apunta</Label>
            {avatars.length ? (
              <div className="flex flex-wrap gap-1.5">
                {avatars.map((avatar) => {
                  const accent = projectColorValue(avatar.color);
                  const selected = avatarIds.includes(avatar.id);
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => toggleAvatar(avatar.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected
                          ? "border-transparent text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                      style={
                        selected ? { backgroundColor: `${accent}1f` } : undefined
                      }
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: accent }}
                        aria-hidden="true"
                      />
                      {avatar.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay avatares disponibles.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="planner-hook">Hook inicial</Label>
              <Textarea
                id="planner-hook"
                value={hook}
                onChange={(event) => setHook(event.target.value)}
                placeholder="La primera linea que detiene el scroll"
                rows={2}
                maxLength={2000}
                className="resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-angle">Angulo o problema</Label>
              <Textarea
                id="planner-angle"
                value={angle}
                onChange={(event) => setAngle(event.target.value)}
                placeholder="El problema concreto que aborda"
                rows={2}
                maxLength={2000}
                className="resize-y"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planner-bullets">Bullets principales</Label>
            <Textarea
              id="planner-bullets"
              value={bulletsText}
              onChange={(event) => setBulletsText(event.target.value)}
              placeholder={"Un punto por linea:\nProblema reconocible\nSolucion posible\nResultado esperado"}
              rows={4}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">Un bullet por linea.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="planner-script">Guion general</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {script.length.toLocaleString("es-CO")} /{" "}
                {SCRIPT_LIMIT.toLocaleString("es-CO")}
              </span>
            </div>
            <Textarea
              id="planner-script"
              value={script}
              onChange={(event) => setScript(event.target.value.slice(0, SCRIPT_LIMIT))}
              placeholder="Desarrollo, escenas, puntos de apoyo, referencias..."
              rows={8}
              maxLength={SCRIPT_LIMIT}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planner-cta">Llamada a la accion</Label>
            <Input
              id="planner-cta"
              value={cta}
              onChange={(event) => setCta(event.target.value)}
              placeholder="Que debe hacer quien lo ve"
              maxLength={500}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MarketingPlannerStatus)}
              >
                <SelectTrigger className="w-full" aria-label="Estado">
                  <SelectValue>
                    {(v: string) =>
                      PLANNER_STATUS_LABEL[v as MarketingPlannerStatus] ?? "Estado"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MARKETING_PLANNER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PLANNER_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-date">Fecha planeada</Label>
              <Input
                id="planner-date"
                type="date"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : item ? "Guardar cambios" : "Crear contenido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Si la tabla no existe todavia, orienta a aplicar la migracion 0013. */
function tableMissingHint(message: string): string {
  if (/schema cache|does not exist|planner/i.test(message)) {
    return "Aplica la migracion 0013_marketing_planner.sql en Supabase.";
  }
  return message;
}

export default PlannerItemForm;
