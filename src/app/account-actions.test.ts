import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ACCOUNT_FORM } from "@/app/_shared/account-form";
import { createTestDb, type Db } from "@/server/db/client";

const state = vi.hoisted(() => ({
  db: null as Db | null,
  started: [] as string[],
  ended: 0,
}));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});
vi.mock("@/server/session", () => ({
  startSession: async (signedIn: { user: { email: string } }) => {
    state.started.push(signedIn.user.email);
  },
  endSession: async () => {
    state.ended += 1;
  },
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const { logInAccount, logOutAccount, registerAccount } = await import("./account-actions");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  state.db = createTestDb({ users: false });
  state.started = [];
  state.ended = 0;
  revalidatePath.mockClear();
});

describe("registerAccount", () => {
  it("lager konto, starter økt og sender brukeren til «neste»", async () => {
    await expect(
      registerAccount(
        EMPTY_ACCOUNT_FORM,
        form({ email: "maja@eksempel.no", password: "hemmelig123", neste: "/oppskrifter" }),
      ),
    ).rejects.toMatchObject({ url: "/oppskrifter" });
    expect(state.started).toEqual(["maja@eksempel.no"]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("sender aldri til en annen side", async () => {
    await expect(
      registerAccount(
        EMPTY_ACCOUNT_FORM,
        form({ email: "maja@eksempel.no", password: "hemmelig123", neste: "//evil.no" }),
      ),
    ).rejects.toMatchObject({ url: "/" });
  });

  it("feil står under riktig felt, og e-posten beholdes", async () => {
    expect(
      await registerAccount(EMPTY_ACCOUNT_FORM, form({ email: "maja", password: "hemmelig123" })),
    ).toEqual({
      email: "maja",
      emailError: "Skriv en gyldig e-postadresse, for eksempel navn@eksempel.no.",
    });
    expect(
      await registerAccount(
        EMPTY_ACCOUNT_FORM,
        form({ email: "maja@eksempel.no", password: "kort" }),
      ),
    ).toEqual({ email: "maja@eksempel.no", passwordError: "Passordet må ha minst 8 tegn." });
    expect(state.started).toEqual([]);
  });

  it("brukt e-post gir melding under e-posten", async () => {
    await registerAccount(
      EMPTY_ACCOUNT_FORM,
      form({ email: "maja@eksempel.no", password: "hemmelig123" }),
    ).catch(() => {});
    expect(
      await registerAccount(
        EMPTY_ACCOUNT_FORM,
        form({ email: "maja@eksempel.no", password: "hemmelig123" }),
      ),
    ).toMatchObject({ emailError: expect.stringContaining("finnes allerede") });
  });

  it("databasefeil gir reservemelding og logges", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.db!.$client.close();
    expect(
      await registerAccount(
        EMPTY_ACCOUNT_FORM,
        form({ email: "maja@eksempel.no", password: "hemmelig123" }),
      ),
    ).toMatchObject({ formError: expect.stringContaining("Noe gikk galt") });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("logInAccount og logOutAccount", () => {
  beforeEach(async () => {
    await registerAccount(
      EMPTY_ACCOUNT_FORM,
      form({ email: "maja@eksempel.no", password: "hemmelig123" }),
    ).catch(() => {});
    state.started = [];
  });

  it("logger inn og sender til «neste»", async () => {
    await expect(
      logInAccount(
        EMPTY_ACCOUNT_FORM,
        form({ email: "Maja@eksempel.no", password: "hemmelig123", neste: "/oppskrift/3" }),
      ),
    ).rejects.toMatchObject({ url: "/oppskrift/3" });
    expect(state.started).toEqual(["maja@eksempel.no"]);
  });

  it("feil passord gir én melding for skjemaet", async () => {
    expect(
      await logInAccount(
        EMPTY_ACCOUNT_FORM,
        form({ email: "maja@eksempel.no", password: "feilfeilfeil" }),
      ),
    ).toEqual({ email: "maja@eksempel.no", formError: "Feil e-post eller passord." });
    expect(state.started).toEqual([]);
  });

  it("logg ut avslutter økten og sender til forsiden", async () => {
    await expect(logOutAccount()).rejects.toMatchObject({ url: "/" });
    expect(state.ended).toBe(1);
  });
});
