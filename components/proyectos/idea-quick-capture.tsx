"use client";
// components/proyectos/idea-quick-capture.tsx
// Captura una idea de contenido por escrito o voz. Las notas se guardan en la
// descripcion del proyecto para que una idea pueda crecer sin crear otra tabla.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CircleCheck,
  FileAudio,
  Lightbulb,
  LoaderCircle,
  Mic,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecordingPanel } from "@/components/shared/voice-recording-panel";
import { useVoiceTranscription } from "@/components/shared/use-voice-transcription";
import { createProjectAction } from "@/lib/db/actions";

const NOTE_LIMIT = 8000;

export function IdeaQuickCapture() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sections, setSections] = useState([""]);
  const [activeSection, setActiveSection] = useState(0);
  const activeSectionRef = useRef(0);

  const notesLength = sections.join("\n\n").length;

  function selectSection(index: number) {
    activeSectionRef.current = index;
    setActiveSection(index);
  }

  function updateSection(index: number, value: string) {
    setSections((current) => {
      const otherLength = current.reduce(
        (total, section, sectionIndex) =>
          total + (sectionIndex === index ? 0 : section.length),
        Math.max(0, (current.length - 1) * 2),
      );
      const next = [...current];
      next[index] = value.slice(0, Math.max(0, NOTE_LIMIT - otherLength));
      return next;
    });
  }

  function appendToActiveSection(text: string) {
    setSections((current) => {
      const index = Math.min(activeSectionRef.current, current.length - 1);
      const otherLength = current.reduce(
        (total, section, sectionIndex) =>
          total + (sectionIndex === index ? 0 : section.length),
        Math.max(0, (current.length - 1) * 2),
      );
      const next = [...current];
      const combined = [next[index].trim(), text.trim()].filter(Boolean).join("\n\n");
      next[index] = combined.slice(0, Math.max(0, NOTE_LIMIT - otherLength));
      return next;
    });
  }

  function addSection() {
    if (notesLength >= NOTE_LIMIT) {
      toast.error("Alcanzaste el limite de la idea.");
      return;
    }
    const nextIndex = sections.length;
    setSections((current) => [...current, ""]);
    selectSection(nextIndex);
    window.setTimeout(() => document.getElementById(`idea-note-${nextIndex}`)?.focus(), 0);
  }

  function removeSection(index: number) {
    if (sections.length === 1) return;
    setSections((current) => current.filter((_, sectionIndex) => sectionIndex !== index));
    const nextActive = Math.max(0, Math.min(activeSectionRef.current, sections.length - 2));
    selectSection(nextActive);
  }

  const voice = useVoiceTranscription({
    onTranscript: appendToActiveSection,
    successMessage: "Nota de voz transcrita",
  });

  function handleAudioFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void voice.transcribeFile(file);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const note = sections.map((section) => section.trim()).filter(Boolean).join("\n\n");
    if (!note) {
      toast.error("Escribe o dicta tu idea", {
        description: "Luego podras desarrollarla y ponerle un titulo.",
      });
      return;
    }
    const title = note.replace(/\s+/g, " ").slice(0, 200);

    startTransition(async () => {
      try {
        await createProjectAction({
          name: title,
          description: note,
          status: "idea",
        });
        toast.success("Idea guardada");
        setSections([""]);
        selectSection(0);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Intenta de nuevo en un momento.";
        toast.error("No se pudo guardar la idea", { description: message });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow focus-within:ring-2 focus-within:ring-ring"
    >
      <div className="flex items-center gap-2">
        <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        <Label htmlFor="idea-note-0" className="font-heading text-base font-medium">
          Nueva idea de contenido
        </Label>
      </div>
      <div className="mt-4 space-y-3">
        {sections.map((section, index) => (
          <div
            key={index}
            className={
              activeSection === index
                ? "rounded-lg ring-2 ring-primary/50"
                : "rounded-lg ring-1 ring-foreground/10"
            }
          >
            <div className="flex h-9 items-center justify-between border-b px-3">
              <Label htmlFor={`idea-note-${index}`} className="text-xs text-muted-foreground">
                Nota {index + 1}
              </Label>
              {sections.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeSection(index)}
                  aria-label={`Eliminar nota ${index + 1}`}
                  title="Eliminar nota"
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
            <Textarea
              id={`idea-note-${index}`}
              value={section}
              onFocus={() => selectSection(index)}
              onChange={(event) => updateSection(index, event.target.value)}
              placeholder={
                index === 0
                  ? "Escribe la idea como te salga: angulo, ejemplos, referencias o un borrador completo..."
                  : "Suma otra nota, enfoque, ejemplo o desarrollo de esta idea..."
              }
              aria-label={`Nota ${index + 1} de la idea`}
              rows={index === 0 ? 6 : 4}
              className="min-h-28 resize-y rounded-t-none border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addSection}>
            <Plus />
            Agregar otra nota
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {notesLength.toLocaleString("es-CO")} / {NOTE_LIMIT.toLocaleString("es-CO")}
          </span>
        </div>
      </div>
      {voice.recording || voice.transcribing ? (
        <VoiceRecordingPanel
          stream={voice.audioStream}
          recording={voice.recording}
          liveTranscript={voice.liveTranscript}
          liveSupported={voice.liveSupported}
        />
      ) : null}
      <div className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">
          La primera frase se usara como titulo provisional.
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="idea-audio-file"
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={handleAudioFile}
          />
          <Button
            type="button"
            variant={voice.recording ? "default" : "outline"}
            size={voice.recording ? "default" : "sm"}
            onClick={voice.recording ? voice.stopRecording : voice.startRecording}
            disabled={voice.transcribing}
            className={
              voice.recording
                ? "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
                : undefined
            }
          >
            {voice.recording ? <CircleCheck /> : <Mic />}
            {voice.recording ? "Terminar y transcribir" : "Grabar nota"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("idea-audio-file")?.click()}
            disabled={voice.recording || voice.transcribing}
          >
            {voice.transcribing ? <LoaderCircle className="animate-spin" /> : <FileAudio />}
            {voice.transcribing ? "Transcribiendo..." : "Subir audio"}
          </Button>
          <Button type="submit" disabled={pending || voice.transcribing}>
            {pending ? "Guardando..." : "Guardar idea"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default IdeaQuickCapture;
