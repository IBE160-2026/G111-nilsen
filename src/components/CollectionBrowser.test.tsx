// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSearchText, type CollectionEntry } from "@/domain";
import CollectionBrowser from "./CollectionBrowser";

vi.mock("@/app/oppskrift/[id]/actions", () => ({ setFavorite: vi.fn() }));

afterEach(cleanup);

function entry(id: number, title: string, folderName: string | null, fav: boolean, ing: string[]) {
  return {
    id,
    title,
    sourceName: null,
    sourceUrl: null,
    savedAt: "2026-11-10T10:00:00.000Z",
    isFavorite: fav,
    folderName,
    searchText: buildSearchText([title, folderName, ...ing]),
  } satisfies CollectionEntry;
}

const entries = [
  entry(1, "Pannekaker", "Frokost", true, ["melk", "egg"]),
  entry(2, "Blåbærsuppe", "Dessert", false, ["blåbær"]),
  entry(3, "Kjøttboller", null, false, ["melk", "kjøttdeig"]),
];
const titles = () => screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const search = () => screen.getByLabelText("Søk i oppskrifter");

describe("CollectionBrowser", () => {
  it("viser alle oppskrifter og antall fra start", () => {
    render(<CollectionBrowser entries={entries} />);
    expect(titles()).toEqual(["Pannekaker", "Blåbærsuppe", "Kjøttboller"]);
    expect(screen.getByRole("status")).toHaveTextContent("3 oppskrifter");
  });

  it("søk på ingrediens filtrerer og oppdaterer antallet", async () => {
    const user = userEvent.setup();
    render(<CollectionBrowser entries={entries} />);
    await user.type(search(), "melk");
    expect(titles()).toEqual(["Pannekaker", "Kjøttboller"]);
    expect(screen.getByRole("status")).toHaveTextContent("2 av 3 oppskrifter");
  });

  it("«Bare favoritter» og mappevalg", async () => {
    const user = userEvent.setup();
    render(<CollectionBrowser entries={entries} />);
    await user.click(screen.getByLabelText("Bare favoritter"));
    expect(titles()).toEqual(["Pannekaker"]);
    await user.click(screen.getByLabelText("Bare favoritter"));
    await user.selectOptions(screen.getByLabelText("Mappe"), "Dessert");
    expect(titles()).toEqual(["Blåbærsuppe"]);
  });

  it("mappevalget har «Alle mapper» og mappene som finnes, sortert", () => {
    render(<CollectionBrowser entries={entries} />);
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Alle mapper", "Dessert", "Frokost"]);
  });

  it("ingen mapper: mappevalget skjules", () => {
    render(<CollectionBrowser entries={[entry(1, "A", null, false, [])]} />);
    expect(screen.queryByLabelText("Mappe")).not.toBeInTheDocument();
  });

  it("ingen treff gir melding, og «Nullstill søk» tømmer alt", async () => {
    const user = userEvent.setup();
    render(<CollectionBrowser entries={entries} />);
    await user.type(search(), "sjokolade");
    await user.click(screen.getByLabelText("Bare favoritter"));
    expect(screen.getByText("Ingen oppskrifter passer.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0 av 3 oppskrifter");
    await user.click(screen.getByRole("button", { name: "Nullstill søk" }));
    expect(search()).toHaveValue("");
    expect(screen.getByLabelText("Bare favoritter")).not.toBeChecked();
    expect(titles()).toHaveLength(3);
  });

  it("Enter i søkefeltet sender ikke inn skjemaet", async () => {
    const user = userEvent.setup();
    render(<CollectionBrowser entries={entries} />);
    await user.type(search(), "melk{Enter}");
    expect(titles()).toEqual(["Pannekaker", "Kjøttboller"]);
  });
});
