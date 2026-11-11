"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askForNotifications, createAlarm, notify, type Alarm } from "@/lib/alarm";
import { cookingModeMessages as m } from "@/lib/messages";

/** En tidtaker som er startet fra et steg i kokemodus (Story 6.5). */
export type StepTimer = {
  id: number;
  /** Stegnummeret (fra 1) tidtakeren ble startet fra. */
  step: number;
  /** Lengden i sekunder, medregnet tid som er lagt til underveis. */
  seconds: number;
  /** Klokkeslettet (ms) tidtakeren går ut. Nedtellingen regnes fra dette, ikke fra tikkene. */
  endsAt: number;
};

/** Signalet gjentas hvert tredje sekund til beskjeden lukkes, men ikke lenger enn ett halvt minutt. */
const REPEAT_MS = 3000;
const MAX_REPEATS = 10;

/**
 * Tidtakere i kokemodus: flere kan gå samtidig. Nedtellingen regnes fra sluttidspunktet, så den
 * er riktig også når nettleseren bremser tikkene mens siden er skjult. Når tiden er ute, piper det
 * og vibrerer (gjentatt til beskjeden lukkes), systemet viser et varsel hvis det er tillatt, og
 * fanetittelen blinker med «Tiden er ute».
 */
export function useStepTimers() {
  const [timers, setTimers] = useState<readonly StepTimer[]>([]);
  /** Om nettleseren tok imot siste lydsignal: `null` før noe er spilt. */
  const [soundOk, setSoundOk] = useState<boolean | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const nextId = useRef(1);
  const alarm = useRef<Alarm | null>(null);
  const rung = useRef<Set<number>>(new Set());

  const play = useCallback(async () => {
    const ok = (await alarm.current?.ring()) ?? false;
    setSoundOk(ok);
    return ok;
  }, []);

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

  const finished = timers.filter((timer) => timer.endsAt <= now);
  const finishedKey = finished.map((timer) => timer.id).join(",");

  // Første signal, én gang per tidtaker (og på nytt hvis det er lagt til tid og den går ut igjen).
  useEffect(() => {
    const due = timers.filter((timer) => timer.endsAt <= now && !rung.current.has(timer.id));
    if (due.length === 0) return;
    for (const timer of due) rung.current.add(timer.id);
    void play();
    notify(m.timerFinished(due[0].step), m.timerNotificationBody);
  }, [timers, now, play]);

  // Gjentar signalet mens en beskjed står åpen.
  useEffect(() => {
    if (finishedKey === "") return;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      if (count > MAX_REPEATS) clearInterval(interval);
      else void play();
    }, REPEAT_MS);
    return () => clearInterval(interval);
  }, [finishedKey, play]);

  // Fanetittelen forteller at tiden er ute også når en annen fane eller et annet vindu er foran.
  useEffect(() => {
    if (finishedKey === "") return;
    const original = document.title;
    document.title = `⏰ ${m.timerTitle} – ${original}`;
    return () => {
      document.title = original;
    };
  }, [finishedKey]);

  useEffect(
    () => () => {
      alarm.current?.close();
      alarm.current = null;
    },
    [],
  );

  const start = useCallback((step: number, seconds: number) => {
    // Lyd og varsler må låses opp i selve klikket.
    alarm.current ??= createAlarm();
    alarm.current.unlock();
    askForNotifications();
    const at = Date.now();
    setNow(at);
    setTimers((previous) => [
      ...previous,
      { id: nextId.current++, step, seconds, endsAt: at + seconds * 1000 },
    ]);
  }, []);

  /**
   * Legger til (positivt) eller trekker fra (negativt) tid. En tidtaker som er ute starter på nytt
   * fra nå; en som går kan ikke trekkes under ett sekund igjen.
   */
  const adjust = useCallback((id: number, deltaSeconds: number) => {
    const at = Date.now();
    setNow(at);
    if (deltaSeconds > 0) rung.current.delete(id);
    setTimers((previous) =>
      previous.map((timer) => {
        if (timer.id !== id) return timer;
        const left = timer.endsAt - at;
        if (left <= 0) {
          return deltaSeconds > 0
            ? { ...timer, endsAt: at + deltaSeconds * 1000, seconds: timer.seconds + deltaSeconds }
            : timer;
        }
        if (deltaSeconds < 0 && left <= -deltaSeconds * 1000) return timer;
        return {
          ...timer,
          endsAt: timer.endsAt + deltaSeconds * 1000,
          seconds: Math.max(1, timer.seconds + deltaSeconds),
        };
      }),
    );
  }, []);

  /** «Test lyden»: spiller signalet nå, så Ida kan sjekke at hun hører det før hun trenger det. */
  const testSound = useCallback(() => {
    alarm.current ??= createAlarm();
    alarm.current.unlock();
    askForNotifications();
    // Lydkonteksten kan trenge et øyeblikk på å komme i gang etter klikket.
    setTimeout(() => void play(), 150);
  }, [play]);

  const remove = useCallback((id: number) => {
    rung.current.delete(id);
    setTimers((previous) => previous.filter((timer) => timer.id !== id));
  }, []);

  return { timers, now, soundOk, start, adjust, remove, testSound };
}
