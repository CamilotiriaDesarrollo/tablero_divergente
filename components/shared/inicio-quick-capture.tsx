"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, FileAudio, FolderKanban, LoaderCircle, Mic, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceRecordingPanel } from "@/components/shared/voice-recording-panel";
import { useVoiceTranscription } from "@/components/shared/use-voice-transcription";
import { createTaskAction } from "@/lib/db/actions";
import { markLocalMutation } from "@/lib/realtime/echo-guard";
import { toDateColumn } from "@/lib/utils/dates";
import type { Project } from "@/types/db";

const TASK_TITLE_LIMIT = 500;
const NO_PROJECT = "__no-project__";

type ProjectOption = Pick<Project, "id" | "name" | "icon" | "status">;

export function InicioQuickCapture({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [dueAt, setDueAt] = useState(() => toDateColumn(new Date()));
  const [pending, startTransition] = useTransition();
  const voice = useVoiceTranscription({
    onTranscript: (transcript) => {
      setValue((current) =>
        [current.trim(), transcript.trim()]
          .filter(Boolean)
          .join(" ")
          .slice(0, TASK_TITLE_LIMIT),
      );
    },
    successMessage: "Tarea transcrita",
  });

  function submit() {
    const text = value.trim();
    if (!text) return;
    startTransition(async () => {
      try {
        markLocalMutation();
        await createTaskAction({
          title: text,
          status: "todo",
          project_id: projectId === NO_PROJECT ? null : projectId,
          received_at: toDateColumn(new Date()),
          due_at: dueAt || null,
        });
        markLocalMutation();
        setValue("");
        toast.success("Tarea agregada", { description: "La ves en Tareas." });
        router.refresh();
      } catch {
        toast.error("No se pudo agregar", { description: "Intenta de nuevo." });
      }
    });
  }

  function handleAudioFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void voice.transcribeFile(file);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="rounded-lg bg-card p-3 ring-1 ring-foreground/10"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, TASK_TITLE_LIMIT))}
          placeholder="Captura una tarea por texto o voz"
          aria-label="Captura rapida"
          disabled={pending}
          className="flex-1"
        />
        <input
          id="inicio-audio-file"
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={handleAudioFile}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={voice.recording ? "default" : "outline"}
            onClick={voice.recording ? voice.stopRecording : voice.startRecording}
            disabled={pending || voice.transcribing}
            className={
              voice.recording
                ? "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
                : undefined
            }
          >
            {voice.recording ? <CircleCheck /> : <Mic />}
            {voice.recording ? "Terminar y transcribir" : "Grabar tarea"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => document.getElementById("inicio-audio-file")?.click()}
            disabled={pending || voice.recording || voice.transcribing}
            aria-label="Subir audio de tarea"
            title="Subir audio"
          >
            {voice.transcribing ? <LoaderCircle className="animate-spin" /> : <FileAudio />}
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={pending || voice.transcribing || !value.trim()}
            aria-label="Capturar tarea"
            title="Agregar tarea"
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Select value={projectId} onValueChange={(next) => setProjectId(next as string)}>
            <SelectTrigger className="w-full sm:w-64" size="sm" aria-label="Proyecto de la tarea">
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

        <div className="flex items-center gap-2">
          <label
            className="shrink-0 text-xs font-medium text-muted-foreground"
            htmlFor="inicio-task-due"
          >
            Entrega:
          </label>
          <Input
            id="inicio-task-due"
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={pending}
            className="h-7 w-full sm:w-40"
          />
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
    </form>
  );
}
