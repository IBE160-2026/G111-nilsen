import { describe, expect, it } from "vitest";
import { cleanLines, cleanText, decodeEntities, stripTags } from "./clean-text";

describe("decodeEntities", () => {
  it.each([
    ["Sm&oslash;r &amp; sukker", "Smør & sukker"],
    ["&quot;hei&quot;", '"hei"'],
    ["it&#39;s", "it's"],
    ["it&#x27;s", "it's"],
    ["it&#X27;s", "it's"],
    ["a&nbsp;b", "a b"],
    ["&aelig;&oslash;&aring; &AElig;&Oslash;&Aring;", "æøå ÆØÅ"],
    ["&eacute;&uuml;&szlig;&ntilde;", "éüßñ"],
    ["&apos;hei&apos;", "'hei'"],
    ["&frac12; &deg;C &times; &laquo;x&raquo;", "½ °C × «x»"],
    ["&ndash; &mdash; &hellip; &euro;", "– — … €"],
    ["&lt;b&gt;", "<b>"],
    ["&#8211;", "–"],
    ["&#150;", "–"], // Windows-1252
    ["&#128512;", "😀"],
  ])("%s", (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });

  it("dekoder bare én runde (ingen dobbel dekoding)", () => {
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
    expect(decodeEntities("&amp;amp;")).toBe("&amp;");
  });

  it.each([
    "&foo;",
    "Tom &amp Jerry",
    "&;",
    "& co",
    "&#;",
    "&#xZZ;",
    "&averyveryveryveryveryverylongname1234567;",
  ])("lar ukjent eller ufullstendig entitet stå: %s", (input) => {
    expect(decodeEntities(input)).toBe(input);
  });

  it("entitetsnavn er opptil 32 tegn; lengre navn dekodes ikke (ingen kjent entitet er så lang)", () => {
    const name31 = `a${"b".repeat(31)}`; // 32 tegn: innenfor grensen, men ukjent
    const name35 = `a${"b".repeat(34)}`; // 35 tegn: utenfor grensen
    expect(decodeEntities(`&${name31};`)).toBe(`&${name31};`);
    expect(decodeEntities(`&${name35};`)).toBe(`&${name35};`);
    // Teksten rundt påvirkes ikke, og en kjent entitet rett etter dekodes fortsatt.
    expect(decodeEntities(`&${name35};&amp;`)).toBe(`&${name35};&`);
  });

  it("numeriske referanser: opptil 6 hex-sifre og 7 desimalsifre", () => {
    expect(decodeEntities("&#0000065;")).toBe("A"); // 7 desimalsifre
    expect(decodeEntities("&#00000065;")).toBe("&#00000065;"); // 8: for langt
    expect(decodeEntities("&#x000041;")).toBe("A"); // 6 hex-sifre
    expect(decodeEntities("&#x0000041;")).toBe("&#x0000041;"); // 7: for langt
  });

  it.each(["&#0;", "&#x110000;", "&#xD800;", "&#9999999;"])(
    "fjerner ugyldig kodepunkt: %s",
    (input) => {
      expect(decodeEntities(`a${input}b`)).toBe("ab");
    },
  );
});

describe("stripTags", () => {
  it("fjerner tagger og beholder teksten", () => {
    expect(stripTags("a <b>fet</b> og <a href='x'>lenke</a>", false)).toBe("a fet og lenke");
  });

  it("gjør linjeskift-tagger til linjeskift eller mellomrom", () => {
    expect(stripTags("a<br>b<br/>c<p>d</p>e", true)).toBe("a\nb\nc\nd\ne");
    expect(stripTags("a<br>b</p>c", false)).toBe("a b c");
  });

  // Kopi av BLOCK_TAGS i clean-text.ts: en endring der må gjøres her også.
  const BLOCK_TAGS = [
    "br",
    "p",
    "div",
    "li",
    "ul",
    "ol",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "tr",
    "table",
    "section",
  ];

  it.each(BLOCK_TAGS)("«%s» gir linjeskift (eller mellomrom), også som sluttagg", (tag) => {
    expect(stripTags(`a<${tag}>b`, true)).toBe("a\nb");
    expect(stripTags(`a</${tag}>b`, true)).toBe("a\nb");
    expect(stripTags(`a<${tag.toUpperCase()} class="x">b`, true)).toBe("a\nb");
    expect(stripTags(`a<${tag}>b`, false)).toBe("a b");
    expect(cleanLines(`a<${tag}>b`)).toEqual(["a", "b"]);
  });

  it.each(["span", "b", "i", "a", "strong", "em", "img", "td", "font"])(
    "«%s» er ikke en linjeskift-tagg",
    (tag) => {
      expect(stripTags(`a<${tag}>b`, true)).toBe("ab");
      expect(stripTags(`a<${tag}>b`, false)).toBe("ab");
    },
  );

  it("fjerner innholdet i script og style", () => {
    expect(stripTags("a<script>alert(1)</script>b<style>p{}</style>c", false)).toBe("abc");
    expect(stripTags("a<SCRIPT type='x'>x</SCRIPT >b", false)).toBe("ab");
  });

  it("fjerner resten når script ikke avsluttes", () => {
    expect(stripTags("a<script>alert(1)", false)).toBe("a");
  });

  it("beholder ikke-tagger som «<»", () => {
    expect(stripTags("5 < 6 og 7 > 3", false)).toBe("5 < 6 og 7 > 3");
    expect(stripTags("temp <200 grader", false)).toBe("temp <200 grader");
  });

  it("fjerner kommentarer, og resten ved ulukket kommentar", () => {
    expect(stripTags("a<!-- skjult -->b", false)).toBe("ab");
    expect(stripTags("a<!-- skjult", false)).toBe("a");
  });

  it("beholder resten når en tagg aldri lukkes", () => {
    expect(stripTags("a <b uten slutt", false)).toBe("a <b uten slutt");
  });
});

describe("cleanText", () => {
  it("rydder opp i entiteter, tagger og blanke tegn", () => {
    expect(cleanText("Sm&oslash;r &amp; <b>sukker</b>")).toBe("Smør & sukker");
    expect(cleanText("  a \n\t b  c&nbsp;d  ")).toBe("a b c d");
  });

  it("beholder teksten inni lenker, men ikke taggen eller URL-en", () => {
    const out = cleanText('Se <a href="javascript:alert(1)">oppskriften</a> her');
    expect(out).toBe("Se oppskriften her");
    expect(out).not.toContain("javascript");
  });

  it("fjerner bilder og script", () => {
    expect(cleanText("<img src=x onerror=alert(1)>Hei")).toBe("Hei");
    expect(cleanText("<script>alert(1)</script>Hei")).toBe("Hei");
  });

  it("fjerner også kodet HTML etter dekoding", () => {
    expect(cleanText("&lt;p&gt;Hei&lt;/p&gt;")).toBe("Hei");
    expect(cleanText("&lt;script&gt;alert(1)&lt;/script&gt;ok")).toBe("ok");
    expect(cleanText("&lt;img src=x onerror=alert(1)&gt;ok")).toBe("ok");
  });

  it("kodet HTML fjernes i opptil tre runder (hver runde tar ett lag)", () => {
    // Dekodet: «<<b>b>x» og «<<<b>b>b>x». Hver runde fjerner bare den innerste taggen.
    expect(cleanText("&lt;&lt;b&gt;b&gt;x")).toBe("x"); // krever runde 2
    expect(cleanText("&lt;&lt;&lt;b&gt;b&gt;b&gt;x")).toBe("x"); // krever runde 3
    // Fire lag er over grensen: det siste laget blir stående (som tekst, aldri tolket som HTML).
    expect(cleanText("&lt;&lt;&lt;&lt;b&gt;b&gt;b&gt;b&gt;x")).toBe("<b>x");
  });

  it("dekoder bare én gang, så dobbelt kodet HTML blir stående som tekst", () => {
    expect(cleanText("&amp;amp;lt;script&amp;amp;gt;")).toBe("&amp;lt;script&amp;gt;");
    expect(cleanText("&amp;lt;p&amp;gt;")).toBe("&lt;p&gt;");
  });

  it("lar ikke innpakkede tagger gjenoppstå", () => {
    expect(cleanText("<<b>b>tekst")).not.toContain("<b>");
  });

  it("fjerner usynlige styretegn og retningsstyring", () => {
    expect(cleanText("a​b­c﻿d\u0007e‮f⁦g")).toBe("abcdefg");
  });

  it.each([
    ["DEL", "\u007f"],
    ["C0 U+001F", "\u001f"],
    ["C0 U+0008", "\u0008"],
    ["C0 U+000E", "\u000e"],
    ["C0 U+0000", "\u0000"],
    ["C1 U+0080", "\u0080"],
    ["C1 U+009F", "\u009f"],
    ["soft hyphen", "\u00ad"],
    ["nullbredde-mellomrom U+200B", "\u200b"],
    ["ZWNJ", "\u200c"],
    ["ZWJ", "\u200d"],
    ["LRM", "\u200e"],
    ["RLM", "\u200f"],
    ["ALM", "\u061c"],
    ["ordforbinder U+2060", "\u2060"],
    ["bidi-isolasjon U+2066", "\u2066"],
    ["bidi-isolasjon U+2069", "\u2069"],
    ["bidi U+202A", "\u202a"],
    ["bidi U+202E", "\u202e"],
    ["BOM", "\ufeff"],
  ])("fjerner usynlig tegn: %s", (_label, ch) => {
    expect(cleanText(`e${ch}f`)).toBe("ef");
    expect(cleanLines(`e${ch}f\ng`)).toEqual(["ef", "g"]);
  });

  it("NEL (U+0085) blir mellomrom, ikke borte", () => {
    expect(cleanText("e\u0085f")).toBe("e f");
    expect(cleanLines("e\u0085f")).toEqual(["e f"]);
  });

  it.each([
    ["tab", "\t"],
    ["linjeskift", "\n"],
    ["VT", "\u000b"],
    ["FF", "\u000c"],
    ["CR", "\r"],
  ])("beholder blanke tegn som mellomrom: %s", (_label, ch) => {
    expect(cleanText(`e${ch}f`)).toBe("e f");
  });

  it("normaliserer til NFC", () => {
    expect(cleanText("ö")).toBe("ö");
  });

  it.each([undefined, null, 5, true, {}, [], ["a"]])(
    "gir tom streng for ikke-streng: %j",
    (value) => {
      expect(cleanText(value)).toBe("");
    },
  );
});

describe("cleanLines", () => {
  it("deler på linjeskift, br og p", () => {
    expect(cleanLines("a\nb\r\nc\rd")).toEqual(["a", "b", "c", "d"]);
    expect(cleanLines("a<br>b<br />c<p>d</p><p>e</p>")).toEqual(["a", "b", "c", "d", "e"]);
    expect(cleanLines("a b")).toEqual(["a", "b"]);
  });

  it("trimmer, slår sammen blanke tegn og fjerner tomme linjer", () => {
    expect(cleanLines("  a   b \n\n \t \n c&nbsp;")).toEqual(["a b", "c"]);
  });

  it("gir tom liste for tomt og for ikke-streng", () => {
    expect(cleanLines("")).toEqual([]);
    expect(cleanLines(" \n ")).toEqual([]);
    expect(cleanLines(null)).toEqual([]);
    expect(cleanLines(["a"])).toEqual([]);
  });
});
