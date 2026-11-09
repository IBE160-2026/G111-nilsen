import { describe, expect, it } from "vitest";
import { isHttpUrl, MAX_URL_LENGTH, normalizeSourceUrl, validateUrl } from "./source-url";

function valid(input: string): string {
  const result = validateUrl(input);
  if (!result.ok) throw new Error(`forventet gyldig: ${JSON.stringify(input)}`);
  return result.value;
}

describe("validateUrl", () => {
  it.each([
    ["https://www.matprat.no/oppskrifter/x/", "https://www.matprat.no/oppskrifter/x/"],
    ["http://a.no", "http://a.no/"],
    ["HTTPS://A.NO/Sti", "https://a.no/Sti"],
    ["  https://a.no/x  ", "https://a.no/x"],
  ])("godtar %j", (input, expected) => {
    expect(valid(input)).toBe(expected);
  });

  describe("trimming", () => {
    it.each([
      [" https://a.no/x ", "hardt mellomrom"],
      ["​https://a.no/x​", "nullbredde-mellomrom"],
      ["﻿https://a.no/x", "BOM"],
      ["\n\t https://a.no/x \r\n", "linjeskift og tabulator"],
      [" https://a.no/x ", "linje- og avsnittsskille"],
      ['"https://a.no/x"', "anførselstegn"],
      ["'https://a.no/x'", "enkle anførselstegn"],
      ["“https://a.no/x”", "typografiske anførselstegn"],
      ["«https://a.no/x»", "norske anførselstegn"],
      ["<https://a.no/x>", "<…>"],
      [' ​"<https://a.no/x>"​ ', "flere lag"],
    ])("fjerner omsluttende tegn: %j (%s)", (input) => {
      expect(valid(input)).toBe("https://a.no/x");
    });
  });

  describe("mangler skjema", () => {
    it.each([
      ["www.matprat.no/oppskrifter/x", "https://www.matprat.no/oppskrifter/x"],
      ["matprat.no/x", "https://matprat.no/x"],
      ["matprat.no", "https://matprat.no/"],
      ["matprat.no:8080/x", "https://matprat.no:8080/x"],
      ["//www.godt.no/x", "https://www.godt.no/x"],
      ["mat.xn--rksmrgs-5wao1o.no/x", "https://mat.xn--rksmrgs-5wao1o.no/x"],
      ["bokmål.no/x", "https://xn--bokml-pra.no/x"],
    ])("setter https:// foran %j", (input, expected) => {
      expect(valid(input)).toBe(expected);
    });
  });

  describe("ugyldig", () => {
    it.each([
      "",
      "   ",
      "hei",
      "hei verden",
      "ftp://a.no",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "mailto:a@b.no",
      "http://",
      "https://",
      "http:///",
      "https://u:p@a.no",
      "https://user@a.no:pw@b.no",
      "https://:pw@a.no",
      "https://a b.no/",
      "1.5 dl melk",
      "http://[::1",
      "a.no/ x",
    ])("%j gir invalid_url", (input) => {
      expect(validateUrl(input)).toEqual({ ok: false, error: { kind: "invalid_url" } });
    });

    it("avviser alt som ikke er tekst", () => {
      for (const value of [null, undefined, 42, {}, []]) {
        expect(validateUrl(value as unknown as string).ok).toBe(false);
      }
    });

    it("grense: nøyaktig 2048 tegn godtas, 2049 gir invalid_url", () => {
      const base = "https://a.no/";
      expect(validateUrl(base + "x".repeat(MAX_URL_LENGTH - base.length)).ok).toBe(true);
      expect(validateUrl(base + "x".repeat(MAX_URL_LENGTH - base.length + 1)).ok).toBe(false);
    });

    it("avviser en lenke som blir lengre enn 2048 tegn etter normalisering", () => {
      const spaces = "https://a.no/" + " ".repeat(1500).replace(/ /g, "å");
      expect(spaces.length).toBeLessThan(MAX_URL_LENGTH);
      expect(validateUrl(spaces).ok).toBe(false);
    });
  });

  describe("IP-former normaliseres av URL-parseren (adapteren avviser dem senere)", () => {
    it.each([
      ["http://2130706433/", "http://127.0.0.1/"],
      ["http://0x7f.1/", "http://127.0.0.1/"],
      ["http://127.1/", "http://127.0.0.1/"],
      ["http://0177.0.0.1/", "http://127.0.0.1/"],
      ["http://[::1]/", "http://[::1]/"],
      ["http://[::ffff:127.0.0.1]/", "http://[::ffff:7f00:1]/"],
      ["127.0.0.1:8080/x", "https://127.0.0.1:8080/x"],
    ])("%j ender som %j", (input, expected) => {
      expect(valid(input)).toBe(expected);
    });
  });
});

describe("normalizeSourceUrl: avsluttende punktum i vert", () => {
  it("«matprat.no.» og «matprat.no» er samme adresse", () => {
    expect(normalizeSourceUrl("https://matprat.no./x")).toBe("https://matprat.no/x");
  });
});

describe("validateUrl: uforholdsmessig lang tekst", () => {
  it("avvises uten å trimmes", () => {
    expect(validateUrl(`${" ".repeat(5000)}https://a.no`)).toEqual({
      ok: false,
      error: { kind: "invalid_url" },
    });
  });
});

describe("normalizeSourceUrl", () => {
  it.each([
    ["fjerner fragment", "https://a.no/x#steg-2", "https://a.no/x"],
    ["fjerner utm_*", "https://a.no/x?utm_source=a&utm_medium=b&utm_foo=c", "https://a.no/x"],
    ["utm_ uavhengig av store bokstaver", "https://a.no/x?UTM_Source=a", "https://a.no/x"],
    [
      "fjerner kjente sporingsparametere",
      "https://a.no/x?fbclid=1&gclid=2&gbraid=3&wbraid=4&msclkid=5&mc_cid=6&mc_eid=7&igshid=8&ref=9&ref_src=10&_ga=11&yclid=12&dclid=13&twclid=14&ttclid=15&srsltid=16",
      "https://a.no/x",
    ],
    [
      "beholder øvrige parametere i rekkefølge",
      "https://a.no/x?b=2&utm_x=1&a=1",
      "https://a.no/x?b=2&a=1",
    ],
    ["fjerner tom ?", "https://a.no/x?", "https://a.no/x"],
    ["fjerner ? når bare sporing er igjen", "https://a.no/x?utm_source=a#f", "https://a.no/x"],
    ["små bokstaver i skjema og vert", "HTTPS://WWW.A.NO/Sti", "https://www.a.no/Sti"],
    ["fjerner :443 på https", "https://a.no:443/x", "https://a.no/x"],
    ["fjerner :80 på http", "http://a.no:80/x", "http://a.no/x"],
    ["beholder :80 på https", "https://a.no:80/x", "https://a.no:80/x"],
    ["tom sti: uten og med /", "https://a.no", "https://a.no/"],
    ["tom sti: med /", "https://a.no/", "https://a.no/"],
    ["tom sti med tom ? og fragment", "https://a.no/?#x", "https://a.no/"],
    [
      "beholder sti med store bokstaver",
      "https://a.no/Oppskrift/Pannekaker",
      "https://a.no/Oppskrift/Pannekaker",
    ],
    ["beholder avsluttende / på ikke-tom sti", "https://a.no/x/", "https://a.no/x/"],
    ["beholder sti uten avsluttende /", "https://a.no/x", "https://a.no/x"],
    ["beholder http", "http://a.no/x", "http://a.no/x"],
    [
      "ref som del av et lengre navn beholdes",
      "https://a.no/x?reference=1&id=7",
      "https://a.no/x?reference=1&id=7",
    ],
    ["kodet sporingsnavn fjernes", "https://a.no/x?utm%5Fsource=a&id=7", "https://a.no/x?id=7"],
    ["tomme deler fjernes", "https://a.no/x?&&id=7&", "https://a.no/x?id=7"],
    ["parameter uten verdi beholdes", "https://a.no/x?print&utm_x=1", "https://a.no/x?print"],
  ])("%s", (_name, input, expected) => {
    expect(normalizeSourceUrl(input)).toBe(expected);
  });

  it("to ulike stier er to ulike adresser", () => {
    expect(normalizeSourceUrl("https://a.no/a")).not.toBe(normalizeSourceUrl("https://a.no/A"));
    expect(normalizeSourceUrl("https://a.no/a")).not.toBe(normalizeSourceUrl("https://a.no/a/"));
  });

  it("http og https er ulike", () => {
    expect(normalizeSourceUrl("http://a.no/x")).not.toBe(normalizeSourceUrl("https://a.no/x"));
  });

  it("er idempotent", () => {
    for (const input of [
      "https://A.no:443/Sti/?b=2&utm_x=1&a=%C3%A5#frag",
      "http://a.no?",
      "https://a.no/x?fbclid=1",
      "https://a.no/ø?q=æ ø",
      "ikke en url",
    ]) {
      const once = normalizeSourceUrl(input);
      expect(normalizeSourceUrl(once)).toBe(once);
    }
  });

  it("returnerer tekst som ikke er en URL uendret", () => {
    expect(normalizeSourceUrl("ikke en url")).toBe("ikke en url");
  });

  it("samme adresse med annet fragment og sporing gir samme resultat", () => {
    expect(normalizeSourceUrl("https://www.matprat.no/oppskrifter/x/?utm_source=a#b")).toBe(
      normalizeSourceUrl("https://www.matprat.no/oppskrifter/x/"),
    );
  });
});

describe("isHttpUrl", () => {
  it.each([
    ["https://a.no", true],
    ["http://a.no/x", true],
    ["javascript:alert(1)", false],
    ["data:text/html,x", false],
    ["file:///etc/passwd", false],
    ["ikke en url", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("%j gir %s", (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected);
  });
});
