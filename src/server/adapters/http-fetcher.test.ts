import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import type { AddressInfo, Socket } from "node:net";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractRecipeJsonLd } from "@/domain";
import {
  createHttpFetcher,
  createSafeLookup,
  decodeBody,
  FETCH_TIMEOUT_MS,
  MAX_REDIRECTS,
  MAX_RESPONSE_BYTES,
  USER_AGENT,
  type HostLookup,
  type HttpFetcherOptions,
} from "./http-fetcher";

// Alle tester snakker bare med 127.0.0.1 (lokale tjenere) eller blir avvist før noen tilkobling.

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

type TestServer = {
  port: number;
  url: (path?: string) => string;
  requests: http.IncomingMessage[];
  sockets: Set<Socket>;
  close: () => Promise<void>;
};

const open: TestServer[] = [];

async function startServer(handler: Handler): Promise<TestServer> {
  const requests: http.IncomingMessage[] = [];
  const sockets = new Set<Socket>();
  const server = http.createServer((req, res) => {
    requests.push(req);
    handler(req, res);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const port = (server.address() as AddressInfo).port;
  const result: TestServer = {
    port,
    url: (path = "/") => `http://127.0.0.1:${port}${path}`,
    requests,
    sockets,
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
  open.push(result);
  return result;
}

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(open.splice(0).map((server) => server.close()));
});

const html = (body: string) => `<!doctype html><html><body>${body}</body></html>`;

function sendHtml(res: http.ServerResponse, body: string, type = "text/html; charset=utf-8") {
  res.writeHead(200, { "Content-Type": type });
  res.end(body);
}

/** Venter til serveren ikke har flere åpne tilkoblinger (ingen hengende sockets). */
async function expectNoOpenSockets(server: TestServer) {
  const deadline = Date.now() + 2000;
  while (server.sockets.size > 0 && Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 10));
  }
  expect(server.sockets.size).toBe(0);
}

function fetcher(options: HttpFetcherOptions = {}) {
  return createHttpFetcher({ allowLoopbackForTests: true, timeoutMs: 3000, ...options });
}

function failedKind(result: Awaited<ReturnType<ReturnType<typeof fetcher>["fetch"]>>) {
  return result.ok ? "ok" : result.error.kind;
}

describe("konstanter (AD-8)", () => {
  it("10 sekunder, 2 MB og 5 omdirigeringer", () => {
    expect(FETCH_TIMEOUT_MS).toBe(10_000);
    expect(MAX_RESPONSE_BYTES).toBe(2 * 1024 * 1024);
    expect(MAX_REDIRECTS).toBe(5);
    expect(USER_AGENT).toBe("RecipeMate/0.1 (skoleprosjekt; personlig oppskriftsapp)");
  });
});

describe("vellykket henting mot lokal 127.0.0.1-tjener (ende-til-ende)", () => {
  it("returnerer HTML og sluttadresse, og sender de riktige hodene", async () => {
    const server = await startServer((req, res) => {
      res.setHeader("Set-Cookie", "sid=1");
      sendHtml(res, html("<p>Hei</p>"));
    });
    const result = await fetcher().fetch(server.url("/oppskrift?x=1"));
    expect(result).toEqual({
      ok: true,
      value: { html: html("<p>Hei</p>"), finalUrl: server.url("/oppskrift?x=1") },
    });

    const headers = server.requests[0].headers;
    expect(server.requests[0].method).toBe("GET");
    expect(server.requests[0].url).toBe("/oppskrift?x=1");
    expect(headers["user-agent"]).toBe(USER_AGENT);
    expect(headers.accept).toBe("text/html,application/xhtml+xml");
    expect(headers["accept-encoding"]).toBe("identity");
    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    await expectNoOpenSockets(server);
  });

  it("finner en Recipe i JSON-LD i svaret", async () => {
    const ld = JSON.stringify({ "@type": "Recipe", name: "Test", recipeIngredient: ["1 egg"] });
    const server = await startServer((_req, res) =>
      sendHtml(res, html(`<script type="application/ld+json">${ld}</script>`)),
    );
    const result = await fetcher().fetch(server.url());
    expect(result.ok && extractRecipeJsonLd(result.value.html).ok).toBe(true);
  });

  it("godtar application/xhtml+xml og store bokstaver i Content-Type", async () => {
    for (const type of ["application/xhtml+xml", "TEXT/HTML; charset=UTF-8", "text/html"]) {
      const server = await startServer((_req, res) => sendHtml(res, "<p>x</p>", type));
      expect((await fetcher().fetch(server.url())).ok, type).toBe(true);
    }
  });

  it("sender ikke videre cookies fra en omdirigering", async () => {
    const target = await startServer((_req, res) => sendHtml(res, "<p>ok</p>"));
    const first = await startServer((_req, res) => {
      res.writeHead(302, { Location: target.url("/maal"), "Set-Cookie": "sid=hemmelig" });
      res.end();
    });
    const result = await fetcher().fetch(first.url());
    expect(result.ok).toBe(true);
    expect(target.requests[0].headers.cookie).toBeUndefined();
    expect(target.requests[0].headers.authorization).toBeUndefined();
  });

  it("selve adresseklassifiseringen blokkerer også uten tilkobling: ingen forespørsel når 127.0.0.1 ikke er åpnet", async () => {
    const server = await startServer((_req, res) => sendHtml(res, "<p>x</p>"));
    const production = createHttpFetcher();
    expect(failedKind(await production.fetch(server.url()))).toBe("fetch_failed");
    expect(server.requests).toHaveLength(0);
  });
});

describe("statuskoder og innholdstype", () => {
  it.each([400, 401, 403, 404, 410, 429, 500, 502, 503])("%i gir fetch_failed", async (status) => {
    const server = await startServer((_req, res) => {
      res.writeHead(status, { "Content-Type": "text/html" });
      res.end("<p>feil</p>");
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("fetch_failed");
    await expectNoOpenSockets(server);
  });

  it.each([203, 204, 206, 300, 304])("%i (ikke 200 OK) gir fetch_failed", async (status) => {
    const server = await startServer((_req, res) => {
      res.writeHead(status);
      res.end();
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("fetch_failed");
  });

  it.each([
    "application/pdf",
    "image/png",
    "application/json",
    "text/plain",
    "application/octet-stream",
    "text/htmlx",
  ])("200 med %s gir no_recipe", async (type) => {
    const server = await startServer((_req, res) => sendHtml(res, "%PDF-1.4", type));
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("no_recipe");
    await expectNoOpenSockets(server);
  });

  it("200 uten Content-Type gir no_recipe", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200);
      res.end("<html></html>");
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("no_recipe");
  });

  it("komprimert svar (Content-Encoding) gir fetch_failed: ingenting dekomprimeres", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html", "Content-Encoding": "gzip" });
      res.end(Buffer.from([0x1f, 0x8b, 0x08, 0x00]));
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("fetch_failed");
    expect(server.requests[0].headers["accept-encoding"]).toBe("identity");
  });

  it("tilkobling som avvises gir fetch_failed", async () => {
    const server = await startServer(() => undefined);
    const url = server.url();
    await server.close();
    expect(failedKind(await fetcher().fetch(url))).toBe("fetch_failed");
  });

  it("tilkobling som lukkes midt i svaret gir fetch_failed", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html", "Content-Length": "1000" });
      res.write("<html>");
      setTimeout(() => res.socket?.destroy(), 20);
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("fetch_failed");
  });
});

describe("tegnsett", () => {
  const latin1 = (text: string) => Buffer.from(text, "latin1");
  const serve = (body: Buffer, type: string) =>
    startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": type });
      res.end(body);
    });

  it("ISO-8859-1 fra Content-Type gir riktige æøå", async () => {
    const server = await serve(latin1("<p>Blåbærsyltetøy</p>"), "text/html; charset=ISO-8859-1");
    const result = await fetcher().fetch(server.url());
    expect(result.ok && result.value.html).toBe("<p>Blåbærsyltetøy</p>");
  });

  it("windows-1252 fra Content-Type", async () => {
    const bytes = Buffer.concat([latin1("<p>Grøt "), Buffer.from([0x96]), latin1(" ÆØÅ</p>")]);
    const server = await serve(bytes, "text/html; charset=windows-1252");
    const result = await fetcher().fetch(server.url());
    expect(result.ok && result.value.html).toBe("<p>Grøt – ÆØÅ</p>");
  });

  it("UTF-8 fra Content-Type", async () => {
    const server = await serve(Buffer.from("<p>æøå ✓</p>", "utf8"), "text/html; charset=utf-8");
    const result = await fetcher().fetch(server.url());
    expect(result.ok && result.value.html).toBe("<p>æøå ✓</p>");
  });

  it("uten charset i headeren brukes <meta charset>", async () => {
    const server = await serve(
      latin1('<html><head><meta charset="iso-8859-1"></head><p>æøå</p>'),
      "text/html",
    );
    const result = await fetcher().fetch(server.url());
    expect(result.ok && result.value.html).toContain("<p>æøå</p>");
  });

  it("uten charset i headeren brukes <meta http-equiv content=…charset=…>", async () => {
    const server = await serve(
      latin1(
        '<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252"></head><p>æøå</p>',
      ),
      "text/html",
    );
    const result = await fetcher().fetch(server.url());
    expect(result.ok && result.value.html).toContain("<p>æøå</p>");
  });

  it("uten noe tegnsett brukes UTF-8", async () => {
    const server = await serve(Buffer.from("<p>æøå</p>", "utf8"), "text/html");
    const result = await fetcher().fetch(server.url());
    expect(result.ok && result.value.html).toBe("<p>æøå</p>");
  });

  it("headeren går foran <meta>", () => {
    const bytes = Buffer.from('<meta charset="iso-8859-1"><p>æøå</p>', "utf8");
    expect(decodeBody(bytes, "text/html; charset=utf-8")).toContain("æøå");
  });

  it("<meta> etter de første 2048 byte ignoreres", () => {
    const bytes = Buffer.concat([
      Buffer.from(`<p>${" ".repeat(2100)}</p>`),
      latin1('<meta charset="iso-8859-1"><p>æ</p>'),
    ]);
    expect(decodeBody(bytes, "text/html")).not.toContain("<p>æ</p>");
  });

  it("ukjent tegnsett faller tilbake til UTF-8", async () => {
    const server = await serve(Buffer.from("<p>æøå</p>", "utf8"), "text/html; charset=finnes-ikke");
    const result = await fetcher().fetch(server.url());
    expect(result.ok && result.value.html).toBe("<p>æøå</p>");
    expect(decodeBody(Buffer.from("ø"), 'text/html; charset="x-ukjent"')).toBe("ø");
  });
});

describe("omdirigeringer", () => {
  it.each([301, 302, 303, 307, 308])("%i følges", async (status) => {
    const target = await startServer((_req, res) => sendHtml(res, "<p>mål</p>"));
    const first = await startServer((_req, res) => {
      res.writeHead(status, { Location: target.url("/maal?a=1") });
      res.end();
    });
    const result = await fetcher().fetch(first.url());
    expect(result).toEqual({
      ok: true,
      value: { html: "<p>mål</p>", finalUrl: target.url("/maal?a=1") },
    });
    await expectNoOpenSockets(first);
    await expectNoOpenSockets(target);
  });

  it("relativ Location (sti og sti uten skråstrek) løses mot gjeldende adresse", async () => {
    const server = await startServer((req, res) => {
      if (req.url === "/a/b") {
        res.writeHead(302, { Location: "../c?x=1" });
        res.end();
      } else if (req.url === "/c?x=1") {
        res.writeHead(302, { Location: "/d" });
        res.end();
      } else sendHtml(res, `<p>${req.url}</p>`);
    });
    const result = await fetcher().fetch(server.url("/a/b"));
    expect(result.ok && result.value).toEqual({ html: "<p>/d</p>", finalUrl: server.url("/d") });
  });

  async function chain(length: number) {
    const server = await startServer((req, res) => {
      const step = Number(req.url?.slice(1) ?? 0);
      if (step < length) {
        res.writeHead(302, { Location: `/${step + 1}` });
        res.end();
      } else sendHtml(res, "<p>ferdig</p>");
    });
    return { server, result: await fetcher().fetch(server.url("/0")) };
  }

  it("fem omdirigeringer er greit", async () => {
    const { server, result } = await chain(5);
    expect(result.ok).toBe(true);
    expect(server.requests).toHaveLength(6);
  });

  it("seks omdirigeringer gir fetch_failed", async () => {
    const { server, result } = await chain(6);
    expect(failedKind(result)).toBe("fetch_failed");
    expect(server.requests).toHaveLength(6);
    await expectNoOpenSockets(server);
  });

  it("omdirigeringssløyfe gir fetch_failed", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(302, { Location: "/" });
      res.end();
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("fetch_failed");
    expect(server.requests.length).toBeLessThanOrEqual(MAX_REDIRECTS + 1);
  });

  it("omdirigering uten Location gir fetch_failed", async () => {
    const server = await startServer((_req, res) => {
      res.writeHead(302);
      res.end();
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("fetch_failed");
  });

  it.each([
    "file:///etc/passwd",
    "javascript:alert(1)",
    "ftp://127.0.0.1/x",
    "data:text/html,<p>x</p>",
    "gopher://127.0.0.1/",
    "http://",
    "http://user:pass@127.0.0.1/",
    "http://[::",
  ])("Location %j gir fetch_failed", async (location) => {
    const server = await startServer((_req, res) => {
      res.writeHead(302, { Location: location });
      res.end();
    });
    expect(failedKind(await fetcher().fetch(server.url()))).toBe("fetch_failed");
    expect(server.requests).toHaveLength(1);
  });

  it.each([
    "http://10.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://100.64.0.1/",
    "http://0.0.0.0/",
    "http://[fd00::1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://metadata.internal/",
    "http://nas.lan/",
    "http://skriver.local/",
    "http://intranett/",
    "http://2852039166/",
  ])("omdirigering til %s blokkeres uten at noe kobles til", async (location) => {
    const server = await startServer((_req, res) => {
      res.writeHead(302, { Location: location });
      res.end();
    });
    const lookup = vi.fn<HostLookup>().mockRejectedValue(new Error("skal ikke slås opp"));
    expect(failedKind(await fetcher({ lookup }).fetch(server.url()))).toBe("fetch_failed");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("omdirigering til loopback på en port som ikke er åpnet for tester blokkeres", async () => {
    const secret = await startServer((_req, res) => sendHtml(res, "<p>hemmelig</p>"));
    const first = await startServer((_req, res) => {
      res.writeHead(302, { Location: secret.url("/admin") });
      res.end();
    });
    const result = await fetcher({ allowLoopbackForTests: [first.port] }).fetch(first.url());
    expect(failedKind(result)).toBe("fetch_failed");
    expect(secret.requests).toHaveLength(0);
  });

  it.each([
    ["localhost", "http://localhost:PORT/"],
    ["IPv6-loopback", "http://[::1]:PORT/"],
    ["desimal IP", "http://2130706433:PORT/"],
  ])("omdirigering til %s blokkeres når loopback ikke er åpnet", async (_name, template) => {
    const secret = await startServer((_req, res) => sendHtml(res, "<p>hemmelig</p>"));
    const first = await startServer((_req, res) => {
      res.writeHead(302, { Location: template.replace("PORT", String(secret.port)) });
      res.end();
    });
    const result = await fetcher({ allowLoopbackForTests: [first.port] }).fetch(first.url());
    expect(failedKind(result)).toBe("fetch_failed");
    expect(secret.requests).toHaveLength(0);
  });

  it("omdirigering til en offentlig adresse som peker til privat IP (DNS) blokkeres", async () => {
    const first = await startServer((_req, res) => {
      res.writeHead(302, { Location: "http://evil.example.test/" });
      res.end();
    });
    const lookup = vi.fn<HostLookup>(async () => [{ address: "10.1.2.3", family: 4 }]);
    expect(failedKind(await fetcher({ lookup }).fetch(first.url()))).toBe("fetch_failed");
    expect(lookup).toHaveBeenCalledWith("evil.example.test");
  });
});

describe("blokkerte adresser i den første URL-en (produksjonsutgaven)", () => {
  const production = createHttpFetcher();
  const noLookup = () => vi.fn<HostLookup>().mockRejectedValue(new Error("ikke slå opp"));

  it.each([
    "http://localhost/",
    "http://localhost:3000/",
    "http://127.0.0.1/",
    "http://127.1/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://10.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.0.1/",
    "http://app.localhost/",
    "http://enhet.local/",
    "http://db.internal/",
    "http://hjemme.lan/",
    "http://ruter.home.arpa/",
    "http://intranett/",
    "ftp://a.no/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://user:pass@8.8.8.8/",
    "ikke en url",
    "",
  ])("%j gir fetch_failed uten oppslag eller tilkobling", async (url) => {
    const lookup = noLookup();
    const blocked = createHttpFetcher({ lookup });
    expect(failedKind(await blocked.fetch(url))).toBe("fetch_failed");
    expect(lookup).not.toHaveBeenCalled();
    expect(failedKind(await production.fetch(url))).toBe("fetch_failed");
  });

  it("kaster aldri, heller ikke for ikke-tekst", async () => {
    for (const value of [null, undefined, 42, {}] as unknown[]) {
      expect(failedKind(await production.fetch(value as string))).toBe("fetch_failed");
    }
  });
});

describe("DNS-oppslag på selve tilkoblingen (ingen DNS-rebinding)", () => {
  it("tilkoblingen går til den validerte adressen, og det slås bare opp én gang", async () => {
    const server = await startServer((_req, res) => sendHtml(res, "<p>ok</p>"));
    const answers: Array<Array<{ address: string; family: number }>> = [
      [{ address: "127.0.0.1", family: 4 }],
      // Et andre oppslag ville gitt en privat adresse (rebinding), men skal aldri gjøres.
      [{ address: "10.0.0.1", family: 4 }],
    ];
    const lookup = vi.fn<HostLookup>(async () => answers.shift() ?? []);
    const result = await fetcher({ lookup, allowLoopbackForTests: [server.port] }).fetch(
      `http://rebind.example.test:${server.port}/side`,
    );
    expect(result.ok).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("rebind.example.test");
    expect(server.requests[0].headers.host).toBe(`rebind.example.test:${server.port}`);
  });

  it.each([
    ["privat adresse", [{ address: "10.0.0.1", family: 4 }]],
    ["lenkelokal skyadresse", [{ address: "169.254.169.254", family: 4 }]],
    ["IPv6 unik-lokal", [{ address: "fd00::1", family: 6 }]],
    ["IPv4-mappet privat", [{ address: "::ffff:192.168.0.1", family: 6 }]],
    [
      "offentlig og privat blandet",
      [
        { address: "8.8.8.8", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ],
    ],
    [
      "privat først, så loopback",
      [
        { address: "10.0.0.1", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ],
    ],
    [
      "loopback (åpnet) og privat blandet",
      [
        { address: "127.0.0.1", family: 4 },
        { address: "192.168.1.5", family: 4 },
      ],
    ],
    ["tomt svar", []],
  ])("%s blokkeres, ingen forespørsel når tjeneren", async (_name, addresses) => {
    const server = await startServer((_req, res) => sendHtml(res, "<p>ok</p>"));
    const lookup = vi.fn<HostLookup>(async () => addresses);
    const result = await fetcher({ lookup, allowLoopbackForTests: [server.port] }).fetch(
      `http://navn.example.test:${server.port}/`,
    );
    expect(failedKind(result)).toBe("fetch_failed");
    expect(server.requests).toHaveLength(0);
  });

  it("feil i oppslaget (ENOTFOUND) gir fetch_failed", async () => {
    const lookup = vi
      .fn<HostLookup>()
      .mockRejectedValue(Object.assign(new Error("x"), { code: "ENOTFOUND" }));
    expect(failedKind(await fetcher({ lookup }).fetch("http://finnes-ikke.example.test/"))).toBe(
      "fetch_failed",
    );
  });

  it("uten åpning for tester avvises loopback også når navnet ser offentlig ut", async () => {
    const server = await startServer((_req, res) => sendHtml(res, "<p>ok</p>"));
    const lookup = vi.fn<HostLookup>(async () => [{ address: "127.0.0.1", family: 4 }]);
    const result = await createHttpFetcher({ lookup }).fetch(
      `http://snill.example.test:${server.port}/`,
    );
    expect(failedKind(result)).toBe("fetch_failed");
    expect(server.requests).toHaveLength(0);
  });

  describe("createSafeLookup", () => {
    type Cb = (error: Error | null, address?: unknown, family?: number) => void;
    const call = (
      resolve: HostLookup,
      options: object,
      port = 80,
      allow?: boolean | readonly number[],
    ) =>
      new Promise<{ error: Error | null; address?: unknown; family?: number }>((done) => {
        const lookup = createSafeLookup(resolve, port, allow) as unknown as (
          host: string,
          options: object,
          callback: Cb,
        ) => void;
        lookup("x.example.test", options, (error, address, family) =>
          done({ error, address, family }),
        );
      });

    const pub = [
      { address: "8.8.8.8", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ];

    it("all: true gir alle adresser, ellers den første", async () => {
      expect((await call(async () => pub, { all: true })).address).toEqual(pub);
      const single = await call(async () => pub, {});
      expect(single).toEqual({ error: null, address: "8.8.8.8", family: 4 });
    });

    it("family filtrerer etter at alle adressene er sjekket", async () => {
      const six = await call(async () => pub, { family: 6 });
      expect(six.address).toBe("2606:4700:4700::1111");
      const only4 = await call(async () => [pub[0]], { family: 6 });
      expect(only4.error).toBeTruthy();
      const mixed = await call(async () => [pub[0], { address: "fd00::1", family: 6 }], {
        family: 4,
      });
      expect(mixed.error).toBeTruthy();
    });

    it("loopback bare på åpnede porter", async () => {
      const loop = async () => [{ address: "127.0.0.1", family: 4 }];
      expect((await call(loop, {}, 80)).error).toBeTruthy();
      expect((await call(loop, {}, 80, [81])).error).toBeTruthy();
      expect((await call(loop, {}, 81, [81])).error).toBeNull();
      expect((await call(loop, {}, 80, true)).error).toBeNull();
      const privateOnly = async () => [{ address: "10.0.0.1", family: 4 }];
      expect((await call(privateOnly, {}, 80, true)).error).toBeTruthy();
    });

    it("oppslagsfeil videresendes", async () => {
      const result = await call(async () => Promise.reject(new Error("dns nede")), {});
      expect(result.error?.message).toBe("dns nede");
    });
  });
});

describe("tidsfrist (10 sekunder, ryddes alltid)", () => {
  it("tjener som aldri svarer: avbrutt, fetch_failed, socket ødelagt", async () => {
    const server = await startServer(() => undefined);
    const started = Date.now();
    const result = await fetcher({ timeoutMs: 200 }).fetch(server.url());
    expect(failedKind(result)).toBe("fetch_failed");
    expect(Date.now() - started).toBeLessThan(1500);
    await expectNoOpenSockets(server);
  });

  it("tjener som drypper data: den samlede fristen gjelder, ikke tid mellom bytes", async () => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      timer = setInterval(() => res.write("x"), 20);
      res.on("close", () => clearInterval(timer));
    });
    const started = Date.now();
    const result = await fetcher({ timeoutMs: 300 }).fetch(server.url());
    expect(failedKind(result)).toBe("fetch_failed");
    expect(Date.now() - started).toBeLessThan(1500);
    await expectNoOpenSockets(server);
    clearInterval(timer);
  });

  it("tjener som drypper svarhodene: fristen gjelder også før svaret", async () => {
    const server = await startServer((req) => {
      req.socket.write("HTTP/1.1 200 OK\r\n");
    });
    const result = await fetcher({ timeoutMs: 200 }).fetch(server.url());
    expect(failedKind(result)).toBe("fetch_failed");
    await expectNoOpenSockets(server);
  });

  it("fristen er for hele kjeden: mange trege ledd summeres", async () => {
    const server = await startServer((req, res) => {
      const step = Number(req.url?.slice(1) ?? 0);
      setTimeout(() => {
        if (step < 4) {
          res.writeHead(302, { Location: `/${step + 1}` });
          res.end();
        } else sendHtml(res, "<p>ferdig</p>");
      }, 120);
    });
    // Hvert ledd tar 120 ms, så fem ledd tar over 500 ms, mer enn fristen på 350 ms.
    const result = await fetcher({ timeoutMs: 350 }).fetch(server.url("/0"));
    expect(failedKind(result)).toBe("fetch_failed");
    await expectNoOpenSockets(server);
    const fast = await fetcher({ timeoutMs: 3000 }).fetch(server.url("/0"));
    expect(fast.ok).toBe(true);
  });

  it("standardfristen er 10 sekunder (falske tidtakere)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const server = await startServer(() => undefined);
    const pending = createHttpFetcher({ allowLoopbackForTests: true }).fetch(server.url());
    let settled = false;
    void pending.then(() => (settled = true));
    // La forespørselen komme fram til tjeneren før tiden settes frem.
    for (let i = 0; i < 100 && server.requests.length === 0; i += 1) {
      await new Promise<void>((done) => setImmediate(done));
    }
    expect(server.requests).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(failedKind(await pending)).toBe("fetch_failed");
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    await expectNoOpenSockets(server);
  });

  it("ingen timer blir stående: suksess, feil, omdirigeringsfeil og tidsavbrudd", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const ok = await startServer((_req, res) => sendHtml(res, "<p>x</p>"));
    const notFound = await startServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    const redirect = await startServer((_req, res) => {
      res.writeHead(302, { Location: "file:///etc/passwd" });
      res.end();
    });
    const hang = await startServer(() => undefined);
    const f = createHttpFetcher({ allowLoopbackForTests: true });

    expect((await f.fetch(ok.url())).ok).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(failedKind(await f.fetch(notFound.url()))).toBe("fetch_failed");
    expect(vi.getTimerCount()).toBe(0);
    expect(failedKind(await f.fetch(redirect.url()))).toBe("fetch_failed");
    expect(vi.getTimerCount()).toBe(0);
    expect(failedKind(await f.fetch("http://localhost:1/"))).toBe("fetch_failed");
    expect(vi.getTimerCount()).toBe(0);

    const pending = f.fetch(hang.url());
    for (let i = 0; i < 100 && hang.requests.length === 0; i += 1) {
      await new Promise<void>((done) => setImmediate(done));
    }
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS);
    expect(failedKind(await pending)).toBe("fetch_failed");
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    for (const server of [ok, notFound, redirect, hang]) await expectNoOpenSockets(server);
  });

  it("ingen sockets blir stående etter mange kall", async () => {
    const server = await startServer((req, res) => {
      if (req.url === "/stor") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write("x".repeat(100_000));
      } else if (req.url === "/404") {
        res.writeHead(404);
        res.end();
      } else sendHtml(res, "<p>x</p>");
    });
    const f = fetcher({ maxBytes: 1000 });
    await Promise.all(
      ["/", "/404", "/stor", "/", "/404", "/stor"].map((path) => f.fetch(server.url(path))),
    );
    await expectNoOpenSockets(server);
  });
});

describe("størrelsesgrense (2 MB)", () => {
  function bigPage(totalBytes: number) {
    const ld = JSON.stringify({ "@type": "Recipe", name: "Tidlig", recipeIngredient: ["1 egg"] });
    const head = `<html><script type="application/ld+json">${ld}</script><body>`;
    return head + "x".repeat(totalBytes - head.length);
  }

  it("leser maks 2 MB og bruker det som er lest (JSON-LD tidlig i siden virker)", async () => {
    const page = bigPage(3 * 1024 * 1024);
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html", "Content-Length": String(page.length) });
      res.end(page);
    });
    const result = await createHttpFetcher({ allowLoopbackForTests: true }).fetch(server.url());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.html.length).toBe(MAX_RESPONSE_BYTES);
    expect(extractRecipeJsonLd(result.value.html).ok).toBe(true);
    await expectNoOpenSockets(server);
  });

  it("stopper lesingen og ødelegger socketen i stedet for å laste resten", async () => {
    let written = 0;
    let closed = false;
    const server = await startServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      const chunk = "x".repeat(64 * 1024);
      const timer = setInterval(() => {
        written += chunk.length;
        res.write(chunk);
      }, 1);
      res.on("close", () => {
        closed = true;
        clearInterval(timer);
      });
    });
    const result = await fetcher({ maxBytes: 100_000 }).fetch(server.url());
    expect(result.ok && result.value.html.length).toBe(100_000);
    await expectNoOpenSockets(server);
    expect(closed).toBe(true);
    // Tjeneren kunne ha sendt uendelig; vi stoppet lenge før 100 MB.
    expect(written).toBeLessThan(100 * 1024 * 1024);
  });

  it("en side akkurat på grensen er hel", async () => {
    const page = "y".repeat(5000);
    const server = await startServer((_req, res) => sendHtml(res, page));
    const result = await fetcher({ maxBytes: 5000 }).fetch(server.url());
    expect(result.ok && result.value.html).toBe(page);
  });

  it("en side én byte over grensen avkortes til grensen", async () => {
    const server = await startServer((_req, res) => sendHtml(res, "y".repeat(5001)));
    const result = await fetcher({ maxBytes: 5000 }).fetch(server.url());
    expect(result.ok && result.value.html).toBe("y".repeat(5000));
  });

  it("avkorting midt i et flerbyte-tegn kaster ikke", async () => {
    const server = await startServer((_req, res) => sendHtml(res, "æ".repeat(100)));
    const result = await fetcher({ maxBytes: 11 }).fetch(server.url());
    expect(result.ok).toBe(true);
  });
});

describe("HTTPS verifiserer sertifikatet", () => {
  const hasOpenssl = (() => {
    try {
      execFileSync("openssl", ["version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  it.skipIf(!hasOpenssl)(
    "selvsignert sertifikat gir fetch_failed (håndtrykket avvises)",
    async () => {
      const dir = mkdtempSync(join(tmpdir(), "recipemate-tls-"));
      try {
        execFileSync(
          "openssl",
          [
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-days",
            "1",
            "-subj",
            "/CN=127.0.0.1",
            "-keyout",
            join(dir, "key.pem"),
            "-out",
            join(dir, "cert.pem"),
          ],
          { stdio: "ignore" },
        );
        let requests = 0;
        let tlsErrors = 0;
        const server = https.createServer(
          { key: readFileSync(join(dir, "key.pem")), cert: readFileSync(join(dir, "cert.pem")) },
          (_req, res) => {
            requests += 1;
            sendHtml(res, "<p>x</p>");
          },
        );
        server.on("tlsClientError", () => (tlsErrors += 1));
        await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
        const port = (server.address() as AddressInfo).port;
        try {
          const result = await fetcher().fetch(`https://127.0.0.1:${port}/`);
          expect(failedKind(result)).toBe("fetch_failed");
          expect(requests).toBe(0);
          // Håndtrykket ble forsøkt (https brukes), men klienten avviste sertifikatet.
          const deadline = Date.now() + 1000;
          while (tlsErrors === 0 && Date.now() < deadline)
            await new Promise((r) => setTimeout(r, 10));
          expect(tlsErrors).toBeGreaterThan(0);
        } finally {
          server.closeAllConnections();
          await new Promise<void>((done) => server.close(() => done()));
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});

describe("allowLoopbackForTests kan ikke nås fra produksjonskode", () => {
  const root = process.cwd();
  function sources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });
  }

  it("navnet finnes bare i http-fetcher.ts", () => {
    const users = sources(join(root, "src"))
      .filter((file) => readFileSync(file, "utf8").includes("allowLoopbackForTests"))
      .map((file) => relative(root, file).split(sep).join("/"));
    expect(users).toEqual(["src/server/adapters/http-fetcher.ts"]);
  });

  it("fabrikken i recipe-fetcher.ts og config.ts gir ingen valg videre", () => {
    const fetcherFactory = readFileSync(join(root, "src/server/recipe-fetcher.ts"), "utf8");
    expect(fetcherFactory).toContain("createHttpFetcher()");
    const config = readFileSync(join(root, "src/server/config.ts"), "utf8");
    expect(config).not.toMatch(/loopback/i);
  });
});
