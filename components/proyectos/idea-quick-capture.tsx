"use client";
// components/proyectos/idea-quick-capture.tsx
// Captura una idea de contenido por escrito o voz. Las notas se guardan en la
// descripcion del proyecto para que una idea pueda crecer sin crear otra tabla.
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileAudio, Lightbulb, LoaderCircle, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecordingPanel } from "@/components/proyectos/voice-recording-panel";
import { createProjectAction } from "@/lib/db/actions";

const NOTE_LIMIT = 8000;

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function IdeaQuickCapture() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveSupported, setLiveSupported] = useState(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingRef = useRef(false);
  const finalLiveTranscriptRef = useRef("");
  const liveTranscriptRef = useRef("");

  useEffect(() => {
    return () => {
      recordingRef.current = false;
      recognitionRef.current?.abort();
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function appendToNotes(text: string) {
    setNotes((current) =>
      [current.trim(), text.trim()].filter(Boolean).join("\n\n").slice(0, NOTE_LIMIT),
    );
  }

  function startLiveRecognition() {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setLiveSupported(false);
      return;
    }

    setLiveSupported(true);
    finalLiveTranscriptRef.current = "";
    liveTranscriptRef.current = "";
    setLiveTranscript("");

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-CO";
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalLiveTranscriptRef.current += `${text.trim()} `;
        else interim += text;
      }
      const combined = `${finalLiveTranscriptRef.current}${interim}`.trim();
      liveTranscriptRef.current = combined;
      setLiveTranscript(combined);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setLiveSupported(false);
      }
    };
    recognition.onend = () => {
      if (!recordingRef.current) return;
      window.setTimeout(() => {
        if (!recordingRef.current) return;
        try {
          recognition.start();
        } catch {
          // El navegador puede seguir cerrando la sesion anterior.
        }
      }, 150);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setLiveSupported(false);
    }
  }

  function stopLiveRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch {
      recognition.abort();
    }
    recognitionRef.current = null;
  }

  async function transcribe(blob: Blob, filename: string) {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, filename);
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      const result = (await response.json()) as { transcript?: string; error?: string };
      const transcript = result.transcript;
      if (!response.ok || !transcript) {
        throw new Error(result.error ?? "No se pudo transcribir el audio.");
      }
      appendToNotes(transcript);
      toast.success("Nota de voz transcrita");
    } catch (error) {
      const fallback = liveTranscriptRef.current.trim();
      if (fallback) {
        appendToNotes(fallback);
        toast.warning("Se uso la transcripcion provisional", {
          description: "Groq no respondio, pero conservamos el texto reconocido en vivo.",
        });
      } else {
        toast.error("No se pudo transcribir", {
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error("Tu navegador no permite grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      streamRef.current = stream;
      setAudioStream(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setAudioStream(null);
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) void transcribe(blob, "nota-de-voz.webm");
      };
      recorderRef.current = recorder;
      recordingRef.current = true;
      startLiveRecognition();
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("No se pudo acceder al microfono.");
    }
  }

  function stopRecording() {
    recordingRef.current = false;
    stopLiveRecognition();
    recorderRef.current?.stop();
  }

  function handleAudioFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    liveTranscriptRef.current = "";
    setLiveTranscript("");
    void transcribe(file, file.name);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const note = notes.trim();
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
        setNotes("");
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
        <Label htmlFor="idea-note" className="font-heading text-base font-medium">
          Nueva idea de contenido
        </Label>
      </div>
      <div className="relative mt-4">
        <Textarea
          id="idea-note"
          value={notes}
          onChange={(event) => setNotes(event.target.value.slice(0, NOTE_LIMIT))}
          placeholder="Escribe la idea como te salga: angulo, ejemplos, referencias, una pregunta o un borrador completo..."
          aria-label="Nota de la idea"
          rows={7}
          maxLength={NOTE_LIMIT}
          className="min-h-44 resize-y pr-3 pb-7"
        />
        <span className="pointer-events-none absolute right-3 bottom-2 font-mono text-xs text-muted-foreground">
          {notes.length.toLocaleString("es-CO")} / {NOTE_LIMIT.toLocaleString("es-CO")}
        </span>
      </div>
      {recording || transcribing ? (
        <VoiceRecordingPanel
          stream={audioStream}
          recording={recording}
          liveTranscript={liveTranscript}
          liveSupported={liveSupported}
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
            variant="outline"
            size="sm"
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
          >
            {recording ? <Square className="fill-current" /> : <Mic />}
            {recording ? "Detener" : "Grabar nota"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("idea-audio-file")?.click()}
            disabled={recording || transcribing}
          >
            {transcribing ? <LoaderCircle className="animate-spin" /> : <FileAudio />}
            {transcribing ? "Transcribiendo..." : "Subir audio"}
          </Button>
          <Button type="submit" disabled={pending || transcribing}>
            {pending ? "Guardando..." : "Guardar idea"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default IdeaQuickCapture;
