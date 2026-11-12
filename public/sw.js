/*
 * Service worker for RecipeMate (Story 6.16). Bevisst smal:
 *  - statiske filer under /_next/static/ (hash i filnavnet, endres aldri) hentes først fra
 *    mellomlageret, så appen starter raskt;
 *  - får en sidenavigasjon ikke svar fra nettet, vises den ferdig lagrede siden /frakoblet;
 *  - ingen sider, API-svar eller brukerdata lagres. Innloggede sider går alltid til nettet, så
 *    ingen andres data blir liggende igjen på en delt telefon.
 * Endre VERSION når denne filen endres, så gamle mellomlagre ryddes bort.
 */
const VERSION = "v1";
const STATIC_CACHE = `recipemate-static-${VERSION}`;
const OFFLINE_CACHE = `recipemate-offline-${VERSION}`;
const OFFLINE_URL = "/frakoblet";

self.addEventListener("install", (event) => {
  event.waitUntil(precacheOfflinePage().then(() => self.skipWaiting()));
});

/**
 * Lagrer /frakoblet og stilark og skript siden bruker (adressene står i HTML-en), så den ser
 * riktig ut også uten nett.
 */
async function precacheOfflinePage() {
  const response = await fetch(new Request(OFFLINE_URL, { cache: "reload" }));
  if (!response.ok) throw new Error("Fikk ikke hentet " + OFFLINE_URL);
  const html = await response.clone().text();
  const offline = await caches.open(OFFLINE_CACHE);
  await offline.put(OFFLINE_URL, response);
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) ?? [])];
  const statics = await caches.open(STATIC_CACHE);
  await Promise.all(assets.map((asset) => statics.add(asset).catch(() => {})));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(OFFLINE_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
  }
});
