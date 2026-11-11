"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  convertLine,
  findStepDurations,
  formatCountdown,
  formatLine,
  formatTimerLabel,
  ingredientsForStep,
  scaleLine,
  type RecipeLine,
  type Step,
  type UnitSystem,
} from "@/domain";
import { cookingModeMessages as m } from "@/lib/messages";
import { isSelectedServings, validOriginalServings } from "@/lib/recipe-input";
import { useGetSelectedServings, useGetUnitSystem } from "./SelectedServings";
import { servingsText } from "./ServingStepper";
import StepText from "./StepText";
import { useStepTimers } from "./useStepTimers";
import styles from "./CookingMode.module.css";

type Props = {
  title: string;
  steps: readonly Step[];
  ingredients: readonly RecipeLine[];
  /** Antallet oppskriften er skrevet for; ugyldig eller `null` gir uskalerte mengder. */
  originalServings: number | null;
  /** Lagret valgt antall, brukt når ingenting er valgt på siden. */
  selectedServings: number | null;
};

/**
 * Kokemodus (Story 5.4): fullskjerms modal med ett steg om gangen i stor tekst, ingrediensene i
 * valgt antall og skjermen holdt våken. Innholdet monteres bare mens den er åpen, så steget
 * starter på 1 hver gang. Ingenting lagres.
 */
export default function CookingMode({
  title,
  steps,
  ingredients,
  originalServings,
  selectedServings,
}: Props) {
  const [open, setOpen] = useState(false);
  // Antallet som gjelder når kokemodus åpnes (frosset til den lukkes).
  const [servings, setServings] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const getPicked = useGetSelectedServings();
  const getUnits = useGetUnitSystem();
  // Målsystemet som gjaldt da kokemodus ble åpnet.
  const [units, setUnits] = useState<UnitSystem>("original");
  const original = validOriginalServings(originalServings);

  function openMode() {
    setUnits(getUnits());
    if (original === null) {
      setServings(null);
    } else {
      const picked = getPicked();
      setServings(
        isSelectedServings(picked)
          ? picked
          : isSelectedServings(selectedServings)
            ? selectedServings
            : original,
      );
    }
    setOpen(true);
  }
  function closeMode() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Modal åpnes og lukkes i takt med `open`. Opprydningen lukker også dialogen hvis siden skjules
  // av `<Activity>` eller komponenten avmonteres, så resten av dokumentet ikke blir stående utilgjengelig.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("button")?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  // Skjermen holdes våken mens kokemodus er åpen. Mangler støtte eller avvises den, gjør vi ingenting.
  useEffect(() => {
    if (!open || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        await sentinel?.release();
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) await next.release();
        else sentinel = next;
      } catch {
        // Ikke støttet, avvist (for eksempel lavt batteri) eller allerede sluppet: kokemodus virker uansett.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => undefined);
    };
  }, [open]);

  if (steps.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.open}
        aria-label={`${m.openLabel}: ${title}`}
        onClick={openMode}
      >
        {m.open}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={`${m.open}: ${title}`}
        onCancel={(event) => {
          event.preventDefault();
          closeMode();
        }}
      >
        {open ? (
          <Session
            title={title}
            steps={steps}
            ingredients={ingredients}
            factor={original !== null && servings !== null ? servings / original : 1}
            servings={original !== null ? servings : null}
            units={units}
            onExit={closeMode}
          />
        ) : null}
      </dialog>
    </>
  );
}

function Session({
  title,
  steps,
  ingredients,
  factor,
  servings,
  units,
  onExit,
}: {
  title: string;
  steps: readonly Step[];
  ingredients: readonly RecipeLine[];
  factor: number;
  servings: number | null;
  units: UnitSystem;
  onExit: () => void;
}) {
  const sorted = [...steps].sort((a, b) => a.position - b.position);
  const [index, setIndex] = useState(0);
  const last = index === sorted.length - 1;
  const lines = [...ingredients].sort((a, b) => a.position - b.position);
  const current = sorted[index];
  // Forslag som er flettet inn i steget teller med, så for eksempel vaniljesukker vises her også.
  const stepLines = ingredientsForStep(
    [...(current.addedBefore ?? []), current.text, ...(current.addedAfter ?? [])].join(" "),
    lines,
  );

  // Tider nevnt i steget (også i forslag som er flettet inn) blir knapper for tidtaker.
  const stepText = [
    ...(current.addedBefore ?? []),
    current.text,
    ...(current.addedAfter ?? []),
  ].join(" ");
  const durations = findStepDurations(stepText);
  const { timers, now, soundOk, start, adjust, remove, testSound } = useStepTimers();

  function previous() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function next() {
    if (last) onExit();
    else setIndex((i) => i + 1);
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Piltastene styrer stegene, men ikke mens brukeren bruker et skjemaelement (her: ingen) eller bruker modifikator.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    }
  }

  return (
    <div className={styles.session} onKeyDown={onKeyDown}>
      <header className={styles.top}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.exit} aria-label={m.exitLabel} onClick={onExit}>
          {m.exit}
        </button>
      </header>

      <p className={styles.progressText}>{m.progress(index + 1, sorted.length)}</p>
      <progress
        className={styles.progress}
        value={index + 1}
        max={sorted.length}
        aria-label={m.progress(index + 1, sorted.length)}
      />

      {timers.length > 0 ? (
        <section className={styles.timers} aria-label={m.timersLabel}>
          {timers.map((timer) => {
            const label = formatTimerLabel(timer.seconds);
            const left = (timer.endsAt - now) / 1000;
            const running = left > 0;
            return (
              <div
                key={timer.id}
                className={`${styles.timer} ${running ? "" : styles.timerDone}`}
                role={running ? undefined : "alert"}
              >
                <p className={styles.timerFor}>
                  {running ? m.timerFor(timer.step, label) : m.timerFinished(timer.step)}
                </p>
                {!running && soundOk === false ? (
                  <p className={styles.soundWarning}>{m.soundBlocked}</p>
                ) : null}
                {running ? (
                  <p role="timer" className={styles.countdown}>
                    {formatCountdown(left)}
                  </p>
                ) : null}
                <div className={styles.timerActions}>
                  {running ? (
                    <button
                      type="button"
                      className={styles.timerButton}
                      aria-label={m.timerSubtractLabel(timer.step, 1)}
                      aria-disabled={left <= 60 ? true : undefined}
                      onClick={() => adjust(timer.id, -60)}
                    >
                      {m.timerSubtract(1)}
                    </button>
                  ) : null}
                  {[1, 5].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className={styles.timerButton}
                      aria-label={m.timerAddLabel(timer.step, minutes)}
                      onClick={() => adjust(timer.id, minutes * 60)}
                    >
                      {m.timerAdd(minutes)}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.timerButton} ${styles.timerEnd}`}
                    aria-label={
                      running
                        ? m.timerCancelLabel(timer.step, label)
                        : m.timerDismissLabel(timer.step)
                    }
                    onClick={() => remove(timer.id)}
                  >
                    {running ? m.timerCancel : m.timerDismiss}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <div className={styles.stepArea}>
        <p className={styles.step} aria-live="polite">
          <StepText step={sorted[index]} />
        </p>
        {durations.length > 0 ? (
          <ul role="list" className={styles.starts}>
            {durations.map((duration) => {
              const label = formatTimerLabel(duration.seconds);
              const going = timers.some(
                (timer) =>
                  timer.step === index + 1 &&
                  timer.seconds === duration.seconds &&
                  timer.endsAt > now,
              );
              return (
                <li key={duration.seconds}>
                  <button
                    type="button"
                    className={styles.startTimer}
                    aria-disabled={going ? true : undefined}
                    onClick={() => {
                      if (!going) start(index + 1, duration.seconds);
                    }}
                  >
                    {m.timerStart(label)}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {stepLines.length > 0 ? (
          <section className={styles.stepIngredients} aria-labelledby="kokemodus-i-steget">
            <h3 id="kokemodus-i-steget" className={styles.stepIngredientsTitle}>
              {m.inThisStep}
            </h3>
            <ul role="list" className={styles.stepLines}>
              {stepLines.map((line) => (
                <li key={line.id}>{formatLine(convertLine(scaleLine(line, factor), units))}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className={styles.soundTest}>
        <button type="button" className={styles.soundTestButton} onClick={testSound}>
          {m.soundTest}
        </button>
        <span role="status" className={styles.soundStatus}>
          {soundOk === true ? m.soundTestPlayed : soundOk === false ? m.soundBlocked : ""}
        </span>
      </div>

      <details className={styles.ingredients}>
        <summary>
          {servings === null ? m.ingredients : m.ingredientsFor(servingsText(servings))}
        </summary>
        <ul role="list" className={styles.lines}>
          {lines.map((line) => (
            <li key={line.id}>{formatLine(convertLine(scaleLine(line, factor), units))}</li>
          ))}
        </ul>
      </details>

      <nav className={styles.nav}>
        <button
          type="button"
          className={styles.secondary}
          aria-disabled={index === 0 ? true : undefined}
          onClick={previous}
        >
          {m.previous}
        </button>
        <button type="button" className={styles.primary} onClick={next}>
          {last ? m.done : m.next}
        </button>
      </nav>
    </div>
  );
}
