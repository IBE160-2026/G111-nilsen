// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

import HomePage from "./page";
import NotFound from "./not-found";

afterEach(cleanup);
beforeEach(() => {
  session.userId = 1;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement | null>;

/** Henter innholdet i forsidens Suspense (den asynkrone innloggingssjekken). */
async function notice() {
  const page = HomePage() as ReactElement<{ children: ReactElement[] }>;
  const suspense = (page.props.children as ReactElement[]).find(
    (child) => child.type === Suspense,
  ) as ReactElement<{ children: ReactElement }>;
  const loader = suspense.props.children;
  return (loader.type as AsyncComponent)(loader.props);
}

describe("forsiden og 404-siden", () => {
  it("forsiden har en salgstekst, en stor «Hent en oppskrift»-knapp til Importer og en hint", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Fra oppskrift på nettet til middag på bordet",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Slutt med lange tekster/)).toBeInTheDocument();
    const cta = screen.getAllByRole("link", { name: "Hent en oppskrift" })[0]!;
    expect(cta).toHaveAttribute("href", "/importer");
    expect(screen.getByText("Du trenger ikke konto for å prøve.")).toBeInTheDocument();
  });

  it("forsiden forklarer hvordan det virker i tre steg og hva appen kan mer", () => {
    render(<HomePage />);
    const steps = within(screen.getByRole("region", { name: "Slik virker det" })).getAllByRole(
      "heading",
      { level: 3 },
    );
    expect(steps.map((h) => h.textContent)).toEqual([
      "Lim inn en lenke",
      "Velg antall porsjoner",
      "Lag maten",
    ]);
    const more = within(
      screen.getByRole("region", { name: "Mer enn en samling oppskrifter" }),
    ).getAllByRole("heading", { level: 3 });
    expect(more.map((h) => h.textContent)).toEqual([
      "Ukemeny og handleliste",
      "Mapper og favoritter",
      "Dine egne notater",
      "Skriv ut",
    ]);
  });

  it("forsiden har snarveier til alle delene", () => {
    render(<HomePage />);
    const links = within(screen.getByRole("region", { name: "Gå rett til" })).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/importer",
      "/oppskrifter",
      "/ukemeny",
      "/handleliste",
      "/mapper",
      "/favoritter",
    ]);
  });

  it("forsiden har ikke selv importskjemaet (det ligger på /importer)", () => {
    render(<HomePage />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("uten innlogging står det at man må lage konto eller logge inn, med knapper til begge", async () => {
    session.userId = null;
    render((await notice())!);
    expect(screen.getByRole("heading", { name: "Du er ikke logget inn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
      "href",
      "/logg-inn?neste=%2F",
    );
    expect(screen.getByRole("link", { name: "Lag konto" })).toHaveAttribute(
      "href",
      "/ny-konto?neste=%2F",
    );
  });

  it("når man er logget inn, vises ingen innloggingsmelding", async () => {
    expect(await notice()).toBeNull();
  });

  it("404-siden er på norsk og lenker til forsiden", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Fant ikke siden" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gå til forsiden" })).toHaveAttribute("href", "/");
  });
});
