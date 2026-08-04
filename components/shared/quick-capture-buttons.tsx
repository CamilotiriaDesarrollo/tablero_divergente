"use client";
// components/shared/quick-capture-buttons.tsx
// Captura rapida de Inicio: tres botones redondos (Tarea, Idea, Contenido).
// Cada uno abre un dialogo pensado primero para el celular: el microfono es lo
// mas grande y lo primero que se ve, porque capturar algo en movimiento se hace
// dictando. Escribir sigue estando ahi para quien prefiera el teclado.
//
// El dialogo NO enfoca ningun campo al abrir: en movil el teclado taparia el
// microfono, que es justo la accion principal.
//
// "Contenido" solo aparece si el modulo Marketing esta activo y hay al menos un
// avatar, porque una idea de contenido sin avatar no tiene donde vivir.
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clapperboard,
  FileAudio,
  Lightbulb,
  ListTodo,
  LoaderCircle,
  Mic,
  Square,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceRecordingPanel } from "@/components/shared/voice-recording-panel";
import { useVoiceTranscription } from "@/components/shared/use-voice-transcription";
import { CONTENT_FORMATS } from "@/components/marketing/marketing-constants";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
} from "@/components/tareas/task-constants";
import { WeekdayPicker } from "@/components/tareas/weekday-picker";
import { IA_ENABLED, MARKETING_ENABLED } from "@/lib/config";
import {
  createContentIdeaAction,
  createProjectAction,
  createTaskAction,
} from "@/lib/db/actions";
import { markLocalMutation } from "@/lib/realtime/echo-guard";
import { cn } from "@/lib/utils";
import { toDateColumn } from "@/lib/utils/dates";
import { PRIORITY_EMOJI } from "@/lib/utils/urgency";
import type { MarketingAvatar, Priority, Project } from "@/types/db";

const TASK_TITLE_LIMIT = 500;
const TASK_NOTES_LIMIT = 5000;
const IDEA_LIMIT = 8000;
const CONTENT_TITLE_LIMIT = 300;
const CONTENT_NOTES_LIMIT = 8000;

const NO_PROJECT = "__sin-proyecto__";
const NO_FORMAT = "__sin-formato__";
const NO_CATEGORY = "__sin-categoria__";
const NO_PRIORITY = "sin";
/** Etiqueta del campo principal de la tarea: se repite en el aviso del dictado. */
const TASK_FIELD_LABEL = "Que hay que hacer";

const PRIO_OPTIONS = [
  { value: NO_PRIORITY, label: "Sin prioridad" },
  { value: "alta", label: `${PRIORITY_EMOJI.alta} Alta` },
  { value: "media", label: `${PRIORITY_EMOJI.media} Media` },
  { value: "baja", label: `${PRIORITY_EMOJI.baja} Baja` },
];

export type QuickCaptureProject = Pick<Project, "id" | "name" | "icon">;
export type QuickCaptureAvatar = Pick<MarketingAvatar, "id" | "name" | "icon">;

/** Suma lo transcrito a lo que ya habia, sin pasarse del limite del campo. */
function appendText(
  current: string,
  addition: string,
  limit: number,
  separator = " ",
): string {
  return [current.trim(), addition.trim()]
    .filter(Boolean)
    .join(separator)
    .slice(0, limit);
}

/** Fila completa de captura rapida de Inicio. */
export function QuickCaptureButtons({
  projects,
  avatars = [],
}: {
  projects: QuickCaptureProject[];
  avatars?: QuickCaptureAvatar[];
}) {
  const showContent = MARKETING_ENABLED && avatars.length > 0;

  return (
    <div className="flex flex-wrap items-start justify-center gap-2 rounded-lg bg-card p-4 ring-1 ring-foreground/10 sm:justify-start sm:gap-6">
      <TaskCaptureButton projects={projects} />
      <IdeaCaptureButton />
      {showContent ? <ContentCaptureButton avatars={avatars} /> : null}
    </div>
  );
}

// Cada boton se lleva su dialogo: asi el de Idea se puede usar suelto en el
// Banco de ideas y se comporta exactamente igual que en Inicio.

export function TaskCaptureButton({
  projects,
}: {
  projects: QuickCaptureProject[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CaptureTrigger
        icon={ListTodo}
        label="Tarea"
        hint="Grabar o escribir una tarea"
        tone="bg-primary text-primary-foreground"
        onClick={() => setOpen(true)}
      />
      <TaskCaptureDialog open={open} onOpenChange={setOpen} projects={projects} />
    </>
  );
}

export function IdeaCaptureButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CaptureTrigger
        icon={Lightbulb}
        label="Idea"
        hint="Guardar una idea en el banco"
        tone="bg-amber-500 text-white"
        onClick={() => setOpen(true)}
      />
      <IdeaCaptureDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ContentCaptureButton({
  avatars,
}: {
  avatars: QuickCaptureAvatar[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CaptureTrigger
        icon={Clapperboard}
        label="Contenido"
        hint="Anotar una idea de contenido"
        tone="bg-sky-500 text-white"
        onClick={() => setOpen(true)}
      />
      <ContentCaptureDialog open={open} onOpenChange={setOpen} avatars={avatars} />
    </>
  );
}

function CaptureTrigger({
  icon: Icon,
  label,
  hint,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-label={hint}
      className="group flex w-24 shrink-0 flex-col items-center gap-2 rounded-lg p-1 outline-none"
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full shadow-sm transition-transform sm:size-16",
          "group-hover:-translate-y-0.5 group-active:translate-y-0",
          "group-focus-visible:ring-3 group-focus-visible:ring-ring/50",
          tone,
        )}
      >
        <Icon className="size-6 sm:size-7" aria-hidden />
      </span>
      <span className="text-center text-xs font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground">
        {label}
      </span>
    </button>
  );
}

/**
 * Bloque de voz compartido por los tres dialogos: boton redondo grande para
 * grabar y, mientras grabas, la MISMA onda y transcripcion en vivo que ya tenia
 * la captura de Inicio, aqui dentro y no al final del formulario: lo que estas
 * dictando tiene que verse junto al microfono que lo esta escuchando.
 *
 * `targetLabel` dice en que campo va a caer el texto, para que dictar no sea a
 * ciegas. Desaparece entero cuando la IA esta apagada (clon sin llaves).
 */
function VoiceCapture({
  voice,
  idleHint,
  targetLabel,
  fileInputId,
  disabled,
}: {
  voice: ReturnType<typeof useVoiceTranscription>;
  idleHint: string;
  targetLabel: string;
  fileInputId: string;
  disabled: boolean;
}) {
  if (!IA_ENABLED) return null;

  const busy = voice.transcribing;
  const live = voice.recording || busy;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4">
      <button
        type="button"
        onClick={voice.recording ? voice.stopRecording : voice.startRecording}
        disabled={disabled || busy}
        aria-label={voice.recording ? "Terminar y transcribir" : "Grabar con el microfono"}
        className={cn(
          "flex size-16 items-center justify-center rounded-full text-white outline-none transition-colors",
          "focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50",
          voice.recording
            ? "bg-red-600 ring-4 ring-red-500/25 hover:bg-red-700"
            : "bg-primary hover:bg-primary/85",
        )}
      >
        {busy ? (
          <LoaderCircle className="size-7 animate-spin" />
        ) : voice.recording ? (
          <Square className="size-6 fill-current" />
        ) : (
          <Mic className="size-7" />
        )}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        {busy
          ? "Transcribiendo..."
          : voice.recording
            ? `Toca para terminar. El texto entra en "${targetLabel}".`
            : idleHint}
      </p>

      {live ? (
        <VoiceRecordingPanel
          className="mt-0 w-full"
          stream={voice.audioStream}
          recording={voice.recording}
          liveTranscript={voice.liveTranscript}
          liveSupported={voice.liveSupported}
        />
      ) : (
        <>
          <input
            id={fileInputId}
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void voice.transcribeFile(file);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => document.getElementById(fileInputId)?.click()}
          >
            <FileAudio />
            Subir audio
          </Button>
        </>
      )}
    </div>
  );
}

// ---------- Tarea ----------

function TaskCaptureDialog({
  open,
  onOpenChange,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: QuickCaptureProject[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [category, setCategory] = useState(NO_CATEGORY);
  const [prio, setPrio] = useState(NO_PRIORITY);
  const [dueAt, setDueAt] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [isDaily, setIsDaily] = useState(false);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);

  // Lo dictado cae donde estabas: en la tarea por defecto, en el detalle si
  // acabas de tocarlo. Asi se dicta primero que hacer y luego el contexto.
  const [target, setTarget] = useState<"title" | "notes">("title");

  const voice = useVoiceTranscription({
    onTranscript: (text) => {
      if (target === "notes") {
        setNotes((current) => appendText(current, text, TASK_NOTES_LIMIT, "\n\n"));
      } else {
        setTitle((current) => appendText(current, text, TASK_TITLE_LIMIT));
      }
    },
    successMessage: "Tarea transcrita",
  });

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setNotes("");
    setProjectId(NO_PROJECT);
    setCategory(NO_CATEGORY);
    setPrio(NO_PRIORITY);
    setDueAt(toDateColumn(new Date()));
    setResourceUrl("");
    setIsDaily(false);
    setWeeklyDays([]);
    setTarget("title");
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Dicta o escribe la tarea", {
        description: "Con el titulo basta; lo demas es opcional.",
      });
      return;
    }
    startTransition(async () => {
      try {
        markLocalMutation();
        await createTaskAction({
          title: cleanTitle,
          notes: notes.trim() || null,
          status: "todo",
          project_id: projectId === NO_PROJECT ? null : projectId,
          category: category === NO_CATEGORY ? null : category,
          priority: prio === NO_PRIORITY ? null : (prio as Priority),
          // La fecha recibida es siempre el dia en que se diligencia la tarea.
          received_at: toDateColumn(new Date()),
          due_at: dueAt || null,
          resource_url: resourceUrl.trim() || null,
          is_daily: isDaily,
          // Solo viaja cuando hay dias: una tarea normal no depende de la
          // migracion 0014 para poder guardarse.
          ...(weeklyDays.length ? { weekly_days: weeklyDays } : {}),
        });
        markLocalMutation();
        toast.success("Tarea agregada", { description: "La ves en Tareas." });
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("No se pudo agregar", { description: "Intenta de nuevo." });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="size-4 text-muted-foreground" aria-hidden />
              Nueva tarea
            </DialogTitle>
            <DialogDescription>
              Dictala y la transcribimos, o escribela. Solo el titulo es obligatorio.
            </DialogDescription>
          </DialogHeader>

          <VoiceCapture
            voice={voice}
            idleHint="Toca el microfono y dicta la tarea"
            targetLabel={target === "notes" ? "Detalle" : TASK_FIELD_LABEL}
            fileInputId="captura-tarea-audio"
            disabled={pending}
          />

          <div className="grid gap-2">
            <Label htmlFor="captura-tarea-titulo">{TASK_FIELD_LABEL}</Label>
            <Textarea
              id="captura-tarea-titulo"
              value={title}
              onFocus={() => setTarget("title")}
              onChange={(event) =>
                setTitle(event.target.value.slice(0, TASK_TITLE_LIMIT))
              }
              placeholder="La tarea, en una linea"
              rows={2}
              className="min-h-16"
              disabled={pending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="captura-tarea-proyecto">Proyecto</Label>
              <Select
                value={projectId}
                onValueChange={(next) => setProjectId(next as string)}
              >
                <SelectTrigger id="captura-tarea-proyecto" className="w-full">
                  <SelectValue>
                    {(selected: string) => {
                      if (!selected || selected === NO_PROJECT) return "Sin proyecto";
                      const project = projects.find((item) => item.id === selected);
                      return project
                        ? `${project.icon ? `${project.icon} ` : ""}${project.name}`
                        : "Sin proyecto";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>Sin proyecto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.icon ? `${project.icon} ` : ""}
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="captura-tarea-prioridad">Prioridad</Label>
              <Select value={prio} onValueChange={(next) => setPrio(next as string)}>
                <SelectTrigger id="captura-tarea-prioridad" className="w-full">
                  <SelectValue>
                    {(selected: string) =>
                      PRIO_OPTIONS.find((option) => option.value === selected)?.label ??
                      "Sin prioridad"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="captura-tarea-categoria">Categoria</Label>
              <Select
                value={category}
                onValueChange={(next) => setCategory(next as string)}
              >
                <SelectTrigger id="captura-tarea-categoria" className="w-full">
                  <SelectValue>
                    {(selected: string) =>
                      selected && selected !== NO_CATEGORY
                        ? `${CATEGORY_EMOJI[selected] ? `${CATEGORY_EMOJI[selected]} ` : ""}${CATEGORY_LABEL[selected] ?? selected}`
                        : "Sin categoria"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sin categoria</SelectItem>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CATEGORY_EMOJI[option] ? `${CATEGORY_EMOJI[option]} ` : ""}
                      {CATEGORY_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="captura-tarea-entrega">Entrega</Label>
              <Input
                id="captura-tarea-entrega"
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="captura-tarea-notas">Detalle</Label>
            <Textarea
              id="captura-tarea-notas"
              value={notes}
              onFocus={() => setTarget("notes")}
              onChange={(event) =>
                setNotes(event.target.value.slice(0, TASK_NOTES_LIMIT))
              }
              placeholder="Opcional. Si dictas con este campo activo, el texto cae aqui."
              rows={3}
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="captura-tarea-recurso">Recurso (url)</Label>
            <Input
              id="captura-tarea-recurso"
              type="url"
              inputMode="url"
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              placeholder="https://"
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <Label htmlFor="captura-tarea-diaria" className="cursor-pointer">
                  Tarea diaria
                </Label>
                <span className="text-xs text-muted-foreground">
                  Se repite todos los dias.
                </span>
              </div>
              <Switch
                id="captura-tarea-diaria"
                checked={isDaily}
                onCheckedChange={(next) => setIsDaily(next)}
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-1.5 border-t pt-3">
              <Label>Tarea semanal</Label>
              <WeekdayPicker
                value={weeklyDays}
                onChange={setWeeklyDays}
                disabled={pending}
                idPrefix="captura-tarea-weekday"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || voice.transcribing}>
              {pending ? "Guardando..." : "Guardar tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Idea ----------

function IdeaCaptureDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  const voice = useVoiceTranscription({
    onTranscript: (text) =>
      setNote((current) => appendText(current, text, IDEA_LIMIT, "\n\n")),
    successMessage: "Idea transcrita",
  });

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const clean = note.trim();
    if (!clean) {
      toast.error("Dicta o escribe la idea", {
        description: "Luego la desarrollas y le pones titulo.",
      });
      return;
    }
    // Igual que el banco de ideas: la primera frase queda de titulo provisional.
    const title = clean.replace(/\s+/g, " ").slice(0, 200);
    startTransition(async () => {
      try {
        await createProjectAction({ name: title, description: clean, status: "idea" });
        toast.success("Idea guardada", { description: "La ves en el Banco de ideas." });
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo guardar la idea", {
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-muted-foreground" aria-hidden />
              Nueva idea
            </DialogTitle>
            <DialogDescription>
              Sueltala como te salga. No tiene que estar completa, solo lo
              suficiente para no olvidarla.
            </DialogDescription>
          </DialogHeader>

          <VoiceCapture
            voice={voice}
            idleHint="Toca el microfono y cuenta la idea"
            targetLabel="Idea"
            fileInputId="captura-idea-audio"
            disabled={pending}
          />

          <div className="grid gap-2">
            <Label htmlFor="captura-idea-texto">Idea</Label>
            <Textarea
              id="captura-idea-texto"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, IDEA_LIMIT))}
              placeholder="Angulo, ejemplos, referencias o un borrador completo..."
              rows={5}
              disabled={pending}
            />
            <span className="text-xs text-muted-foreground">
              La primera frase se usara como titulo provisional.
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || voice.transcribing}>
              {pending ? "Guardando..." : "Guardar idea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Contenido ----------

function ContentCaptureDialog({
  open,
  onOpenChange,
  avatars,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatars: QuickCaptureAvatar[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [avatarId, setAvatarId] = useState(avatars[0]?.id ?? "");
  const [format, setFormat] = useState(NO_FORMAT);

  const [target, setTarget] = useState<"title" | "notes">("title");

  const voice = useVoiceTranscription({
    onTranscript: (text) => {
      if (target === "notes") {
        setNotes((current) => appendText(current, text, CONTENT_NOTES_LIMIT, "\n\n"));
      } else {
        setTitle((current) => appendText(current, text, CONTENT_TITLE_LIMIT));
      }
    },
    successMessage: "Contenido transcrito",
  });

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setNotes("");
    setFormat(NO_FORMAT);
    setAvatarId(avatars[0]?.id ?? "");
    setTarget("title");
  }, [open, avatars]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Dicta o escribe la idea de contenido", {
        description: "Un titulo corto basta; luego la desarrollas.",
      });
      return;
    }
    if (!avatarId) {
      toast.error("Elige para quien es este contenido");
      return;
    }
    startTransition(async () => {
      try {
        await createContentIdeaAction({
          avatar_id: avatarId,
          title: cleanTitle,
          notes: notes.trim() || null,
          format: format !== NO_FORMAT ? format : null,
        });
        toast.success("Contenido guardado", { description: "Lo ves en Marketing." });
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error("No se pudo guardar", {
          description:
            error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clapperboard className="size-4 text-muted-foreground" aria-hidden />
              Nuevo contenido
            </DialogTitle>
            <DialogDescription>
              Una idea de contenido para tu audiencia. Dictala o escribela.
            </DialogDescription>
          </DialogHeader>

          <VoiceCapture
            voice={voice}
            idleHint="Toca el microfono y cuenta la idea de contenido"
            targetLabel={target === "notes" ? "Detalle" : "Contenido"}
            fileInputId="captura-contenido-audio"
            disabled={pending}
          />

          <div className="grid gap-2">
            <Label htmlFor="captura-contenido-titulo">Contenido</Label>
            <Textarea
              id="captura-contenido-titulo"
              value={title}
              onFocus={() => setTarget("title")}
              onChange={(event) =>
                setTitle(event.target.value.slice(0, CONTENT_TITLE_LIMIT))
              }
              placeholder="De que trata"
              rows={2}
              className="min-h-16"
              disabled={pending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {avatars.length > 1 ? (
              <div className="grid gap-2">
                <Label htmlFor="captura-contenido-avatar">Para quien</Label>
                <Select
                  value={avatarId}
                  onValueChange={(next) => setAvatarId(next as string)}
                >
                  <SelectTrigger id="captura-contenido-avatar" className="w-full">
                    <SelectValue>
                      {(selected: string) => {
                        const avatar = avatars.find((item) => item.id === selected);
                        return avatar
                          ? `${avatar.icon ? `${avatar.icon} ` : ""}${avatar.name}`
                          : "Elige un avatar";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {avatars.map((avatar) => (
                      <SelectItem key={avatar.id} value={avatar.id}>
                        {avatar.icon ? `${avatar.icon} ` : ""}
                        {avatar.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="captura-contenido-formato">Formato</Label>
              <Select
                value={format}
                onValueChange={(next) => setFormat(next as string)}
              >
                <SelectTrigger id="captura-contenido-formato" className="w-full">
                  <SelectValue>
                    {(selected: string) =>
                      selected && selected !== NO_FORMAT ? selected : "Sin formato"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FORMAT}>Sin formato</SelectItem>
                  {CONTENT_FORMATS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="captura-contenido-notas">Detalle</Label>
            <Textarea
              id="captura-contenido-notas"
              value={notes}
              onFocus={() => setTarget("notes")}
              onChange={(event) =>
                setNotes(event.target.value.slice(0, CONTENT_NOTES_LIMIT))
              }
              placeholder="Opcional. Si dictas con este campo activo, el texto cae aqui."
              rows={3}
              disabled={pending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || voice.transcribing}>
              {pending ? "Guardando..." : "Guardar contenido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
