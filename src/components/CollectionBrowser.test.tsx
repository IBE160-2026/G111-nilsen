// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSearchText, type CollectionEntry } from "@/domain";
import CollectionBrowser from "./CollectionBrowser";

vi.mock("@/app/oppskrift/[id]/actions", () => ({ setFavorite: vi.fn() }));

afterEach(cleanup);

function entry(
  id: number,
  title: string,
  folderName: string | null,
  fav: boolean,
  ing: string[],
  labels: string[] = [],
) {
  return {
    id,
    title,
    sourceName: null,
    sourceUrl: null,
    savedAt: "2026-11-10T10:00:00.000Z",
    isFavorite: fav,
    folderName,
    labels,
    searchText: buildSearchText([title, folderName, ...labels, ...ing]),
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
    const options = Array.from(screen.getByLabelText("Mappe").querySelectorAll("option")).map(
      (o) => o.textContent,
    );
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

describe("merkelapper (Story 6.7)", () => {
  const labelled = [
    entry(1, "Taco", null, false, ["kjøttdeig"], ["Hverdag", "Vegetar"]),
    entry(2, "Lapskaus", null, false, ["kjøtt"], ["Helg"]),
    entry(3, "Suppe", null, false, ["løk"], ["hverdag"]),
    entry(4, "Pannekaker", null, false, ["egg"]),
  ];

  it("viser merkelappene på kortene og et valg per merkelapp, hver bare én gang", () => {
    render(<CollectionBrowser entries={labelled} />);
    const select = screen.getByLabelText("Merkelapp");
    expect(Array.from(select.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Alle merkelapper",
      "Helg",
      "Hverdag",
      "Vegetar",
    ]);
    expect(screen.getAllByRole("list", { name: "Merkelapper" })).toHaveLength(3);
  });

  it("søket finner merkelapper, og valget filtrerer uavhengig av store og små bokstaver", async () => {
    const user = userEvent.setup();
    render(<CollectionBrowser entries={labelled} />);
    await user.type(screen.getByLabelText("Søk i oppskrifter"), "vegetar");
    expect(titles()).toEqual(["Taco"]);
    await user.clear(screen.getByLabelText("Søk i oppskrifter"));
    await user.selectOptions(screen.getByLabelText("Merkelapp"), "Hverdag");
    expect(titles()).toEqual(["Taco", "Suppe"]);
  });

  it("viser ikke merkelappvalget når ingen oppskrift har merkelapper", () => {
    render(<CollectionBrowser entries={entries} />);
    expect(screen.queryByLabelText("Merkelapp")).not.toBeInTheDocument();
  });
});

describe("sortering (Story 6.9)", () => {
  const sorted = [
    {
      ...entry(1, "Brød", null, false, []),
      cookedCount: 1,
      lastCookedAt: "2026-11-01T10:00:00.000Z",
    },
    { ...entry(2, "Ananas", null, false, []), cookedCount: 5, lastCookedAt: null },
    {
      ...entry(3, "Cider", null, false, []),
      cookedCount: 0,
      lastCookedAt: "2026-11-08T10:00:00.000Z",
      rating: 4,
    },
  ];

  it("starter på sist lagret, og valget endrer rekkefølgen", async () => {
    const user = userEvent.setup();
    render(<CollectionBrowser entries={sorted} />);
    const select = screen.getByLabelText("Sorter etter");
    expect(select).toHaveValue("saved");
    expect(Array.from(select.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Sist lagret",
      "Sist laget",
      "Mest laget",
      "Høyest vurdering",
      "Alfabetisk",
    ]);
    expect(titles()).toEqual(["Brød", "Ananas", "Cider"]);
    await user.selectOptions(select, "Alfabetisk");
    expect(titles()).toEqual(["Ananas", "Brød", "Cider"]);
    await user.selectOptions(select, "Sist laget");
    expect(titles()).toEqual(["Cider", "Brød", "Ananas"]);
    await user.selectOptions(select, "Mest laget");
    expect(titles()).toEqual(["Ananas", "Brød", "Cider"]);
    await user.selectOptions(select, "Høyest vurdering");
    expect(titles()).toEqual(["Cider", "Brød", "Ananas"]);
  });

  it("sorteringen gjelder treffene, og beholdes når søket nullstilles", async () => {
    const user = userEvent.setup();
    render(<CollectionBrowser entries={sorted} />);
    await user.selectOptions(screen.getByLabelText("Sorter etter"), "Alfabetisk");
    await user.type(search(), "zzz");
    await user.click(screen.getByRole("button", { name: "Nullstill søk" }));
    expect(screen.getByLabelText("Sorter etter")).toHaveValue("alpha");
    expect(titles()).toEqual(["Ananas", "Brød", "Cider"]);
  });
});
