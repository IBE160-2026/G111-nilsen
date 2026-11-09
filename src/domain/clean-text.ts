/**
 * Tekstrensing for oppskriftsdata fra nettet (AD-8): bare ren tekst slipper gjennom.
 * HTML-tagger fjernes, entiteter dekodes, usynlige tegn fjernes og blanke tegn slås sammen.
 * Alt er lineært i lengden på teksten og kaster aldri.
 */

// HTML 4 Latin-1-entiteter for U+00A0–U+00FF, i rekkefølge.
const LATIN1_NAMES =
  "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr " +
  "deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest " +
  "Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml " +
  "ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig " +
  "agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml " +
  "eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml";

const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map<string, string>([
  ...LATIN1_NAMES.split(" ").map((name, i): [string, string] => [
    name,
    String.fromCharCode(0xa0 + i),
  ]),
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["ensp", " "],
  ["emsp", " "],
  ["thinsp", " "],
  ["zwnj", "‌"],
  ["zwj", "‍"],
  ["ndash", "–"],
  ["mdash", "—"],
  ["lsquo", "‘"],
  ["rsquo", "’"],
  ["sbquo", "‚"],
  ["ldquo", "“"],
  ["rdquo", "”"],
  ["bdquo", "„"],
  ["bull", "•"],
  ["hellip", "…"],
  ["permil", "‰"],
  ["prime", "′"],
  ["Prime", "″"],
  ["minus", "−"],
  ["euro", "€"],
  ["trade", "™"],
]);

// Numeriske referanser 128–159 tolkes som Windows-1252, slik nettlesere gjør.
const WINDOWS_1252: Record<number, string> = {
  0x80: "€",
  0x82: "‚",
  0x83: "ƒ",
  0x84: "„",
  0x85: "…",
  0x86: "†",
  0x87: "‡",
  0x88: "ˆ",
  0x89: "‰",
  0x8a: "Š",
  0x8b: "‹",
  0x8c: "Œ",
  0x8e: "Ž",
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x95: "•",
  0x96: "–",
  0x97: "—",
  0x98: "˜",
  0x99: "™",
  0x9a: "š",
  0x9b: "›",
  0x9c: "œ",
  0x9e: "ž",
  0x9f: "Ÿ",
};

const ENTITY = /&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});/g;

// Styretegn (unntatt tab, linjeskift, VT, FF, CR), DEL, C1-styretegn, soft hyphen, nullbreddetegn,
// LRM/RLM/ALM og retningsstyring (bidi) som ikke hører hjemme i en oppskriftstekst.
// U+0085 (NEL) er et C1-tegn, men er egentlig et linjeskift: det gjøres om til mellomrom i
// `toPlain` før denne fjerningen, slik at «e\u0085f» ikke blir «ef».
const INVISIBLE =
  /[\u0000-\u0008\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2060\u2066-\u2069\u202a-\u202e\ufeff]/g;

// Tagger som gir linjeskift når tekst skal deles i steg.
const BLOCK_TAGS = new Set([
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
]);

/** Dekoder HTML-entiteter (navngitte og numeriske). Ukjente entiteter står uendret. */
export function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(ENTITY, (whole, body: string) => {
    if (body[0] !== "#") return NAMED_ENTITIES.get(body) ?? whole;
    const code =
      body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
    if (
      !Number.isFinite(code) ||
      code === 0 ||
      code > 0x10ffff ||
      (code >= 0xd800 && code <= 0xdfff)
    ) {
      return "";
    }
    return WINDOWS_1252[code] ?? String.fromCodePoint(code);
  });
}

function isTagStart(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z/!?]/.test(ch);
}

/**
 * Fjerner HTML-tagger, kommentarer og innholdet i `<script>`/`<style>`. Linjeskift-tagger
 * (`<br>`, `<p>` …) blir "\n" når `lineBreaks` er sann, ellers mellomrom; andre tagger forsvinner uten spor.
 * En `<` som ikke starter en tagg (for eksempel «< 5 g») beholdes.
 */
export function stripTags(text: string, lineBreaks: boolean): string {
  if (!text.includes("<")) return text;
  const blockText = lineBreaks ? "\n" : " ";
  let out = "";
  let pos = 0;
  while (pos < text.length) {
    const lt = text.indexOf("<", pos);
    if (lt === -1) break;
    if (!isTagStart(text[lt + 1])) {
      out += text.slice(pos, lt + 1);
      pos = lt + 1;
      continue;
    }
    out += text.slice(pos, lt);

    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      if (end === -1) return out; // ulukket kommentar: resten er ikke tekst
      pos = end + 3;
      continue;
    }
    const gt = text.indexOf(">", lt + 1);
    if (gt === -1) {
      // Ingen flere «>» finnes, så ingen flere tagger kan lukkes: resten er vanlig tekst.
      out += text.slice(lt);
      return out;
    }
    const name = /^\/?([A-Za-z][A-Za-z0-9]*)/.exec(text.slice(lt + 1, lt + 40))?.[1]?.toLowerCase();
    pos = gt + 1;
    if (name === "script" || name === "style") {
      if (text[lt + 1] !== "/") {
        // Hopp over hele elementet. Finnes ingen avsluttende tagg, forsvinner resten.
        const close = new RegExp(`</${name}[\\s>/]`, "gi");
        close.lastIndex = pos;
        const m = close.exec(text);
        if (!m) return out;
        const closeEnd = text.indexOf(">", m.index);
        if (closeEnd === -1) return out;
        pos = closeEnd + 1;
      }
      continue;
    }
    if (name !== undefined && BLOCK_TAGS.has(name)) out += blockText;
  }
  return out + text.slice(pos);
}

/** Felles rensing: tagger bort, entiteter dekodet, usynlige tegn bort, NFC. Beholder linjeskift. */
function toPlain(raw: string, lineBreaks: boolean): string {
  let text = stripTags(raw, lineBreaks);
  text = decodeEntities(text);
  // Kodet HTML («&lt;p&gt;») blir tagger etter dekoding; fjern dem også, en runde om gangen.
  for (let round = 0; round < 3 && text.includes("<"); round++) {
    const stripped = stripTags(text, lineBreaks);
    if (stripped === text) break;
    text = stripped;
  }
  return text.replaceAll("\u0085", " ").replace(INVISIBLE, "").normalize("NFC");
}

/** Én linje ren tekst: alle blanke tegn (også linjeskift og nbsp) blir ett mellomrom, trimmet. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return toPlain(value, false).replace(/\s+/g, " ").trim();
}

/**
 * Ren tekst delt i linjer: linjeskift, `<br>` og `</p>` skiller linjer. Hver linje er trimmet og
 * har sammenslåtte blanke tegn; tomme linjer fjernes.
 */
export function cleanLines(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return toPlain(value, true)
    .split(/\r\n|[\n\r\u2028\u2029]/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "");
}
