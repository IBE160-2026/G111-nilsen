import { appError, err, ok, type Result } from "./result";

/**
 * URL-regler for import (Story 2.2, AD-4). Rene funksjoner uten nettverk og uten server-importer:
 * `validateUrl` tolker det brukeren limte inn, og `normalizeSourceUrl` gir adressen som lagres og
 * sammenlignes ved duplikatsjekk.
 */

/** Lengste lenke vi godtar (tegn), både som inntastet og etter normalisering. */
export const MAX_URL_LENGTH = 2048;

// Blanke og usynlige tegn som kan henge igjen rundt en limt lenke: kontrolltegn, mellomrom (også
// hardt og smalt), myk bindestrek, nullbredde-tegn, retningstegn, linje- og avsnittsskille, BOM.
const INVISIBLE =
  "\\u0000-\\u0020\\u007f-\\u00a0\\u00ad\\u061c\\u115f\\u1160\\u1680\\u180e\\u2000-\\u200f\\u2028-\\u202f\\u205f-\\u206f\\u3000\\u3164\\ufeff\\uffa0";
const LEADING_INVISIBLE = new RegExp(`^[${INVISIBLE}]+`);
const TRAILING_INVISIBLE = new RegExp(`[${INVISIBLE}]+$`);

// Omsluttende tegn som programmer og tekstbehandlere legger rundt en lenke.
const WRAPPERS: ReadonlyArray<readonly [string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
  ["‘", "’"],
  ["«", "»"],
  ["<", ">"],
];

/** Fjerner blanke tegn og omsluttende anførselstegn eller `<…>` til teksten ikke endrer seg mer. */
function trimInput(input: string): string {
  let text = input;
  for (;;) {
    const trimmed = text.replace(LEADING_INVISIBLE, "").replace(TRAILING_INVISIBLE, "");
    const wrapper = WRAPPERS.find(
      ([open, close]) => trimmed.length >= 2 && trimmed.startsWith(open) && trimmed.endsWith(close),
    );
    const next = wrapper
      ? trimmed.slice(wrapper[0].length, trimmed.length - wrapper[1].length)
      : trimmed;
    if (next === text) return text;
    text = next;
  }
}

// «http:», «javascript:», «data:» og lignende: et skjema etterfulgt av kolon.
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// «matprat.no:8080/x»: vert med punktum og port ligner et skjema, men er en adresse uten skjema.
const HOST_WITH_PORT = /^[^\s/?#:@]+\.[^\s/?#:@]+:\d{1,5}(?:[/?#]|$)/;

/** Ser teksten, uten skjema, ut som en nettadresse? Vert med punktum og et fornuftig siste ledd. */
function looksLikeAddress(text: string): boolean {
  if (/\s/.test(text)) return false;
  const authority = text.split(/[/?#]/, 1)[0];
  const host = authority.slice(authority.lastIndexOf("@") + 1).replace(/:\d{0,5}$/, "");
  if (host.startsWith("[")) return host.endsWith("]");
  const labels = host.split(".");
  if (labels.length < 2 || labels.some((label) => label === "")) return false;
  const last = labels[labels.length - 1];
  // Toppdomene med bokstaver (også IDN og punycode), eller en IPv4-adresse skrevet med fire tall.
  return (
    /^\p{L}{2,}$/u.test(last) ||
    /^xn--[a-z0-9-]+$/i.test(last) ||
    (labels.length === 4 && labels.every((label) => /^\d{1,3}$/.test(label)))
  );
}

/**
 * Tolker det brukeren limte inn som en `http`- eller `https`-lenke (ingen nettverk).
 * Trimmer blanke og usynlige tegn og omsluttende anførselstegn eller `<…>`. Mangler skjema, men
 * teksten ser ut som en adresse («www.matprat.no/x»), settes `https://` foran. Tom tekst, over
 * 2048 tegn, andre skjemaer (`ftp:`, `file:`, `javascript:`, `data:`), innebygd brukernavn eller
 * passord og manglende vertsnavn gir `invalid_url`. Returnerer URL-ens normaliserte `href`
 * (WHATWG): IP-former som `http://2130706433/` og `http://0x7f.1/` ender som `127.0.0.1`. Det er
 * adapteren som avviser slike adresser når den skal hente.
 */
export function validateUrl(input: string): Result<string> {
  const invalid = () => err(appError("invalid_url"));
  if (typeof input !== "string") return invalid();

  // Avgrens arbeidet: en uforholdsmessig lang tekst trimmes ikke engang.
  if (input.length > MAX_URL_LENGTH * 2) return invalid();
  const text = trimInput(input);
  if (text === "" || text.length > MAX_URL_LENGTH) return invalid();

  let candidate = text;
  if (!SCHEME.test(text) || HOST_WITH_PORT.test(text)) {
    // Uten skjema godtar vi bare tekst som ser ut som en adresse.
    if (!looksLikeAddress(text.replace(/^\/\//, ""))) return invalid();
    candidate = `https://${text.replace(/^\/\//, "")}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return invalid();
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return invalid();
  if (url.username !== "" || url.password !== "") return invalid();
  if (url.hostname === "") return invalid();
  if (url.href.length > MAX_URL_LENGTH) return invalid();
  return ok(url.href);
}

// Sporingsparametere som ikke endrer hvilken side som vises. `utm_*` tas som prefiks.
const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "_ga",
  "yclid",
  "dclid",
  "twclid",
  "ttclid",
  "srsltid",
]);

function isTrackingParameter(rawName: string): boolean {
  let name = rawName;
  try {
    name = decodeURIComponent(rawName.replace(/\+/g, " "));
  } catch {
    // Ugyldig prosentkoding: sammenlign råteksten.
  }
  const lower = name.toLowerCase();
  return lower.startsWith("utm_") || TRACKING_PARAMETERS.has(lower);
}

/**
 * Adressen som lagres og sammenlignes ved duplikatsjekk (FR-13): uten fragment og
 * sporingsparametere (`utm_*`, `fbclid`, `gclid` …), med små bokstaver i skjema og vert, uten
 * standardport og uten tom `?`. Øvrige parametere beholdes i opprinnelig rekkefølge. Stien
 * beholdes uendret (store og små bokstaver og avsluttende `/` på ikke-tomme stier), og `http` og
 * `https` er ulike: to ulike adresser kan være to ulike oppskrifter, og vi gjetter ikke. En tom
 * sti er alltid `/`, så `https://a.no` og `https://a.no/` blir like. Idempotent. Tekst som ikke
 * er en gyldig URL returneres uendret.
 */
export function normalizeSourceUrl(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  url.hash = "";
  // «matprat.no.» og «matprat.no» er samme vert.
  if (url.hostname.endsWith(".") && url.hostname.length > 1) {
    url.hostname = url.hostname.slice(0, -1);
  }
  const kept = url.search
    .replace(/^\?/, "")
    .split("&")
    .filter((part) => part !== "" && !isTrackingParameter(part.split("=", 1)[0]));
  // Setteren gir ingen `?` når teksten er tom.
  url.search = kept.length > 0 ? `?${kept.join("&")}` : "";
  return url.href;
}

/** `true` når adressen er `http` eller `https`. Brukes før en lagret adresse vises som lenke. */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
