// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useCheckedSet } from "./use-checked-set";

afterEach(cleanup);

function Harness({ ids = [1, 2] }: { ids?: number[] }) {
  const { isChecked, toggle } = useCheckedSet();
  return (
    <ul>
      {ids.map((id) => (
        <li key={id}>
          <button type="button" onClick={() => toggle(id)}>
            rad {id}: {isChecked(id) ? "avkrysset" : "tom"}
          </button>
        </li>
      ))}
    </ul>
  );
}

const row = (id: number) => screen.getByRole("button", { name: new RegExp(`^rad ${id}:`) });

describe("useCheckedSet", () => {
  it("starter tomt, veksler per id og påvirker ikke andre id-er", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(row(1)).toHaveTextContent("tom");
    await user.click(row(1));
    expect(row(1)).toHaveTextContent("avkrysset");
    expect(row(2)).toHaveTextContent("tom");
    await user.click(row(1));
    expect(row(1)).toHaveTextContent("tom");
  });

  it("Lukke og åpne: tømmes når Activity skjuler komponenten, og forblir tomt når den vises igjen", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Activity mode="visible">
        <Harness />
      </Activity>,
    );
    await user.click(row(1));
    await user.click(row(2));
    expect(row(2)).toHaveTextContent("avkrysset");

    rerender(
      <Activity mode="hidden">
        <Harness />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <Harness />
      </Activity>,
    );
    expect(row(1)).toHaveTextContent("tom");
    expect(row(2)).toHaveTextContent("tom");

    // Etter nullstillingen virker avkrysning som før.
    await user.click(row(1));
    expect(row(1)).toHaveTextContent("avkrysset");
  });

  it("Avmontere: ny montering starter tomt", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);
    await user.click(row(1));
    unmount();
    render(<Harness />);
    expect(row(1)).toHaveTextContent("tom");
    expect(row(2)).toHaveTextContent("tom");
  });

  it("Strict Mode: den ekstra kjøringen av effekten ved montering gir ingen feil, og avkrysning virker", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <StrictMode>
        <Activity mode="visible">
          <Harness />
        </Activity>
      </StrictMode>,
    );
    expect(row(1)).toHaveTextContent("tom");
    await user.click(row(1));
    expect(row(1)).toHaveTextContent("avkrysset");

    rerender(
      <StrictMode>
        <Activity mode="hidden">
          <Harness />
        </Activity>
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <Activity mode="visible">
          <Harness />
        </Activity>
      </StrictMode>,
    );
    expect(row(1)).toHaveTextContent("tom");
  });

  it("skjuling og visning med tomt sett er uten virkning", () => {
    const { rerender } = render(
      <Activity mode="visible">
        <Harness />
      </Activity>,
    );
    rerender(
      <Activity mode="hidden">
        <Harness />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <Harness />
      </Activity>,
    );
    expect(row(1)).toHaveTextContent("tom");
  });
});
