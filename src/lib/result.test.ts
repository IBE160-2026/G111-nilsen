import { describe, expect, it } from "vitest";
import { appError, err, ok, type Result } from "./result";

describe("result", () => {
  it("ok() pakker en verdi", () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });

  it("err() pakker en feil", () => {
    expect(err(appError("validation", "title"))).toEqual({
      ok: false,
      error: { kind: "validation", detail: "title" },
    });
  });

  it("appError() utelater detail når den ikke er gitt", () => {
    expect(appError("not_found")).toEqual({ kind: "not_found" });
    expect("detail" in appError("not_found")).toBe(false);
  });

  it("kan snevres inn med ok-feltet", () => {
    const parse = (s: string): Result<number> =>
      Number.isNaN(Number(s)) ? err(appError("validation")) : ok(Number(s));

    const good = parse("3");
    const bad = parse("x");
    expect(good.ok && good.value).toBe(3);
    expect(!bad.ok && bad.error.kind).toBe("validation");
  });
});
