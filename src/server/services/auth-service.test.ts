import { describe, expect, it } from "vitest";
import { createTestDb, TEST_USER_ID } from "../db/client";
import { insertRecipe } from "../db/repositories/recipe-repository";
import {
  hashPassword,
  hashToken,
  logIn,
  logOut,
  register,
  SESSION_MAX_AGE_MS,
  userForToken,
  verifyPassword,
} from "./auth-service";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const at = (date: Date) => () => date;

describe("hashPassword og verifyPassword", () => {
  it("godtar riktig passord og avviser feil, med nytt salt hver gang", () => {
    const hash = hashPassword("hemmelig123");
    expect(hash).toMatch(/^scrypt\$[\w-]+\$[\w-]+$/);
    expect(hash).not.toContain("hemmelig123");
    expect(verifyPassword("hemmelig123", hash)).toBe(true);
    expect(verifyPassword("hemmelig124", hash)).toBe(false);
    expect(hashPassword("hemmelig123")).not.toBe(hash);
  });

  it("avviser ugyldig lagret format uten å kaste", () => {
    for (const stored of ["", "x", "md5$a$b", "scrypt$$", "scrypt$abc$kort"]) {
      expect(verifyPassword("hemmelig123", stored)).toBe(false);
    }
  });
});

describe("register", () => {
  it("lager konto med normalisert e-post og gir en økt", () => {
    const db = createTestDb({ users: false });
    const result = register("  Maja@Eksempel.NO ", "hemmelig123", db, at(NOW));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.email).toBe("maja@eksempel.no");
    expect(result.value.token.length).toBeGreaterThan(30);
    expect(result.value.expiresAt.getTime()).toBe(NOW.getTime() + SESSION_MAX_AGE_MS);
    const row = db.$client.prepare("select password_hash as h from users").get() as { h: string };
    expect(row.h).not.toContain("hemmelig123");
    const session = db.$client.prepare("select token_hash as t from sessions").get() as {
      t: string;
    };
    expect(session.t).toBe(hashToken(result.value.token));
    expect(session.t).not.toBe(result.value.token);
  });

  it.each([
    ["ikke-en-epost", "hemmelig123", "email_invalid"],
    ["a@b", "hemmelig123", "email_invalid"],
    ["", "hemmelig123", "email_invalid"],
    ["maja@eksempel.no", "kort", "password_too_short"],
    ["maja@eksempel.no", "x".repeat(201), "password_too_long"],
  ])("%j / passord gir %s", (email, password, detail) => {
    const db = createTestDb({ users: false });
    expect(register(email, password, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail },
    });
    expect(db.$client.prepare("select count(*) as n from users").get()).toEqual({ n: 0 });
  });

  it("samme e-post to ganger gir email_taken", () => {
    const db = createTestDb({ users: false });
    register("maja@eksempel.no", "hemmelig123", db);
    expect(register("MAJA@eksempel.no", "annetpassord", db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "email_taken" },
    });
  });

  it("den første kontoen overtar lagrede oppskrifter, mapper og «Har hjemme» uten eier", () => {
    const db = createTestDb({ users: false });
    const base = {
      sourceUrl: null,
      sourceName: null,
      originalServings: 4,
      selectedServings: null,
      createdAt: "x",
      updatedAt: "x",
      ingredients: [],
      steps: [],
    };
    const saved = insertRecipe(db, { ...base, title: "Lagret", savedAt: "x" });
    const unsaved = insertRecipe(db, { ...base, title: "Ulagret", savedAt: null });
    db.$client
      .prepare("insert into folders (name, name_key, created_at) values ('Middag', 'middag', 'x')")
      .run();
    db.$client
      .prepare("insert into pantry_items (name, name_key, created_at) values ('Salt', 'salt', 'x')")
      .run();

    const first = register("maja@eksempel.no", "hemmelig123", db);
    if (!first.ok) throw new Error("feil");
    const owner = (id: number) =>
      (
        db.$client.prepare("select user_id as u from recipes where id = ?").get(id) as {
          u: number | null;
        }
      ).u;
    expect(owner(saved)).toBe(first.value.user.id);
    expect(owner(unsaved)).toBeNull();
    expect(db.$client.prepare("select user_id as u from folders").get()).toEqual({
      u: first.value.user.id,
    });
    expect(db.$client.prepare("select user_id as u from pantry_items").get()).toEqual({
      u: first.value.user.id,
    });

    // Konto nummer to overtar ingenting.
    const later = insertRecipe(db, { ...base, title: "Senere", savedAt: "x" });
    const second = register("ola@eksempel.no", "hemmelig123", db);
    if (!second.ok) throw new Error("feil");
    expect(owner(later)).toBeNull();
  });
});

describe("logIn, userForToken og logOut", () => {
  function account() {
    const db = createTestDb({ users: false });
    const created = register("maja@eksempel.no", "hemmelig123", db, at(NOW));
    if (!created.ok) throw new Error("feil");
    return { db, user: created.value.user };
  }

  it("logger inn med riktig passord, uavhengig av store bokstaver i e-posten", () => {
    const { db, user } = account();
    const result = logIn("MAJA@eksempel.no ", "hemmelig123", db, at(NOW));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user).toEqual(user);
    expect(userForToken(result.value.token, db, at(NOW))).toEqual(user);
  });

  it("feil passord og ukjent e-post gir samme svar", () => {
    const { db } = account();
    const wrong = { ok: false, error: { kind: "validation", detail: "wrong_credentials" } };
    expect(logIn("maja@eksempel.no", "feilpassord", db)).toEqual(wrong);
    expect(logIn("ukjent@eksempel.no", "hemmelig123", db)).toEqual(wrong);
    expect(logIn(undefined as unknown as string, undefined as unknown as string, db)).toEqual(
      wrong,
    );
  });

  it("en økt utløper etter 30 dager, og ukjent eller tomt token gir null", () => {
    const { db, user } = account();
    const result = logIn("maja@eksempel.no", "hemmelig123", db, at(NOW));
    if (!result.ok) throw new Error("feil");
    const later = new Date(NOW.getTime() + SESSION_MAX_AGE_MS - 1000);
    const expired = new Date(NOW.getTime() + SESSION_MAX_AGE_MS + 1000);
    expect(userForToken(result.value.token, db, at(later))).toEqual(user);
    expect(userForToken(result.value.token, db, at(expired))).toBeNull();
    expect(userForToken("ukjent", db)).toBeNull();
    expect(userForToken(undefined, db)).toBeNull();
    expect(userForToken("", db)).toBeNull();
  });

  it("logg ut sletter økten", () => {
    const { db } = account();
    const result = logIn("maja@eksempel.no", "hemmelig123", db, at(NOW));
    if (!result.ok) throw new Error("feil");
    logOut(result.value.token, db);
    expect(userForToken(result.value.token, db, at(NOW))).toBeNull();
    expect(() => logOut(undefined, db)).not.toThrow();
  });

  it("innlogging rydder bort utløpte økter", () => {
    const { db } = account();
    const late = new Date(NOW.getTime() + 2 * SESSION_MAX_AGE_MS);
    logIn("maja@eksempel.no", "hemmelig123", db, at(late));
    expect(db.$client.prepare("select count(*) as n from sessions").get()).toEqual({ n: 1 });
  });
});

describe("createTestDb", () => {
  it("har testbrukeren som standard", () => {
    const db = createTestDb();
    expect(db.$client.prepare("select id from users").all()).toEqual([{ id: TEST_USER_ID }]);
  });
});
