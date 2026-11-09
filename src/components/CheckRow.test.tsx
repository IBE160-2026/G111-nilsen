// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CheckRow from "./CheckRow";

afterEach(cleanup);

function Harness({ onToggle }: { onToggle?: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <ul>
      <CheckRow
        checked={checked}
        onToggle={() => {
          onToggle?.();
          setChecked((value) => !value);
        }}
      >
        <span>400 g</span> <span>mel</span>
      </CheckRow>
    </ul>
  );
}

const box = () => screen.getByRole("checkbox", { name: "400 g mel" });

describe("CheckRow", () => {
  it("er en <label> som omslutter en ekte avkrysningsboks, med radens tekst som navn", () => {
    render(<Harness />);
    expect(box()).toBeInTheDocument();
    expect(box().tagName).toBe("INPUT");
    expect(box()).toHaveAttribute("type", "checkbox");
    expect(box()).not.toBeChecked();
    expect(box().closest("label")).toHaveTextContent("400 g mel");
    expect(box().closest("li")).toBeInTheDocument();
  });

  it("klikk på teksten veksler avkrysningen, og et nytt klikk fjerner den", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("mel"));
    expect(box()).toBeChecked();
    await user.click(screen.getByText("mel"));
    expect(box()).not.toBeChecked();
  });

  it("klikk på selve boksen veksler én gang", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Harness onToggle={onToggle} />);
    await user.click(box());
    expect(box()).toBeChecked();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("tastatur: Tab gir boksen fokus, mellomrom veksler, og fokus blir stående", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(box()).toHaveFocus();
    await user.keyboard(" ");
    expect(box()).toBeChecked();
    expect(box()).toHaveFocus();
    await user.keyboard(" ");
    expect(box()).not.toBeChecked();
    expect(box()).toHaveFocus();
  });

  it("legger ekstra klasse på <li>", () => {
    render(
      <ul>
        <CheckRow checked={false} onToggle={() => {}} className="ekstra">
          tekst
        </CheckRow>
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveClass("row", "ekstra");
  });
});
