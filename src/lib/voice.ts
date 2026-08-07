"use client";

import { useSyncExternalStore } from "react";

export type VoiceState = "idle" | "listening" | "transcribing" | "error";

export const VOICE_TRANSCRIPT_EVENT = "agent-os-voice-transcript";

let voiceState: VoiceState = "idle";
const listeners = new Set<() => void>();

function emit(state: VoiceState) {
  voiceState = state;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVoiceState() {
  return useSyncExternalStore(subscribe, () => voiceState, () => "idle" as VoiceState);
}

export async function startVoiceCapture(target: string) {
  if (voiceState !== "idle") return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
    const stopped = new Promise<void>((resolve) => recorder.addEventListener("stop", () => resolve(), { once: true }));
    emit("listening");
    recorder.start();
    await new Promise((resolve) => window.setTimeout(resolve, 2400));
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    emit("transcribing");
    const form = new FormData();
    form.set("audio", new File([new Blob(chunks, { type: recorder.mimeType })], "capture.webm", { type: recorder.mimeType }));
    const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
    if (!response.ok) throw new Error("Transcription failed.");
    const result = await response.json() as { text: string };
    emit("idle");
    window.dispatchEvent(new CustomEvent(VOICE_TRANSCRIPT_EVENT, { detail: { target, text: result.text } }));
  } catch {
    emit("error");
  }
}

export function simulateVoiceError() {
  emit("error");
  window.setTimeout(() => emit("idle"), 2200);
}

export async function speakText(text: string) {
  const response = await fetch("/api/voice/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
  if (!response.ok) return false;
  const url = URL.createObjectURL(await response.blob());
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
  return true;
}