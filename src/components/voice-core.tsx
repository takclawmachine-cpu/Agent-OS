"use client";

import { useEffect } from "react";

import { Icon } from "@/components/icon";
import { useReliability } from "@/components/reliability-provider";
import { startVoiceCapture, useVoiceState } from "@/lib/voice";

export function VoiceCore({ target = "dashboard" }: { target?: string }) {
  const state = useVoiceState();
  const { online } = useReliability();

  useEffect(() => {
    document.body.dataset.voiceState = state;
  }, [state]);

  const label = !online ? "Voice offline" : state === "idle" ? "Ask Hermes" : state === "listening" ? "Listening" : state === "transcribing" ? "Transcribing" : "Voice unavailable";

  return (
    <div className="voice-stage">
      <div className="voice-orbit voice-orbit--outer" />
      <div className="voice-orbit voice-orbit--inner" />
      <button className={`voice-core voice-core--${state}`} type="button" onClick={() => startVoiceCapture(target)} aria-label={label} disabled={!online}>
        <span className="voice-core__halo" />
        <span className="voice-core__button"><Icon name="microphone" size={30} /></span>
      </button>
      <div className={`voice-wave voice-wave--${state}`} aria-hidden="true">
        {Array.from({ length: 19 }, (_, index) => <span key={index} />)}
      </div>
      <strong className="voice-label">{label}</strong>
      <span className="voice-hint">Voice channel / Hermes local</span>
    </div>
  );
}
