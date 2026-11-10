// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("./account-actions", () => ({ logInAccount: vi.fn(), registerAccount: vi.fn() }));
vi.mock("./ny/actions", () => ({ saveManualRecipe: vi.fn() }));

const { default: LoginPage } = await import("./logg-inn/page");
const { default: RegisterPage } = await import("./ny-konto/page");
const { default: NewRecipePage } = await import("./ny/page");

afterEach(cleanup);

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

/** Rendrer siden med den asynkrone delen inne i Suspense ferdig lest. */
async function renderWithLoader(page: ReactElement<{ children: ReactElement[] }>) {
  const [header, suspense] = page.props.children as [
    ReactElement,
    ReactElement<{ children: ReactElement }>,
  ];
  const loader = suspense.props.children;
  render(
    <>
      {header}
      {await (loader.type as AsyncComponent)(loader.props)}
    </>,
  );
}

describe("/logg-inn og /ny-konto (Story 5.13)", () => {
  it("innloggingssiden har overskrift og skjema som sender til «neste»", async () => {
    await renderWithLoader(
      LoginPage({ searchParams: Promise.resolve({ neste: "/handleliste" }) }) as ReactElement<{
        children: ReactElement[];
      }>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Logg inn" })).toBeInTheDocument();
    expect(document.querySelector('input[name="neste"]')).toHaveValue("/handleliste");
  });

  it("«neste» til en annen side blir forsiden", async () => {
    await renderWithLoader(
      RegisterPage({
        searchParams: Promise.resolve({ neste: "https://evil.no" }),
      }) as ReactElement<{
        children: ReactElement[];
      }>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Lag en konto" })).toBeInTheDocument();
    expect(document.querySelector('input[name="neste"]')).toHaveValue("/");
  });
});

describe("/ny (Story 5.13)", () => {
  it("innlogget: skjemaet", async () => {
    session.userId = 1;
    await renderWithLoader(NewRecipePage() as ReactElement<{ children: ReactElement[] }>);
    expect(screen.getByRole("button", { name: "Lagre oppskrift" })).toBeInTheDocument();
  });

  it("uten innlogging: «Logg inn for å se dette»", async () => {
    session.userId = null;
    await renderWithLoader(NewRecipePage() as ReactElement<{ children: ReactElement[] }>);
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
      "href",
      "/logg-inn?neste=%2Fny",
    );
    expect(screen.queryByRole("button", { name: "Lagre oppskrift" })).not.toBeInTheDocument();
  });
});
