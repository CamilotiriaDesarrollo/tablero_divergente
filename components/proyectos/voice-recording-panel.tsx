"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

interface VoiceRecordingPanelProps {
  stream: MediaStream | null;
  recording: boolean;
  liveTranscript: string;
  liveSupported: boolean;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export function VoiceRecordingPanel({
  stream,
  recording,
  liveTranscript,
  liveSupported,
}: VoiceRecordingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transcriptRef = useRef<HTMLParagraphElement | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [liveTranscript]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !recording) return;

    const AudioContextClass = window.AudioContext;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);

    const samples = new Uint8Array(analyser.frequencyBinCount);
    let animationFrame = 0;

    function draw() {
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const ratio = window.devicePixelRatio || 1;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(bounds.width * ratio));
      const height = Math.max(1, Math.floor(bounds.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      analyser.getByteTimeDomainData(samples);
      context.clearRect(0, 0, width, height);
      context.lineWidth = 2 * ratio;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = getComputedStyle(canvas).color;
      context.beginPath();

      const step = width / Math.max(1, samples.length - 1);
      for (let index = 0; index < samples.length; index += 1) {
        const x = index * step;
        const y = (samples[index] / 255) * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      animationFrame = window.requestAnimationFrame(draw);
    }

    void audioContext.resume();
    draw();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
    };
  }, [recording, stream]);

  return (
    <div
      className="mt-3 overflow-hidden rounded-lg border border-primary/30 bg-primary/5"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 border-b border-primary/15 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {recording ? (
            <>
              <span className="relative flex size-2.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
              </span>
              Grabando
            </>
          ) : (
            <>
              <LoaderCircle className="size-4 animate-spin text-primary" />
              Transcribiendo con Groq
            </>
          )}
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatDuration(seconds)}
        </span>
      </div>

      {recording ? (
        <canvas
          ref={canvasRef}
          className="block h-16 w-full text-primary"
          aria-label="Onda de audio en tiempo real"
        />
      ) : (
        <div className="h-2 w-full overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      )}

      <p
        ref={transcriptRef}
        className="max-h-24 min-h-12 overflow-y-auto border-t border-primary/15 px-3 py-2 text-sm leading-relaxed"
      >
        {liveTranscript ||
          (liveSupported
            ? "Escuchando... la transcripcion provisional aparecera aqui."
            : "La transcripcion aparecera cuando detengas la grabacion.")}
      </p>
      {recording && liveSupported ? (
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          Vista provisional. Groq corregira el texto al detener.
        </p>
      ) : null}
    </div>
  );
}
