"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** En tidtaker som er startet fra et steg i kokemodus (Story 6.5). */
export type StepTimer = {
  id: number;
  /** Stegnummeret (fra 1) tidtakeren ble startet fra. */
  step: number;
  seconds: number;
  /** Klokkeslettet (ms) tidtakeren går ut. Nedtellingen regnes fra dette, ikke fra tikkene. */
  endsAt: number;
};

type AudioContextCtor = typeof AudioContext;

/** Lydkontekst som lages i det brukeren trykker Start, siden nettlesere krever en handling først. */
function createAudio(): AudioContext | null {
  try {
    const Ctor: AudioContextCtor | undefined =
      typeof window === "undefined"
        ? undefined
        : (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);
    if (!Ctor) return null;
    const context = new Ctor();
    void context.resume?.();
    return context;
  } catch {
    return null;
  }
}

/** Fire pip og vibrasjon. Mangler støtte eller avvises det, vises tiden ute likevel i siden. */
function ring(context: AudioContext | null) {
  try {
    if (context) {
      void context.resume?.();
      for (let i = 0; i < 4; i += 1) {
        const start = context.currentTime + i * 0.4;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.3);
      }
    }
  } catch {
    // Lyd er et tillegg: ingen lyd er bedre enn en feil midt i matlagingen.
  }
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch {
    // Ikke støttet.
  }
}

/**
 * Tidtakere i kokemodus: flere kan gå samtidig. Nedtellingen regnes fra sluttidspunktet, så den
 * er riktig også når nettleseren bremser tikkene mens siden er skjult. Når tiden er ute, pipes det
 * (og telefonen vibrerer) én gang per tidtaker.
 */
export function useStepTimers() {
  const [timers, setTimers] = useState<readonly StepTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const nextId = useRef(1);
  const audio = useRef<AudioContext | null>(null);
  const rung = useRef<Set<number>>(new Set());

  const running = timers.some((timer) => timer.endsAt > now);
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);

  useEffect(() => {
    const due = timers.filter((timer) => timer.endsAt <= now && !rung.current.has(timer.id));
    if (due.length === 0) return;
    for (const timer of due) rung.current.add(timer.id);
    ring(audio.current);
  }, [timers, now]);

  useEffect(
    () => () => {
      void audio.current?.close().catch(() => undefined);
      audio.current = null;
    },
    [],
  );

  const start = useCallback((step: number, seconds: number) => {
    audio.current ??= createAudio();
    const at = Date.now();
    setNow(at);
    setTimers((previous) => [
      ...previous,
      { id: nextId.current++, step, seconds, endsAt: at + seconds * 1000 },
    ]);
  }, []);

  const remove = useCallback((id: number) => {
    setTimers((previous) => previous.filter((timer) => timer.id !== id));
  }, []);

  return { timers, now, start, remove };
}
