// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "@/server/db/client";
import { createManualRecipe } from "@/server/services/recipe-service";
import { acceptInvitation, inviteToCollection } from "@/server/services/share-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
const state = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
class NotFoundError extends Error {}
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundError("not found");
  },
}));

const { default: SharedCollectionPage } = await import("./page");

const PER = 2;

afterEach(cleanup);
beforeEach(() => {
  session.userId = PER;
  state.db = createTestDb();
  state.db.$client
    .prepare(
      "insert into users (id, email, password_hash, created_at) values (?, 'per@eksempel.no', 'x', '2026-01-01T00:00:00.000Z')",
    )
    .run(PER);
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

async function show(eier: string) {
  const page = SharedCollectionPage({ params: Promise.resolve({ eier }) }) as ReactElement<{
    children: ReactElement[];
  }>;
  const [heading, suspense] = page.props.children as [
    ReactElement,
    ReactElement<{ children: ReactElement }>,
  ];
  const loader = suspense.props.children;
  render(
    <>
      {heading}
      {await (loader.type as AsyncComponent)(loader.props)}
    </>,
  );
}

function share(accepted: boolean) {
  const invited = inviteToCollection(TEST_USER_ID, "per@eksempel.no", state.db!);
  if (!invited.ok) throw new Error("feilet");
  if (accepted) acceptInvitation(PER, invited.value.id, state.db!);
}

describe("/delt/[eier]", () => {
  it("viser eierens oppskrifter som lenker, og veien tilbake", async () => {
    createManualRecipe(
      TEST_USER_ID,
      { title: "Pannekaker", servings: 4, minutes: 30, ingredients: ["3 egg"], steps: [] },
      state.db!,
    );
    share(true);
    await show(String(TEST_USER_ID));
    expect(
      screen.getByRole("heading", { level: 2, name: "Oppskrifter fra test@example.com" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pannekaker/ })).toHaveAttribute(
      "href",
      "/oppskrift/1",
    );
    expect(screen.getByRole("link", { name: "Tilbake til Deling" })).toHaveAttribute(
      "href",
      "/delt",
    );
  });

  it("sier fra når eieren ikke har oppskrifter", async () => {
    share(true);
    await show(String(TEST_USER_ID));
    expect(screen.getByText("Ingen lagrede oppskrifter her ennå.")).toBeInTheDocument();
  });

  it("uten godtatt deling, med ukjent eier eller ugyldig id ser siden ut som om den ikke finnes", async () => {
    share(false);
    await expect(show(String(TEST_USER_ID))).rejects.toThrow(NotFoundError);
    await expect(show("9999")).rejects.toThrow(NotFoundError);
    await expect(show("abc")).rejects.toThrow(NotFoundError);
  });

  it("viser innloggingskravet uten innlogging", async () => {
    session.userId = null;
    await show("1");
    expect(screen.getByRole("link", { name: /logg inn/i })).toBeInTheDocument();
  });
});
