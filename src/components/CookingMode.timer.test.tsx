// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Step } from "@/domain";
import CookingMode from "./CookingMode";

const oscillators = vi.hoisted(() => ({ started: 0, closed: 0 }));
class FakeAudioContext {
  currentTime = 0;
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
  vibrate.mockClear();
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

  it("varsler når tiden er ute: beskjed, pip og vibrasjon bare én gang, og kan lukkes", () => {
    const user = setup();
    const dialog = open(user);
    user.click(within(dialog).getByRole("button", { name: "Neste" }));
    user.click(within(dialog).getAllByRole("button", { name: /^Start tidtaker/ })[1]);
    advance(29_000);
    expect(within(dialog).queryByRole("alert")).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
    advance(2_000);
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Tiden er ute for steg 2");
    expect(within(dialog).queryByRole("timer")).toBeNull();
    expect(oscillators.started).toBe(4);
    expect(vibrate).toHaveBeenCalledTimes(1);
    advance(10_000);
    expect(oscillators.started).toBe(4);
    expect(vibrate).toHaveBeenCalledTimes(1);
    user.click(within(dialog).getByRole("button", { name: "Lukk beskjeden om steg 2" }));
    expect(within(dialog).queryByRole("alert")).toBeNull();
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
