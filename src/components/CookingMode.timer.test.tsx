// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Step } from "@/domain";
import CookingMode from "./CookingMode";

const oscillators = vi.hoisted(() => ({
  started: 0,
  closed: 0,
  state: "running",
  htmlPlays: 0,
  notifications: [] as string[],
}));
class FakeAudio {
  volume = 1;
  currentTime = 0;
  play() {
    // Det stille forsøket i klikket (volum 0) er ikke et signal.
    if (this.volume > 0) oscillators.htmlPlays += 1;
    return Promise.resolve();
  }
  pause() {}
}
class FakeNotification {
  static permission = "granted";
  static requestPermission = vi.fn(() => Promise.resolve("granted"));
  constructor(title: string) {
    oscillators.notifications.push(title);
  }
}
class FakeAudioContext {
  currentTime = 0;
  get state() {
    return oscillators.state;
  }
  destination = {};
  resume = () => Promise.resolve();
  close = () => {
    oscillators.closed += 1;
    return Promise.resolve();
  };
  createGain() {
    const param = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    return { gain: param, connect: (next: unknown) => next };
  }
  createOscillator() {
    return {
      frequency: { value: 0 },
      connect: (next: unknown) => next,
      start: () => {
        oscillators.started += 1;
      },
      stop: () => undefined,
    };
  }
}

const vibrate = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  oscillators.started = 0;
  oscillators.closed = 0;
  oscillators.state = "running";
  oscillators.htmlPlays = 0;
  oscillators.notifications = [];
  FakeNotification.permission = "granted";
  FakeNotification.requestPermission.mockClear();
  document.title = "Pannekaker";
  vibrate.mockClear();
  Object.defineProperty(window, "Audio", { value: FakeAudio, configurable: true });
  Object.defineProperty(window, "Notification", { value: FakeNotification, configurable: true });
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
  Object.defineProperty(window, "AudioContext", { value: FakeAudioContext, configurable: true });
  Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(window, "AudioContext");
  Reflect.deleteProperty(window, "Audio");
  Reflect.deleteProperty(window, "Notification");
  Reflect.deleteProperty(navigator, "vibrate");
});

const steps: Step[] = [
  { id: 1, position: 1, section: null, text: "Visp sammen mel og melk." },
  { id: 2, position: 2, section: null, text: "Stek i 2 minutter, og la hvile i 30 sekunder." },
  { id: 3, position: 3, section: null, text: "Stek 2 min på hver side." },
];

function setup() {
  render(
    <CookingMode
      title="Pannekaker"
      steps={steps}
      ingredients={[]}
      originalServings={4}
      selectedServings={null}
    />,
  );
  // userEvent går ikke sammen med falske timere; fireEvent er synkron og nok her.
  return { click: (element: HTMLElement) => act(() => void fireEvent.click(element)) };
}
type User = ReturnType<typeof setup>;
const open = (user: User) => {
  user.click(screen.getByRole("button", { name: "Åpne kokemodus: Pannekaker" }));
  return screen.getByRole("dialog", { name: "Kokemodus: Pannekaker", hidden: true });
};
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("tidtaker i kokemodus", () => {
  it("viser ingen tidtaker-knapper når steget ikke nevner en tid", () => {
    const user = setup();
    const dialog = open(user);
    expect(within(dialog).queryByRole("button", { name: /^Start tidtaker/ })).toBeNull();
    expect(within(dialog).queryByRole("region", { name: "Tidtakere" })).toBeNull();
  });

  it("gir en knapp per tid i steget, og teller ned fra den valgte tiden", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    const buttons = within(dialog).getAllByRole("button", { name: /^Start tidtaker/ });
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Start tidtaker: 2 min",
      "Start tidtaker: 30 sek",
    ]);
    user.click(buttons[0]);
    const timers = within(dialog).getByRole("region", { name: "Tidtakere" });
    expect(timers).toHaveTextContent("Steg 2 · 2 min");
    expect(within(timers).getByRole("timer")).toHaveTextContent("2:00");
    advance(61_000);
    expect(within(timers).getByRole("timer")).toHaveTextContent("0:59");
  });

  it("kan ikke starte samme tid to ganger i samme steg, men flere tidtakere går samtidig", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    const [two, thirty] = within(dialog).getAllByRole("button", { name: /^Start tidtaker/ });
    user.click(two);
    expect(two).toHaveAttribute("aria-disabled", "true");
    user.click(two);
    user.click(thirty);
    expect(within(dialog).getAllByRole("timer")).toHaveLength(2);
  });

  it("holder tidtakeren gående når man bytter steg, og samme tid i et annet steg er en egen", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[0]);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    expect(within(dialog).getByRole("timer")).toHaveTextContent("2:00");
    const again = within(dialog).getByRole("button", { name: "Start tidtaker: 2 min" });
    expect(again).not.toHaveAttribute("aria-disabled");
    user.click(again);
    expect(within(dialog).getAllByRole("timer")).toHaveLength(2);
  });

  it("avbryter en tidtaker", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[0]);
    user.click(within(dialog).getByRole("button", { name: "Avbryt tidtaker for steg 2 (2 min)" }));
    expect(within(dialog).queryByRole("timer")).toBeNull();
    expect(within(dialog).queryByRole("region", { name: "Tidtakere" })).toBeNull();
    advance(200_000);
    expect(oscillators.started).toBe(0);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("varsler når tiden er ute: beskjed, pip, vibrasjon, varsel og fanetittel, og kan lukkes", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[1]);
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled(); // allerede tillatt
    advance(29_000);
    expect(within(dialog).queryByRole("alert")).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
    advance(2_000);
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Tiden er ute for steg 2");
    expect(within(dialog).queryByRole("timer")).toBeNull();
    expect(oscillators.started).toBe(4);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(oscillators.notifications).toEqual(["Tiden er ute for steg 2"]);
    expect(document.title).toBe("⏰ Tiden er ute – Pannekaker");

    // Signalet gjentas hvert tredje sekund mens beskjeden står, men varselet kommer bare én gang.
    advance(3_000);
    expect(oscillators.started).toBe(8);
    expect(vibrate).toHaveBeenCalledTimes(2);
    expect(oscillators.notifications).toHaveLength(1);

    user.click(within(dialog).getByRole("button", { name: "Lukk beskjeden om steg 2" }));
    expect(within(dialog).queryByRole("alert")).toBeNull();
    expect(document.title).toBe("Pannekaker");
    advance(30_000);
    expect(oscillators.started).toBe(8);
  });

  it("slutter å gjenta signalet etter ti ganger", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[1]);
    advance(31_000);
    advance(120_000);
    // Ett første signal og ti gjentakelser, ikke flere.
    expect(oscillators.started).toBe(4 * 11);
  });

  it("ber om lov til å vise varsler første gang, og bruker lyd fra <audio> når Web Audio ikke er klar", () => {
    FakeNotification.permission = "default";
    oscillators.state = "suspended";
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[1]);
    expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1);
    advance(31_000);
    expect(oscillators.started).toBe(0);
    expect(oscillators.htmlPlays).toBe(1);
    expect(oscillators.notifications).toEqual([]); // ikke tillatt: ingen varsel
    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
  });

  it("legger til og trekker fra tid på en tidtaker som går", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[0]);
    const countdown = () => within(dialog).getByRole("timer");
    expect(countdown()).toHaveTextContent("2:00");
    user.click(
      within(dialog).getByRole("button", { name: /^Legg til 5 minutter på tidtakeren for steg 2/ }),
    );
    expect(countdown()).toHaveTextContent("7:00");
    user.click(
      within(dialog).getByRole("button", { name: /^Legg til 1 minutt på tidtakeren for steg 2/ }),
    );
    expect(countdown()).toHaveTextContent("8:00");
    const minus = within(dialog).getByRole("button", { name: /^Trekk fra 1 minutt/ });
    user.click(minus);
    expect(countdown()).toHaveTextContent("7:00");
    // Etiketten følger den nye lengden.
    expect(within(dialog).getByRole("region", { name: "Tidtakere" })).toHaveTextContent(
      "Steg 2 · 7 min",
    );
    advance(7 * 60_000 - 30_000);
    expect(minus).toHaveAttribute("aria-disabled", "true");
    user.click(minus);
    expect(countdown()).toHaveTextContent("0:30");
  });

  it("starter tidtakeren på nytt fra nå når det legges til tid etter at den er ute", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[1]);
    advance(31_000);
    expect(oscillators.started).toBe(4);
    expect(within(dialog).queryByRole("button", { name: /^Trekk fra/ })).toBeNull();
    user.click(
      within(dialog).getByRole("button", { name: /^Legg til 1 minutt på tidtakeren for steg 2/ }),
    );
    expect(within(dialog).queryByRole("alert")).toBeNull();
    expect(within(dialog).getByRole("timer")).toHaveTextContent("1:00");
    expect(document.title).toBe("Pannekaker");
    advance(30_000);
    expect(oscillators.started).toBe(4);
    advance(31_000);
    expect(within(dialog).getByRole("alert")).toBeInTheDocument();
    expect(oscillators.started).toBe(8);
  });

  it("fungerer uten lyd og vibrasjon", () => {
    Reflect.deleteProperty(window, "AudioContext");
    Reflect.deleteProperty(navigator, "vibrate");
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[1]);
    advance(31_000);
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Tiden er ute for steg 2");
  });

  it("stopper tidtakerne og lukker lyden når kokemodus avsluttes", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[1]);
    user.click(within(dialog).getByRole("button", { name: "Avslutt kokemodus" }));
    expect(oscillators.closed).toBe(1);
    advance(60_000);
    expect(oscillators.started).toBe(0);
    const again = open(user);
    user.click(within(again).getByRole("button", { name: "Neste" }));
    expect(within(again).queryByRole("timer")).toBeNull();
  });
});
