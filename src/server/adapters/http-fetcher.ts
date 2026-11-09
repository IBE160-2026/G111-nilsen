import "server-only";
import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import { appError, err, ok, type AppError, type Result } from "@/lib/result";
import { validateUrl } from "@/lib/source-url";
import type { FetchedPage, RecipeSourceFetcher } from "../ports/recipe-source-fetcher";
import { isAllowedUrlHost, isLoopbackAddress, isPublicAddress } from "./address-policy";

/**
 * HTTP-adapteren (AD-8, NFR-3, NFR-4): henter en oppskriftsside med `node:http`/`node:https`,
 * uten ny pakke. Vernene, i den rekkefølgen de virker:
 *
 * 1. Bare `http` og `https`, ingen innebygd brukernavn/passord (`validateUrl`), og vertsdelen
 *    sjekkes mot adressepolitikken for hver adresse i kjeden, også hver omdirigering.
 * 2. Vertsnavn slås opp av en egen `lookup` på selve tilkoblingen. Den slår opp *alle* adresser,
 *    avviser hvis noen er ikke-offentlig og gir kontakten bare de validerte adressene. Det blir
 *    ikke gjort noe nytt oppslag etter sjekken, så DNS-rebinding har ingen vei inn.
 * 3. Omdirigeringer følges manuelt (maks 5). Ingen cookies og ingen autentiseringshoder sendes.
 * 4. Én felles frist (10 s) for hele kjeden, med en timer som alltid ryddes.
 * 5. Maks 2 MB leses; `Accept-Encoding: identity` og ingen dekomprimering (ingen zip-bombe).
 *
 * HTML-en leses aldri som kode; adapteren returnerer bare tekst.
 */

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const MAX_REDIRECTS = 5;
export const USER_AGENT = "RecipeMate/0.1 (skoleprosjekt; personlig oppskriftsapp)";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type ResolvedAddress = { address: string; family: number };
/** Slår opp alle adressene til et vertsnavn. Erstattes med en falsk i tester. */
export type HostLookup = (hostname: string) => Promise<ResolvedAddress[]>;

/** Avhengigheter som bare tester endrer. Produksjon bruker `createHttpFetcher()` uten argumenter. */
export type HttpFetcherOptions = {
  lookup?: HostLookup;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /**
   * Bare for tester: tillater loopback (127.0.0.0/8, ::1, `localhost`) for lokale testtjenere.
   * `true` gjelder alle porter, en liste bare de oppgitte portene. Alle andre ikke-offentlige
   * adresser er fortsatt blokkert. Kan ikke nås fra `config.ts` eller miljøvariabler.
   */
  allowLoopbackForTests?: boolean | readonly number[];
};

const defaultLookup: HostLookup = async (hostname) => {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  return addresses.map(({ address, family }) => ({ address, family }));
};

class BlockedAddressError extends Error {
  readonly code = "EBLOCKED";
}

function fetchFailed(detail?: string): Result<never, AppError> {
  return err(appError("fetch_failed", detail));
}

/** Er adressen tillatt: offentlig, eller loopback på en port tester har åpnet for. */
function addressAllowed(
  address: string,
  port: number,
  allowLoopback: HttpFetcherOptions["allowLoopbackForTests"],
): boolean {
  if (isPublicAddress(address)) return true;
  if (!allowLoopback || !isLoopbackAddress(address)) return false;
  return allowLoopback === true || allowLoopback.includes(port);
}

/**
 * `lookup` for `http.request`. Slår opp alle adresser, avviser hvis noen er blokkert og gir
 * tilkoblingen bare adresser som er sjekket. Støtter både `all: true` (som Node bruker med
 * `autoSelectFamily`) og enkeltsvar.
 */
export function createSafeLookup(
  resolve: HostLookup,
  port: number,
  allowLoopback?: HttpFetcherOptions["allowLoopbackForTests"],
): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname).then(
      (addresses) => {
        if (addresses.length === 0) {
          callback(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }), "", 0);
          return;
        }
        if (addresses.some(({ address }) => !addressAllowed(address, port, allowLoopback))) {
          callback(new BlockedAddressError("blocked address"), "", 0);
          return;
        }
        const family = options.family === 4 || options.family === 6 ? options.family : 0;
        const usable = family === 0 ? addresses : addresses.filter((a) => a.family === family);
        if (usable.length === 0) {
          callback(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }), "", 0);
          return;
        }
        if (options.all) {
          (callback as unknown as (e: null, a: ResolvedAddress[]) => void)(null, usable);
        } else {
          callback(null, usable[0].address, usable[0].family);
        }
      },
      (error: unknown) => callback(error as NodeJS.ErrnoException, "", 0),
    );
  };
}

type HopResult =
  | { kind: "redirect"; location: string }
  | { kind: "page"; html: string }
  | { kind: "failed" }
  | { kind: "not_html" };

/** Tegnsett fra `Content-Type`, ellers `<meta charset>` i de første 2048 byte, ellers UTF-8. */
export function decodeBody(bytes: Uint8Array, contentType: string | undefined): string {
  const fromHeader = /charset\s*=\s*["']?\s*([^\s;"']+)/i.exec(contentType ?? "")?.[1];
  let label = fromHeader;
  if (!label) {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
    label = /<meta[^>]+charset\s*=\s*["']?\s*([a-z0-9_:.-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder(label ?? "utf-8").decode(bytes);
  } catch {
    // Ukjent tegnsett: bruk UTF-8.
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function mediaType(contentType: string | undefined): string {
  return (contentType ?? "").split(";", 1)[0].trim().toLowerCase();
}

/** Én forespørsel uten å følge omdirigeringer. Ødelegger alltid forespørselen og svaret til slutt. */
function requestOnce(
  url: URL,
  signal: AbortSignal,
  options: Required<Pick<HttpFetcherOptions, "maxBytes">> & HttpFetcherOptions,
): Promise<HopResult> {
  return new Promise<HopResult>((resolve) => {
    const secure = url.protocol === "https:";
    const port = Number(url.port || (secure ? 443 : 80));
    let settled = false;
    let request: http.ClientRequest | undefined;
    const finish = (result: HopResult) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      // Alltid ødelegg forespørselen (og dermed socketen), også ved suksess.
      request?.destroy();
      resolve(result);
    };
    const onAbort = () => finish({ kind: "failed" });

    if (signal.aborted) {
      resolve({ kind: "failed" });
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });

    try {
      request = (secure ? https : http).request(
        {
          protocol: url.protocol,
          hostname: url.hostname.replace(/^\[|\]$/g, ""),
          port,
          path: `${url.pathname}${url.search}`,
          method: "GET",
          // Ny agent per forespørsel: ingen gjenbrukte tilkoblinger og ingen hengende sockets.
          agent: false,
          lookup: createSafeLookup(
            options.lookup ?? defaultLookup,
            port,
            options.allowLoopbackForTests,
          ),
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml",
            "Accept-Encoding": "identity",
            Connection: "close",
          },
        },
        (response) => {
          const status = response.statusCode ?? 0;
          if (REDIRECT_STATUSES.has(status)) {
            const location = response.headers.location;
            response.resume();
            finish(location ? { kind: "redirect", location } : { kind: "failed" });
            return;
          }
          const encoding = response.headers["content-encoding"]?.trim().toLowerCase();
          if (status !== 200 || (encoding && encoding !== "identity")) {
            finish({ kind: "failed" });
            return;
          }
          const contentType = response.headers["content-type"];
          const type = mediaType(contentType);
          if (type !== "text/html" && type !== "application/xhtml+xml") {
            finish({ kind: "not_html" });
            return;
          }

          const chunks: Buffer[] = [];
          let total = 0;
          response.on("data", (chunk: Buffer) => {
            const room = options.maxBytes - total;
            chunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
            total += Math.min(chunk.length, room);
            if (total >= options.maxBytes) {
              // Grensen er nådd: bruk det som er lest, og stopp resten.
              finish({ kind: "page", html: decodeBody(Buffer.concat(chunks), contentType) });
            }
          });
          response.on("end", () =>
            finish({ kind: "page", html: decodeBody(Buffer.concat(chunks), contentType) }),
          );
          // Avbrutt midt i kroppen er en feil, ikke en avkortet side.
          response.on("error", () => finish({ kind: "failed" }));
          response.on("aborted", () => finish({ kind: "failed" }));
          response.on("close", () => finish({ kind: "failed" }));
        },
      );
      request.on("error", () => finish({ kind: "failed" }));
      request.end();
    } catch {
      finish({ kind: "failed" });
    }
  });
}

/**
 * Lager en HTTP-henter. Uten argumenter er den produksjonsutgaven: ekte DNS, 10 sekunder, 2 MB
 * og ingen unntak for lokale adresser.
 */
export function createHttpFetcher(options: HttpFetcherOptions = {}): RecipeSourceFetcher {
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;

  /** Sjekker skjema, passord og vertsdel. Loopback slippes bare gjennom for tester. */
  function checkUrl(raw: string): URL | null {
    const valid = validateUrl(raw);
    if (!valid.ok) return null;
    const url = new URL(valid.value);
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    const loopbackOk = options.allowLoopbackForTests;
    const testLoopback =
      loopbackOk && (loopbackOk === true || loopbackOk.includes(port)) && isLoopbackHost(url);
    return testLoopback || isAllowedUrlHost(url.hostname) ? url : null;
  }

  async function run(
    startUrl: string,
    signal: AbortSignal,
  ): Promise<Result<FetchedPage, AppError>> {
    let current = checkUrl(startUrl);
    for (let redirects = 0; ; redirects += 1) {
      if (!current) return fetchFailed("blocked");
      const hop = await requestOnce(current, signal, { ...options, maxBytes });
      switch (hop.kind) {
        case "page":
          return ok({ html: hop.html, finalUrl: current.href });
        case "not_html":
          return err(appError("no_recipe", "not_html"));
        case "failed":
          return fetchFailed();
        case "redirect": {
          if (redirects >= maxRedirects) return fetchFailed("too_many_redirects");
          let next: string;
          try {
            next = new URL(hop.location, current).href;
          } catch {
            return fetchFailed("bad_location");
          }
          current = checkUrl(next);
        }
      }
    }
  }

  return {
    async fetch(url) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await run(url, controller.signal);
      } catch {
        return fetchFailed();
      } finally {
        // Timeren ryddes alltid, også ved suksess og feil.
        clearTimeout(timer);
        controller.abort();
      }
    },
  };
}

/** Er vertsdelen `localhost`, `*.localhost` eller en loopback-IP? Bare brukt med testvalget. */
function isLoopbackHost(url: URL): boolean {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host.endsWith(".localhost") || isLoopbackAddress(host);
}
