"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

interface VoiceTranscriptionOptions {
  onTranscript: (text: string) => void;
  successMessage?: string;
}

export function useVoiceTranscription({
  onTranscript,
  successMessage = "Audio transcrito",
}: VoiceTranscriptionOptions) {
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
  const mountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  const successMessageRef = useRef(successMessage);

  onTranscriptRef.current = onTranscript;
  successMessageRef.current = successMessage;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recordingRef.current = false;
      recognitionRef.current?.abort();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
      if (mountedRef.current) setLiveTranscript(combined);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        if (mountedRef.current) setLiveSupported(false);
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

  async function transcribeBlob(blob: Blob, filename: string) {
    if (mountedRef.current) setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, filename);
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      const result = (await response.json()) as { transcript?: string; error?: string };
      const transcript = result.transcript;
      if (!response.ok || !transcript) {
        throw new Error(result.error ?? "No se pudo transcribir el audio.");
      }
      onTranscriptRef.current(transcript);
      toast.success(successMessageRef.current);
    } catch (error) {
      const fallback = liveTranscriptRef.current.trim();
      if (fallback) {
        onTranscriptRef.current(fallback);
        toast.warning("Se uso la transcripcion provisional", {
          description: "Groq no respondio, pero conservamos el texto reconocido en vivo.",
        });
      } else {
        toast.error("No se pudo transcribir", {
          description: error instanceof Error ? error.message : "Intenta de nuevo.",
        });
      }
    } finally {
      if (mountedRef.current) setTranscribing(false);
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
        if (mountedRef.current) {
          setAudioStream(null);
          setRecording(false);
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) void transcribeBlob(blob, "nota-de-voz.webm");
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

  function transcribeFile(file: File) {
    liveTranscriptRef.current = "";
    setLiveTranscript("");
    return transcribeBlob(file, file.name);
  }

  return {
    recording,
    transcribing,
    audioStream,
    liveTranscript,
    liveSupported,
    startRecording,
    stopRecording,
    transcribeFile,
  };
}

