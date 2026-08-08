"use client";

import { useSyncExternalStore } from "react";

export type VoiceState = "idle" | "listening" | "transcribing" | "error";

export const VOICE_TRANSCRIPT_EVENT = "agent-os-voice-transcript";

const voiceStates = new Map<string, VoiceState>();
let captureOwner: string | null = null;
const listeners = new Set<() => void>();

function emit(projectId: string, state: VoiceState) {
  voiceStates.set(projectId, state);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVoiceState(projectId: string) {
  return useSyncExternalStore(subscribe, () => voiceStates.get(projectId) ?? "idle", () => "idle" as VoiceState);
}

export async function startVoiceCapture(target: string, requestedProjectId?: string) {
  const projectId = requestedProjectId ?? window.localStorage.getItem("agent-os-project") ?? "";
  if (!projectId || captureOwner) return;
  captureOwner = projectId;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
    const stopped = new Promise<void>((resolve) => recorder.addEventListener("stop", () => resolve(), { once: true }));
    emit(projectId, "listening");
    recorder.start();
    await new Promise((resolve) => window.setTimeout(resolve, 2400));
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());
    emit(projectId, "transcribing");
    const form = new FormData();
    form.set("projectId", projectId);
    form.set("audio", new File([new Blob(chunks, { type: recorder.mimeType })], "capture.webm", { type: recorder.mimeType }));
    const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
    if (!response.ok) throw new Error("Transcription failed.");
    const result = await response.json() as { text: string };
    captureOwner = null;
    emit(projectId, "idle");
    window.dispatchEvent(new CustomEvent(VOICE_TRANSCRIPT_EVENT, { detail: { projectId, target, text: result.text } }));
  } catch {
    captureOwner = null;
    emit(projectId, "error");
    window.setTimeout(() => emit(projectId, "idle"), 2200);
  }
}

export function simulateVoiceError(projectId: string) {
  emit(projectId, "error");
  window.setTimeout(() => emit(projectId, "idle"), 2200);
}

export async function speakText(text: string, projectId: string) {
  const response = await fetch("/api/voice/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, projectId }) });
  if (!response.ok) return false;
  const url = URL.createObjectURL(await response.blob());
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  await audio.play();
  return true;
}