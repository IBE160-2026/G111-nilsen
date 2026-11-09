import { importOk, noRecipe } from "./import-types";
import type { ImportResult, RecipeNode } from "./import-types";

// Hvor dypt vi leter i lister og `@graph` etter en Recipe. Reelle sider bruker 1–3 nivåer.
const MAX_SEARCH_DEPTH = 8;
// Lengste tillatte tag-tekst mellom «<script» og «>»; lengre er ikke en vanlig script-tag.
const MAX_TAG_LENGTH = 4096;

const TYPE_ATTRIBUTE = /(?:^|[\s"'/])type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;
// Full URL eller prefiks er lov: «Recipe», «https://schema.org/Recipe», «schema:Recipe».
const RECIPE_TYPE = /^(?:https?:\/\/(?:www\.)?schema\.org\/|schema:)?Recipe$/;

/**
 * Finner første schema.org `Recipe` i `<script type="application/ld+json">`-blokker i HTML.
 * Kaster aldri: ugyldig input, ugyldig JSON og for dype strukturer gir `no_recipe`.
 * Skanningen bruker bare `indexOf` (med mellomlagret «>»-posisjon) og enkle regexer uten bakoversøk, så tiden vokser lineært
 * med størrelsen på siden.
 */
export function extractRecipeJsonLd(html: string): ImportResult<RecipeNode> {
  try {
    if (typeof html !== "string") return noRecipe();
    for (const block of jsonLdBlocks(html)) {
      const parsed = parseLenient(block);
      if (parsed === undefined) continue;
      const node = findRecipe(parsed, 0);
      if (node) return importOk(node);
    }
  } catch {
    // Sikkerhetsnett (for eksempel stackoverflow i JSON.parse): behandles som «ingen oppskrift».
  }
  return noRecipe();
}

/** Innholdet i hver JSON-LD-blokk, i dokumentrekkefølge. */
function* jsonLdBlocks(html: string): Generator<string> {
  // Egne regexer per kall, siden `lastIndex` er tilstand.
  const scriptOpen = /<script/gi;
  const scriptClose = /<\/script/gi;
  // Posisjonen til nærmeste «>» vi har funnet. Uten mellomlagring skannet hver «<script» helt til
  // slutten av dokumentet når det ikke fantes noen «>», og tiden ble kvadratisk. Er posisjonen
  // fortsatt på eller etter denne taggens start, er den også denne taggens første «>».
  let cachedTagEnd = -2; // -2: ikke søkt ennå, -1: ingen flere «>» i dokumentet
  let open: RegExpExecArray | null;
  while ((open = scriptOpen.exec(html)) !== null) {
    const afterName = open.index + open[0].length;
    const next = html.charAt(afterName);
    // «<scripts» og lignende er ikke en script-tag.
    if (next !== "" && !/[\s/>]/.test(next)) continue;

    if (cachedTagEnd === -2 || (cachedTagEnd !== -1 && cachedTagEnd < afterName)) {
      cachedTagEnd = html.indexOf(">", afterName);
    }
    const tagEnd = cachedTagEnd;
    if (tagEnd === -1) return; // ingen flere tagger i dokumentet
    if (tagEnd - afterName > MAX_TAG_LENGTH) continue;

    if (!isJsonLdType(html.slice(afterName, tagEnd))) continue;

    scriptClose.lastIndex = tagEnd + 1;
    const close = scriptClose.exec(html);
    if (!close) return; // avkortet side: resten er ikke en komplett blokk
    yield html.slice(tagEnd + 1, close.index);
    scriptOpen.lastIndex = close.index;
  }
}

function isJsonLdType(attributes: string): boolean {
  const match = attributes.match(TYPE_ATTRIBUTE);
  if (!match) return false;
  const value = (match[1] ?? match[2] ?? match[3] ?? "").trim().toLowerCase();
  // Parametere som «; charset=utf-8» ignoreres.
  return value.split(";")[0].trim() === "application/ld+json";
}

/** JSON.parse med et lite sett vanlige, ufarlige utbedringer. `undefined` hvis det fortsatt feiler. */
function parseLenient(raw: string): unknown {
  const text = stripWrappers(raw);
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Prøv igjen med rå kontrolltegn (linjeskift, tabulator) inne i strenger utbedret.
  }
  try {
    return JSON.parse(escapeControlCharsInStrings(text));
  } catch {
    return undefined;
  }
}

/** Fjerner BOM og kommentar-/CDATA-innpakning rundt JSON. */
function stripWrappers(raw: string): string {
  let text = raw.replace(/^﻿/, "").trim();
  for (let round = 0; round < 3; round++) {
    const before = text;
    const head = text.slice(0, 64);
    const headMatch = head.match(
      /^(?:<!--|\/\/\s*<!\[CDATA\[|\/\*\s*<!\[CDATA\[\s*\*\/|<!\[CDATA\[)\s*/,
    );
    if (headMatch) text = text.slice(headMatch[0].length);

    const tailStart = Math.max(0, text.length - 64);
    const tail = text.slice(tailStart);
    const tailMatch = tail.match(/\s*(?:-->|\/\/\s*\]\]>|\/\*\s*\]\]>\s*\*\/|\]\]>)$/);
    if (tailMatch) text = text.slice(0, tailStart + (tailMatch.index ?? tail.length));

    text = text.trim();
    if (text === before) break;
  }
  return text;
}

const CONTROL_ESCAPES: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };

/** Erstatter rå kontrolltegn inne i JSON-strenger med escape-sekvenser. Rører ikke noe annet. */
function escapeControlCharsInStrings(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      escaped = false;
      out += ch;
    } else if (ch === "\\") {
      escaped = true;
      out += ch;
    } else if (ch === '"') {
      inString = false;
      out += ch;
    } else if (ch < " ") {
      out += CONTROL_ESCAPES[ch] ?? `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
    } else {
      out += ch;
    }
  }
  return out;
}

function isRecipeType(type: unknown): boolean {
  if (typeof type === "string") return RECIPE_TYPE.test(type.trim());
  if (Array.isArray(type))
    return type.some((t) => typeof t === "string" && RECIPE_TYPE.test(t.trim()));
  return false;
}

/** Første Recipe i dokumentrekkefølge i et objekt, en liste eller `@graph`. */
function findRecipe(value: unknown, depth: number): RecipeNode | null {
  if (depth > MAX_SEARCH_DEPTH || value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const node = value as RecipeNode;
  if (isRecipeType(node["@type"])) return node;
  return "@graph" in node ? findRecipe(node["@graph"], depth + 1) : null;
}
