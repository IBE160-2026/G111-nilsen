// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pathnameMock = vi.hoisted(() => ({ current: "/" as string | null }));

const linkStatus = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: linkStatus.pending }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock.current,
}));

import TopNav, { TopNavView, isActive } from "./TopNav";

function navLinks() {
  const nav = screen.getByRole("navigation", { name: "Hovedmeny" });
  return within(nav).getAllByRole("link");
}

describe("TopNav", () => {
  beforeEach(() => {
    pathnameMock.current = "/";
  });
  afterEach(cleanup);

  it("viser logo og seks menypunkter i riktig rekkefølge", () => {
    render(<TopNav />);
    expect(screen.getByRole("link", { name: "RecipeMate" })).toHaveAttribute("href", "/");
    const links = navLinks();
    expect(links.map((l) => l.textContent)).toEqual([
      "Importer",
      "Oppskrifter",
      "Mapper",
      "Favoritter",
      "Ukemeny",
      "Handleliste",
    ]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/importer",
      "/oppskrifter",
      "/mapper",
      "/favoritter",
      "/ukemeny",
      "/handleliste",
    ]);
  });

  it.each([
    ["/importer", "Importer"],
    ["/oppskrifter", "Oppskrifter"],
    ["/mapper", "Mapper"],
    ["/mapper/3", "Mapper"],
    ["/favoritter", "Favoritter"],
    ["/ukemeny", "Ukemeny"],
    ["/handleliste", "Handleliste"],
  ])("markerer riktig punkt på %s", (path, expected) => {
    pathnameMock.current = path;
    render(<TopNav />);
    const current = navLinks().filter((l) => l.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(expected);
  });

  it("markerer ingenting på forsiden", () => {
    pathnameMock.current = "/";
    render(<TopNav />);
    expect(navLinks().some((l) => l.hasAttribute("aria-current"))).toBe(false);
  });

  it("markerer ingenting på en ukjent side", () => {
    pathnameMock.current = "/finnes-ikke";
    render(<TopNav />);
    expect(navLinks().some((l) => l.hasAttribute("aria-current"))).toBe(false);
  });

  it("fallback uten pathname markerer ingenting", () => {
    render(<TopNavView pathname={null} />);
    expect(navLinks().some((l) => l.hasAttribute("aria-current"))).toBe(false);
  });
});

describe("isActive", () => {
  it("forsiden («/») er bare aktiv på forsiden", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/", "/oppskrifter")).toBe(false);
  });

  it("matcher ikke prefiks uten skråstrek", () => {
    expect(isActive("/mapper", "/mapperx")).toBe(false);
  });
});

describe("TopNav med konto (Story 5.13)", () => {
  it("viser kontodelen ved siden av logoen, utenfor hovedmenyen", () => {
    render(<TopNavView pathname="/" account={<a href="/logg-inn">Logg inn</a>} />);
    const link = screen.getByRole("link", { name: "Logg inn" });
    expect(
      within(screen.getByRole("navigation")).queryByRole("link", { name: "Logg inn" }),
    ).toBeNull();
    expect(screen.getByRole("banner")).toContainElement(link);
  });
});

describe("TopNav: respons mens siden åpnes", () => {
  afterEach(() => {
    cleanup();
    linkStatus.pending = false;
  });

  it("viser en pulserende strek (skjult for skjermlesere) i hver lenke mens siden lastes", () => {
    linkStatus.pending = true;
    const { container } = render(<TopNavView pathname="/importer" />);
    const marks = container.querySelectorAll('span[aria-hidden="true"]');
    // Logoen og seks menypunkter.
    expect(marks).toHaveLength(7);
    expect(marks[0]!.className).toContain("pending");
  });

  it("viser ingen strek når ingen side lastes", () => {
    const { container } = render(<TopNavView pathname="/importer" />);
    for (const mark of container.querySelectorAll('span[aria-hidden="true"]'))
      expect(mark.className).toContain("idle");
  });
});
