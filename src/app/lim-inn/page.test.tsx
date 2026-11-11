// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: 1 as number | null, calls: [] as string[] }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
vi.mock("next/server", () => ({
  connection: () => {
    session.calls.push("connection");
    return Promise.resolve();
  },
}));
vi.mock("../ny/actions", () => ({ saveManualRecipe: vi.fn() }));

const { default: PastePage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  session.userId = 1;
  session.calls = [];
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

function parts() {
  const page = PastePage() as ReactElement<{ children: ReactElement[] }>;
  const [heading, lead, suspense] = page.props.children as [
    ReactElement,
    ReactElement,
    ReactElement<{ children: ReactElement; fallback: ReactElement }>,
  ];
  return { heading, lead, suspense };
}

async function show() {
  const { heading, lead, suspense } = parts();
  const loader = suspense.props.children;
  const content = await (loader.type as AsyncComponent)(loader.props);
  render(
    <>
      {heading}
      {lead}
      {content}
    </>,
  );
}

describe("/lim-inn", () => {
  it("har overskriften utenfor Suspense og leser først etter connection()", async () => {
    const { heading, suspense } = parts();
    render(heading);
    expect(
      screen.getByRole("heading", { level: 1, name: "Lim inn oppskriften som tekst" }),
    ).toBeInTheDocument();
    render(suspense.props.fallback);
    expect(screen.getByText("Laster …")).toBeInTheDocument();
    await show();
    expect(session.calls).toEqual(["connection"]);
  });

  it("viser tekstfeltet når man er innlogget", async () => {
    await show();
    expect(screen.getByLabelText("Oppskriften som tekst")).toBeInTheDocument();
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show();
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Oppskriften som tekst")).toBeNull();
  });
});
