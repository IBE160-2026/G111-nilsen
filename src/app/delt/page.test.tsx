// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "@/server/db/client";
import { acceptInvitation, inviteToCollection } from "@/server/services/share-service";

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
vi.mock("./actions", () => ({
  invitePerson: vi.fn(),
  acceptShareInvitation: vi.fn(),
  stopSharing: vi.fn(),
}));

const { default: SharePage } = await import("./page");

const PER = 2;

afterEach(cleanup);
beforeEach(() => {
  session.userId = TEST_USER_ID;
  state.db = createTestDb();
  state.calls = [];
  state.db.$client
    .prepare(
      "insert into users (id, email, password_hash, created_at) values (?, 'per@eksempel.no', 'x', '2026-01-01T00:00:00.000Z')",
    )
    .run(PER);
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

function parts() {
  const page = SharePage() as ReactElement<{ children: ReactElement[] }>;
  const [heading, lead, suspense] = page.props.children as [
    ReactElement,
    ReactElement,
    ReactElement<{ children: ReactElement; fallback: ReactElement }>,
  ];
  return { heading, lead, suspense };
}

async function show() {
  const { heading, suspense } = parts();
  const loader = suspense.props.children;
  render(
    <>
      {heading}
      {await (loader.type as AsyncComponent)(loader.props)}
    </>,
  );
}

describe("/delt", () => {
  it("har overskriften utenfor Suspense og leser først etter connection()", async () => {
    const { heading, suspense } = parts();
    render(heading);
    expect(screen.getByRole("heading", { level: 1, name: "Deling" })).toBeInTheDocument();
    render(suspense.props.fallback);
    expect(screen.getByText("Henter delingene …")).toBeInTheDocument();
    await show();
    expect(state.calls).toEqual(["connection"]);
  });

  it("uten delinger vises skjemaet og to tomme lister", async () => {
    await show();
    expect(screen.getByLabelText("E-posten til den du vil dele med")).toBeInTheDocument();
    expect(screen.getByText("Du deler ikke med noen ennå.")).toBeInTheDocument();
    expect(screen.getByText("Ingen deler samlingen sin med deg ennå.")).toBeInTheDocument();
  });

  it("viser hvem du deler med, og invitasjoner du har fått", async () => {
    inviteToCollection(TEST_USER_ID, "per@eksempel.no", state.db!);
    const fromPer = inviteToCollection(PER, "test@example.com", state.db!);
    if (!fromPer.ok) throw new Error("feilet");
    await show();
    expect(screen.getAllByText("per@eksempel.no")).toHaveLength(2); // én i hver liste
    expect(screen.getByText("Venter på svar")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Godta invitasjonen fra per@eksempel.no" }),
    ).toBeInTheDocument();

    cleanup();
    acceptInvitation(TEST_USER_ID, fromPer.value.id, state.db!);
    await show();
    expect(
      screen.getByRole("link", { name: "Se oppskriftene til per@eksempel.no" }),
    ).toHaveAttribute("href", `/delt/${PER}`);
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show();
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
  });
});
