import { describe, expect, it } from "vitest";
import { getRecipeFetcher } from "./recipe-fetcher";

describe("getRecipeFetcher", () => {
  it("fixtures gir fixture-adapteren: en lagret side hentes uten nett", async () => {
    const result = await getRecipeFetcher("fixtures").fetch(
      "https://www.matprat.no/oppskrifter/familien/rundstykker/",
    );
    expect(result.ok).toBe(true);
  });

  it("http (og alt annet) gir HTTP-adapteren, som avviser lokale adresser", async () => {
    for (const source of ["http", "", "noe-annet"]) {
      const result = await getRecipeFetcher(source).fetch("http://127.0.0.1:9/");
      expect(result).toEqual({ ok: false, error: { kind: "fetch_failed", detail: "blocked" } });
    }
  });

  it("standard kommer fra konfigurasjonen (http uten IMPORT_SOURCE)", async () => {
    const result = await getRecipeFetcher().fetch("http://localhost/");
    expect(result.ok).toBe(false);
  });
});
