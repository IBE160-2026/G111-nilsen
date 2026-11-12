// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
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

/** Rendrer konto-siden: skjemaet står i siden, og «neste»-delen leses i Suspense. */
async function renderAccountPage(page: ReactElement<{ children: ReactElement[] }>) {
  const [header, form] = page.props.children as [
    ReactElement,
    ReactElement<{ extras: ReactElement<{ children: ReactElement }> }>,
  ];
  const loader = form.props.extras.props.children;
  render(
    <>
      {header}
      <form.type {...form.props} extras={await (loader.type as AsyncComponent)(loader.props)} />
    </>,
  );
}

describe("/logg-inn og /ny-konto (Story 5.13)", () => {
  it("innloggingssiden har overskrift og skjema som sender til «neste»", async () => {
    await renderAccountPage(
      LoginPage({ searchParams: Promise.resolve({ neste: "/handleliste" }) }) as ReactElement<{
        children: ReactElement[];
      }>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Logg inn" })).toBeInTheDocument();
    expect(document.querySelector('input[name="neste"]')).toHaveValue("/handleliste");
  });

  it("skjemaet står i den ferdige siden; bare «neste» og bytte-lenken strømmes inn (sak 011)", () => {
    const page = LoginPage({ searchParams: new Promise(() => {}) }) as ReactElement<{
      children: ReactElement[];
    }>;
    const [, form] = page.props.children as [ReactElement, ReactElement<{ extras: ReactElement }>];
    // Foreldreelementet til skjemaet er ikke en Suspense, så feltene kan ikke bli byttet ut.
    expect(form.type).not.toBe(Suspense);
    expect(form.props.extras.type).toBe(Suspense);
    // Reservelenken i fallback gjør at siden ikke hopper når resten kommer.
    render(<form>{(form.props.extras.props as { fallback: ReactElement }).fallback}</form>);
    expect(screen.getByRole("link", { name: "Lag konto" })).toHaveAttribute("href", "/ny-konto");
  });

  it("«neste» til en annen side blir forsiden", async () => {
    await renderAccountPage(
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
