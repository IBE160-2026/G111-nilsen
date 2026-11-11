// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import TrashList, { type TrashItem } from "./TrashList";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(cleanup);

const items: TrashItem[] = [
  {
    id: 1,
    title: "Taco",
    deletedLabel: "Slettet 11. november",
    expiresLabel: "Borte for godt om 6 dager",
  },
  {
    id: 2,
    title: "Suppe",
    deletedLabel: "Slettet 5. november",
    expiresLabel: "Borte for godt i morgen",
  },
];

describe("TrashList", () => {
  it("viser hver oppskrift med når den ble slettet og når den er borte, og to knapper", () => {
    render(<TrashList items={items} onRestore={vi.fn()} onDeleteForGood={vi.fn()} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByRole("heading", { name: "Taco" })).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent("Slettet 11. november · Borte for godt om 6 dager");
    expect(
      within(rows[1]!).getByRole("button", { name: "Hent tilbake Suppe" }),
    ).toBeInTheDocument();
    expect(
      within(rows[1]!).getByRole("button", { name: "Slett Suppe for godt" }),
    ).toBeInTheDocument();
  });

  it("«Hent tilbake» kaller handlingen med id-en, og låser knappene mens den jobber", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<TrashList items={items} onRestore={onRestore} onDeleteForGood={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Hent tilbake Taco" });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Hent tilbake Suppe" }));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith(1);
    expect(button).toHaveTextContent("Henter tilbake …");
  });

  it("en feil ved gjenoppretting vises, og knappene kan brukes igjen", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn().mockResolvedValue({ ok: false, message: "Finnes ikke lenger." });
    render(<TrashList items={items} onRestore={onRestore} onDeleteForGood={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hent tilbake Taco" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Finnes ikke lenger.");
    expect(screen.getByRole("button", { name: "Hent tilbake Taco" })).toHaveTextContent(
      "Hent tilbake",
    );
  });

  it("«Slett for godt» spør først, avbryt gjør ingenting, og bekreftelse fjerner den med en melding", async () => {
    const user = userEvent.setup();
    const onDeleteForGood = vi.fn().mockResolvedValue({ ok: true });
    render(<TrashList items={items} onRestore={vi.fn()} onDeleteForGood={onDeleteForGood} />);
    await user.click(screen.getByRole("button", { name: "Slett Taco for godt" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Slette for godt?");
    expect(dialog).toHaveTextContent("«Taco» blir borte for godt. Du kan ikke angre.");
    await user.click(within(dialog).getByRole("button", { name: "Avbryt" }));
    expect(onDeleteForGood).not.toHaveBeenCalled();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Slett Taco for godt" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Slett for godt" }),
    );
    expect(onDeleteForGood).toHaveBeenCalledWith(1);
    expect(await screen.findByText("«Taco» er slettet for godt.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Taco" })).not.toBeInTheDocument();
  });

  it("en feil ved sletting for godt viser meldingen og beholder oppskriften", async () => {
    const user = userEvent.setup();
    const onDeleteForGood = vi.fn().mockResolvedValue({ ok: false, message: "Noe gikk galt." });
    render(<TrashList items={items} onRestore={vi.fn()} onDeleteForGood={onDeleteForGood} />);
    await user.click(screen.getByRole("button", { name: "Slett Taco for godt" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Slett for godt" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Noe gikk galt.");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("uten oppskrifter vises den tomme tilstanden, og sletter du den siste står meldingen igjen", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <TrashList items={[]} onRestore={vi.fn()} onDeleteForGood={vi.fn()} />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Ingen slettede oppskrifter." }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ligger her i 7 dager/)).not.toBeInTheDocument();
    unmount();

    render(
      <TrashList
        items={[items[0]!]}
        onRestore={vi.fn()}
        onDeleteForGood={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );
    expect(screen.getByText(/ligger her i 7 dager/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Slett Taco for godt" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Slett for godt" }),
    );
    expect(await screen.findByText("«Taco» er slettet for godt.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Ingen slettede oppskrifter." }),
    ).toBeInTheDocument();
  });

  it("følger listen fra serveren når den endres, og beholder meldingen", async () => {
    const user = userEvent.setup();
    const onDeleteForGood = vi.fn().mockResolvedValue({ ok: true });
    const { rerender } = render(
      <TrashList items={items} onRestore={vi.fn()} onDeleteForGood={onDeleteForGood} />,
    );
    await user.click(screen.getByRole("button", { name: "Slett Taco for godt" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Slett for godt" }),
    );
    await screen.findByText("«Taco» er slettet for godt.");
    // Ny liste fra serveren (Suppe hentet tilbake et annet sted, en ny kom til).
    const fresh: TrashItem[] = [
      {
        id: 3,
        title: "Pasta",
        deletedLabel: "Slettet 12. november",
        expiresLabel: "Borte for godt om 7 dager",
      },
    ];
    rerender(<TrashList items={fresh} onRestore={vi.fn()} onDeleteForGood={onDeleteForGood} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Pasta",
    ]);
    expect(screen.getByText("«Taco» er slettet for godt.")).toBeInTheDocument();
  });
});
