/**
 * Signal når en tidtaker er ute (Story 6.5): pip, varsel fra systemet og vibrasjon. Alt er
 * tillegg til beskjeden i siden, så hvert ledd feiler stille hvis nettleseren ikke støtter det.
 */

const SAMPLE_RATE = 8000;

/** En WAV med fire pip (880 Hz), som `<audio>`-reserve når Web Audio ikke er tilgjengelig. */
function beepWav(): string {
  const samples = Math.round(SAMPLE_RATE * 1.6);
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) =>
    [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i += 1) {
    const t = i / SAMPLE_RATE;
    const inBeep = t % 0.4 < 0.28;
    const envelope = inBeep ? Math.min(1, (t % 0.4) / 0.02, (0.28 - (t % 0.4)) / 0.04) : 0;
    view.setInt16(
      44 + i * 2,
      Math.round(Math.sin(2 * Math.PI * 880 * t) * envelope * 0.6 * 32767),
      true,
    );
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export type Alarm = {
  /** Må kalles fra en handling (klikk), siden nettlesere ellers nekter å spille lyd senere. */
  unlock: () => void;
  /** Spiller signalet: fire pip og vibrasjon. */
  ring: () => void;
  close: () => void;
};

export function createAlarm(): Alarm {
  let context: AudioContext | null = null;
  let element: HTMLAudioElement | null = null;

  function unlock() {
    try {
      if (!context && typeof window !== "undefined") {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) context = new Ctor();
      }
      void context?.resume?.();
    } catch {
      context = null;
    }
    try {
      if (!element && typeof Audio !== "undefined") {
        element = new Audio(beepWav());
        // Et stille avspillingsforsøk i selve klikket gjør at senere avspilling blir tillatt.
        element.volume = 0;
        const attempt = element.play() as Promise<void> | undefined;
        void attempt?.then(() => element?.pause()).catch(() => undefined);
      }
    } catch {
      element = null;
    }
  }

  function beepWithContext(ctx: AudioContext) {
    for (let i = 0; i < 4; i += 1) {
      const start = ctx.currentTime + i * 0.4;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.6, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    }
  }

  function ring() {
    let played = false;
    try {
      if (context) {
        void context.resume?.();
        if (context.state === "running") {
          beepWithContext(context);
          played = true;
        }
      }
    } catch {
      // Prøver reserven under.
    }
    if (!played) {
      try {
        if (element) {
          element.volume = 1;
          element.currentTime = 0;
          const attempt = element.play() as Promise<void> | undefined;
          void attempt?.catch(() => undefined);
        }
      } catch {
        // Ingen lyd mulig; beskjeden i siden er der uansett.
      }
    }
    try {
      navigator.vibrate?.([300, 150, 300, 150, 300]);
    } catch {
      // Ikke støttet.
    }
  }

  function close() {
    try {
      void context?.close().catch(() => undefined);
    } catch {
      // Allerede lukket.
    }
    context = null;
    element?.pause();
    element = null;
  }

  return { unlock, ring, close };
}

/** Ber om lov til å vise varsler, i et klikk. Svaret husker nettleseren. */
export function askForNotifications() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    // Ikke støttet.
  }
}

/** Viser et varsel fra systemet (på Mac: et banner med lyd), hvis brukeren har tillatt det. */
export function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, tag: "recipemate-tidtaker" });
    }
  } catch {
    // Enkelte mobilnettlesere godtar bare varsler via service worker.
  }
}
