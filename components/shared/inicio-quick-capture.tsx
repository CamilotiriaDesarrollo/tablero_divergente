"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, FileAudio, LoaderCircle, Mic, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoiceRecordingPanel } from "@/components/shared/voice-recording-panel";
import { useVoiceTranscription } from "@/components/shared/use-voice-transcription";
import { createTaskAction } from "@/lib/db/actions";
import { markLocalMutation } from "@/lib/realtime/echo-guard";

const TASK_TITLE_LIMIT = 500;

export function InicioQuickCapture() {
  const router = useRouter();
  const [value, setValue] = useState("");
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
        await createTaskAction({ title: text, status: "todo" });
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
