// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { servingStepperMessages } from "@/lib/messages";
import ServingStepper, { parseServings, servingsText } from "./ServingStepper";

afterEach(cleanup);

function Harness({ start, original, spy }: { start: number; original: number; spy?: () => void }) {
  const [value, setValue] = useState(start);
  return (
    <ServingStepper
      value={value}
      original={original}
      onChange={(next) => {
        spy?.();
        setValue(next);
      }}
    />
  );
}

function HalfHarness({ start, original }: { start: number; original: number }) {
  const [value, setValue] = useState(start);
  return <ServingStepper allowHalf value={value} original={original} onChange={setValue} />;
}

const field = () => screen.getByLabelText("Antall personer");
const minus = () => screen.getByRole("button", { name: "Færre personer" });
const plus = () => screen.getByRole("button", { name: "Flere personer" });

describe("ServingStepper", () => {
  it("viser etikett, antall, «oppr. N» og ingen tilbakestilling ved opprinnelig antall", () => {
    render(<Harness start={4} original={4} />);
    expect(field()).toHaveValue("4");
    expect(screen.getByText("oppr. 4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("4 personer");
  });

  it("+ øker med 1 og annonserer nytt antall", async () => {
    const user = userEvent.setup();
    render(<Harness start={4} original={4} />);
    await user.click(plus());
    expect(field()).toHaveValue("5");
    expect(screen.getByRole("status")).toHaveTextContent("5 personer");
    expect(screen.getByRole("button", { name: "Tilbakestill til 4" })).toBeInTheDocument();
  });

  it("− er aria-disabled ved 1, + ved 50, uten disabled", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness start={2} original={4} />);
    await user.click(minus());
    expect(field()).toHaveValue("1");
    expect(minus()).toHaveAttribute("aria-disabled", "true");
    expect(minus()).not.toBeDisabled();
    expect(plus()).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("status")).toHaveTextContent("1 person");
    unmount();

    render(<Harness start={50} original={4} />);
    expect(plus()).toHaveAttribute("aria-disabled", "true");
    expect(plus()).not.toBeDisabled();
    expect(minus()).not.toHaveAttribute("aria-disabled");
  });

  it("Grense 1: fokus blir på − etter klikk og Enter/mellomrom, og antallet er uendret", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness start={2} original={4} spy={spy} />);
    await user.click(minus());
    expect(spy).toHaveBeenCalledTimes(1);

    minus().focus();
    expect(minus()).toHaveFocus();
    await user.click(minus());
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(minus()).toHaveFocus();
    expect(field()).toHaveValue("1");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(minus()).toHaveAttribute("aria-disabled", "true");
  });

  it("Grense 50: klikk på + gjør ingenting og fokus blir på +", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness start={49} original={4} spy={spy} />);
    await user.click(plus());
    expect(field()).toHaveValue("50");
    await user.click(plus());
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(plus()).toHaveFocus();
    expect(field()).toHaveValue("50");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("klikk ved grensen rører ikke en feilmelding som vises", async () => {
    const user = userEvent.setup();
    render(<Harness start={1} original={4} />);
    await user.clear(field());
    await user.type(field(), "abc{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(minus());
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("annonserer ikke mens brukeren skriver, bare når verdien tas i bruk", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness start={4} original={4} spy={spy} />);
    await user.clear(field());
    await user.type(field(), "12");
    expect(screen.getByRole("status")).toHaveTextContent("4 personer");
    expect(spy).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("12 personer");
  });

  it.each(["0", "51", "2,5", "", "abc"])(
    "ugyldig «%s» gir melding og beholder forrige verdi",
    async (text) => {
      const user = userEvent.setup();
      const spy = vi.fn();
      render(<Harness start={6} original={4} spy={spy} />);
      await user.clear(field());
      if (text) await user.type(field(), text);
      await user.tab();

      expect(spy).not.toHaveBeenCalled();
      expect(field()).toHaveValue("6");
      expect(field()).toHaveAttribute("aria-invalid", "true");
      expect(field()).toHaveAccessibleDescription(servingStepperMessages.invalid);
    },
  );

  it("en gyldig verdi etter en feil fjerner meldingen", async () => {
    const user = userEvent.setup();
    render(<Harness start={4} original={4} />);
    await user.clear(field());
    await user.type(field(), "abc{Enter}");
    expect(screen.getByText(servingStepperMessages.invalid)).toBeInTheDocument();
    await user.clear(field());
    await user.type(field(), "3{Enter}");
    expect(screen.queryByText(servingStepperMessages.invalid)).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(field()).toHaveValue("3");
  });

  it("tilbakestilling setter opprinnelig antall og skjuler knappen", async () => {
    const user = userEvent.setup();
    render(<Harness start={8} original={4} />);
    await user.click(screen.getByRole("button", { name: "Tilbakestill til 4" }));
    expect(field()).toHaveValue("4");
    expect(screen.queryByRole("button", { name: /Tilbakestill/ })).not.toBeInTheDocument();
  });

  it.each([
    ["1", 1],
    [" 50 ", 50],
    ["07", 7],
    ["0", null],
    ["51", null],
    ["2,5", null],
    ["2.5", null],
    ["-3", null],
    ["", null],
    ["abc", null],
  ])("parseServings(%j) = %s", (text, expected) => {
    expect(parseServings(text)).toBe(expected);
  });

  it("servingsText bruker entall for 1", () => {
    expect(servingsText(1)).toBe("1 person");
    expect(servingsText(2)).toBe("2 personer");
  });

  it("feilmeldingen er en live-region som leses opp etter at fokus har forlatt feltet", async () => {
    const user = userEvent.setup();
    render(<Harness start={4} original={4} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.clear(field());
    await user.type(field(), "0");
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent(servingStepperMessages.invalid);
  });

  describe("halve porsjoner (Story 5.1)", () => {
    const half = (pressed: boolean) =>
      screen.getByRole("button", {
        name: pressed ? servingStepperMessages.halfOff : servingStepperMessages.halfOn,
      });

    it.each([
      ["4,5", 4.5],
      ["4.5", 4.5],
      ["4,0", 4],
      ["1,5", 1.5],
      ["49,5", 49.5],
      ["50", 50],
      ["0,5", 0.5],
      ["0,4", null],
      ["0", null],
      ["50,5", null],
      ["4,3", null],
      ["4,55", null],
      ["abc", null],
    ])("parseServings(%j, allowHalf) = %s", (text, expected) => {
      expect(parseServings(text, true)).toBe(expected);
    });

    it("servingsText bruker komma", () => {
      expect(servingsText(4.5)).toBe("4,5 personer");
      expect(servingsText(1)).toBe("1 person");
    });

    it("«+ ½» legger til og fjerner en halv porsjon", async () => {
      const user = userEvent.setup();
      render(<HalfHarness start={4} original={4} />);
      await user.click(half(false));
      expect(field()).toHaveValue("4,5");
      expect(screen.getByRole("status")).toHaveTextContent("4,5 personer");
      expect(half(true)).toHaveAttribute("aria-pressed", "true");
      await user.click(half(true));
      expect(field()).toHaveValue("4");
    });

    it("− og + beholder halvdelen og stopper på 0,5 og 50", async () => {
      const user = userEvent.setup();
      render(<HalfHarness start={4.5} original={4} />);
      await user.click(plus());
      expect(field()).toHaveValue("5,5");
      await user.click(minus());
      await user.click(minus());
      await user.click(minus());
      await user.click(minus());
      expect(field()).toHaveValue("1,5");
      await user.click(minus());
      expect(field()).toHaveValue("0,5");
      expect(minus()).toHaveAttribute("aria-disabled", "true");
    });

    it("ved 50 er «+ ½» deaktivert, og 49,5 kan ikke økes forbi 50", async () => {
      const user = userEvent.setup();
      render(<HalfHarness start={50} original={4} />);
      expect(half(false)).toHaveAttribute("aria-disabled", "true");
      await user.click(half(false));
      expect(field()).toHaveValue("50");
    });

    it("skriv 6,5: godtas; skriv 6,3: melding om hele eller halve tall og forrige verdi", async () => {
      const user = userEvent.setup();
      render(<HalfHarness start={4} original={4} />);
      await user.clear(field());
      await user.type(field(), "6,5");
      await user.tab();
      expect(field()).toHaveValue("6,5");
      await user.clear(field());
      await user.type(field(), "6,3");
      await user.tab();
      expect(screen.getByRole("alert")).toHaveTextContent(servingStepperMessages.invalidHalf);
      expect(field()).toHaveValue("6,5");
    });

    it("uten allowHalf finnes ingen «+ ½»-knapp og komma avvises", async () => {
      const user = userEvent.setup();
      render(<Harness start={4} original={4} />);
      expect(screen.queryByRole("button", { name: servingStepperMessages.halfOn })).toBeNull();
      await user.clear(field());
      await user.type(field(), "4,5");
      await user.tab();
      expect(field()).toHaveValue("4");
    });
  });
});
