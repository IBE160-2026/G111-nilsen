// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createManualRecipe } from "@/server/services/recipe-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
const state = vi.hoisted(() => ({ db: null as Db | null, calls: [] as string[] }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});
vi.mock("next/server", () => ({
  connection: () => {
    state.calls.push("connection");
    return Promise.resolve();
  },
}));
vi.mock("./actions", () => ({ importBackupFile: vi.fn() }));

const { default: BackupPage } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  session.userId = 1;
  state.db = createTestDb();
  state.calls = [];
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

function parts() {
  const page = BackupPage() as ReactElement<{ children: ReactElement[] }>;
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
  render(
    <>
      {heading}
      {lead}
      {await (loader.type as AsyncComponent)(loader.props)}
    </>,
  );
}

describe("/sikkerhetskopi", () => {
  it("har overskriften utenfor Suspense og leser først etter connection()", async () => {
    const { heading, suspense } = parts();
    render(heading);
    expect(
      screen.getByRole("heading", { level: 1, name: "Eksport og import" }),
    ).toBeInTheDocument();
    render(suspense.props.fallback);
    expect(screen.getByText("Laster …")).toBeInTheDocument();
    await show();
    expect(state.calls).toEqual(["connection"]);
  });

  it("uten oppskrifter er det ingen nedlastingslenke, men import er mulig", async () => {
    await show();
    expect(screen.getByText(/ingen lagrede oppskrifter å eksportere/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Last ned oppskriftene" })).toBeNull();
    expect(screen.getByLabelText("Fil med oppskrifter")).toBeInTheDocument();
  });

  it("med oppskrifter viser den antallet og en nedlastingslenke", async () => {
    createManualRecipe(
      TEST_USER_ID,
      { title: "A", servings: 2, ingredients: ["1 egg"], steps: [] },
      state.db!,
    );
    await show();
    expect(screen.getByText(/Filen får 1 oppskrift/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Last ned oppskriftene" });
    expect(link).toHaveAttribute("href", "/sikkerhetskopi/eksport");
    expect(link).toHaveAttribute("download");
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show();
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Fil med oppskrifter")).toBeNull();
  });
});
