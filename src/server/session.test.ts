import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db } from "./db/client";

const state = vi.hoisted(() => ({
  db: null as Db | null,
  cookies: new Map<string, { value: string; options?: Record<string, unknown> }>(),
  proto: "http",
}));

vi.mock("./db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db/client")>();
  return { ...actual, getDb: () => state.db! };
});
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => state.cookies.get(name),
    set: (name: string, value: string, options: Record<string, unknown>) =>
      state.cookies.set(name, { value, options }),
    delete: (name: string) => state.cookies.delete(name),
  }),
  headers: async () => new Headers({ "x-forwarded-proto": state.proto }),
}));

const { currentUser, currentUserId, endSession, SESSION_COOKIE, startSession } =
  await import("./session");
const { register } = await import("./services/auth-service");

beforeEach(() => {
  state.db = createTestDb({ users: false });
  state.cookies.clear();
  state.proto = "http";
});

function signUp() {
  const result = register("maja@eksempel.no", "hemmelig123", state.db!);
  if (!result.ok) throw new Error("feil");
  return result.value;
}

describe("session", () => {
  it("uten cookie er ingen logget inn", async () => {
    expect(await currentUser()).toBeNull();
    expect(await currentUserId()).toBeNull();
  });

  it("startSession setter en httpOnly-cookie som gir brukeren", async () => {
    const signedIn = signUp();
    await startSession(signedIn);
    const cookie = state.cookies.get(SESSION_COOKIE)!;
    expect(cookie.value).toBe(signedIn.token);
    expect(cookie.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      expires: signedIn.expiresAt,
    });
    expect(await currentUser()).toEqual(signedIn.user);
    expect(await currentUserId()).toBe(signedIn.user.id);
  });

  it("cookien er Secure over https", async () => {
    state.proto = "https";
    await startSession(signUp());
    expect(state.cookies.get(SESSION_COOKIE)!.options).toMatchObject({ secure: true });
  });

  it("endSession sletter økten og cookien", async () => {
    const signedIn = signUp();
    await startSession(signedIn);
    await endSession();
    expect(state.cookies.has(SESSION_COOKIE)).toBe(false);
    state.cookies.set(SESSION_COOKIE, { value: signedIn.token });
    expect(await currentUser()).toBeNull();
  });
});
