import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "@/server/db/client";
import { listSharesIShare, listSharesWithMe } from "@/server/services/share-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
const state = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const { acceptShareInvitation, invitePerson, stopSharing } = await import("./actions");

const PER = 2;

beforeEach(() => {
  vi.restoreAllMocks();
  revalidatePath.mockClear();
  session.userId = TEST_USER_ID;
  state.db = createTestDb();
  state.db.$client
    .prepare(
      "insert into users (id, email, password_hash, created_at) values (?, 'per@eksempel.no', 'x', '2026-01-01T00:00:00.000Z')",
    )
    .run(PER);
});

describe("invitePerson", () => {
  it("inviterer og revaliderer", async () => {
    expect(await invitePerson("per@eksempel.no")).toEqual({ ok: true, email: "per@eksempel.no" });
    expect(revalidatePath).toHaveBeenCalledWith("/delt");
    expect(listSharesIShare(TEST_USER_ID, state.db!)).toMatchObject({
      ok: true,
      value: [{ email: "per@eksempel.no", status: "pending" }],
    });
  });

  it("gir egne meldinger for ukjent konto, seg selv, dublett og ugyldig e-post", async () => {
    expect(await invitePerson("ukjent@eksempel.no")).toEqual({
      ok: false,
      message: expect.stringContaining("Fant ingen konto"),
    });
    expect(await invitePerson("test@example.com")).toEqual({
      ok: false,
      message: "Du kan ikke dele med deg selv.",
    });
    expect(await invitePerson("hei")).toEqual({
      ok: false,
      message: "Skriv en gyldig e-postadresse.",
    });
    await invitePerson("per@eksempel.no");
    expect(await invitePerson("per@eksempel.no")).toEqual({
      ok: false,
      message: "Du deler allerede med denne e-posten.",
    });
  });

  it("krever innlogging og tåler databasefeil", async () => {
    session.userId = null;
    expect((await invitePerson("per@eksempel.no")).ok).toBe(false);
    session.userId = TEST_USER_ID;
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.db!.$client.close();
    expect((await invitePerson("per@eksempel.no")).ok).toBe(false);
  });
});

describe("acceptShareInvitation og stopSharing", () => {
  it("mottakeren godtar, og begge kan avslutte", async () => {
    const invited = await invitePerson("per@eksempel.no");
    if (!invited.ok) throw new Error("feilet");
    const share = listSharesWithMe(PER, state.db!);
    const id = share.ok ? share.value[0]!.id : 0;

    session.userId = PER;
    expect(await acceptShareInvitation(id)).toEqual({ ok: true });
    expect(listSharesWithMe(PER, state.db!)).toMatchObject({
      ok: true,
      value: [{ status: "accepted" }],
    });

    expect(await stopSharing(id)).toEqual({ ok: true });
    expect(listSharesWithMe(PER, state.db!)).toEqual({ ok: true, value: [] });
  });

  it("avviser ugyldige og andres id-er", async () => {
    expect(await acceptShareInvitation(0)).toMatchObject({ ok: false });
    expect(await acceptShareInvitation(9999)).toMatchObject({ ok: false });
    expect(await stopSharing(-1)).toMatchObject({ ok: false });
    expect(await stopSharing(9999)).toMatchObject({ ok: false });
  });

  it("krever innlogging", async () => {
    session.userId = null;
    expect(await acceptShareInvitation(1)).toMatchObject({ ok: false });
    expect(await stopSharing(1)).toMatchObject({ ok: false });
  });
});
