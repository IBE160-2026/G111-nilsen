import { isIP } from "node:net";

/**
 * Hvilke adresser HTTP-adapteren aldri kobler til (AD-8, NFR-3): maskinen selv, private,
 * lenkelokale og andre ikke-offentlige nett. Rene funksjoner uten I/O, så alle områdene kan
 * tabelltestes. Alt som ikke lar seg tolke sikkert, regnes som blokkert.
 */

/** IPv4-områder som er blokkert: [adresse, prefikslengde]. */
const BLOCKED_IPV4: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // «dette nettverket»
  ["10.0.0.0", 8], // privat
  ["100.64.0.0", 10], // delt adresserom (CGNAT)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // lenkelokal, inkl. skymetadata 169.254.169.254
  ["172.16.0.0", 12], // privat
  ["192.0.0.0", 24], // IETF-protokolltildelinger
  ["192.0.2.0", 24], // dokumentasjon (TEST-NET-1)
  ["192.88.99.0", 24], // gammel 6to4-relé
  ["192.168.0.0", 16], // privat
  ["198.18.0.0", 15], // nettverkstesting
  ["198.51.100.0", 24], // dokumentasjon (TEST-NET-2)
  ["203.0.113.0", 24], // dokumentasjon (TEST-NET-3)
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reservert, inkl. 255.255.255.255
];

export function parseIPv4(text: string): number[] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

function ipv4ToNumber(octets: readonly number[]): number {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function inIPv4Range(address: number, base: string, prefix: number): boolean {
  const baseNumber = ipv4ToNumber(parseIPv4(base) as number[]);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) >>> 0 === (baseNumber & mask) >>> 0;
}

/** `true` når IPv4-adressen (fire oktetter) er offentlig. */
export function isPublicIPv4Octets(octets: readonly number[]): boolean {
  const address = ipv4ToNumber(octets);
  return !BLOCKED_IPV4.some(([base, prefix]) => inIPv4Range(address, base, prefix));
}

/** Tolker en IPv6-adresse til åtte 16-bits grupper, eller `null` (også for soneangivelse `%…`). */
export function parseIPv6(text: string): number[] | null {
  let input = text;
  if (input.startsWith("[") && input.endsWith("]")) input = input.slice(1, -1);
  if (input.includes("%")) return null;

  // Innebygd IPv4 til slutt («::ffff:127.0.0.1») blir to hex-grupper.
  const lastColon = input.lastIndexOf(":");
  if (lastColon !== -1 && input.slice(lastColon + 1).includes(".")) {
    const octets = parseIPv4(input.slice(lastColon + 1));
    if (!octets) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    input = `${input.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = input.split("::");
  if (halves.length > 2) return null;
  const parseGroups = (part: string): number[] | null => {
    if (part === "") return [];
    const groups: number[] = [];
    for (const group of part.split(":")) {
      if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
      groups.push(parseInt(group, 16));
    }
    return groups;
  };
  const head = parseGroups(halves[0]);
  const tail = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (!head || !tail) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - tail.length;
  if (missing < 1) return null;
  return [...head, ...new Array<number>(missing).fill(0), ...tail];
}

function groupsMatch(groups: readonly number[], prefix: readonly number[], bits: number): boolean {
  for (let i = 0; i < Math.ceil(bits / 16); i += 1) {
    const remaining = Math.min(16, bits - i * 16);
    const mask = (0xffff << (16 - remaining)) & 0xffff;
    if ((groups[i] & mask) !== ((prefix[i] ?? 0) & mask)) return false;
  }
  return true;
}

function embeddedIPv4(groups: readonly number[], index: number): number[] {
  return [
    groups[index] >> 8,
    groups[index] & 0xff,
    groups[index + 1] >> 8,
    groups[index + 1] & 0xff,
  ];
}

/** `true` når IPv6-adressen (åtte grupper) er offentlig. */
export function isPublicIPv6Groups(groups: readonly number[]): boolean {
  // IPv4-mappet (::ffff:0:0/96): sjekk den innebygde IPv4-adressen.
  if (groupsMatch(groups, [0, 0, 0, 0, 0, 0xffff], 96)) {
    return isPublicIPv4Octets(embeddedIPv4(groups, 6));
  }
  const blocked: ReadonlyArray<readonly [number[], number]> = [
    [[0, 0, 0, 0, 0, 0], 96], // ::, ::1 og det gamle IPv4-kompatible området (strengere enn ::/128 og ::1/128)
    [[0, 0, 0, 0, 0xffff, 0], 96], // IPv4-oversatt (SIIT), ::ffff:0:0:0/96
    [[0x64, 0xff9b, 0, 0, 0, 0], 96], // NAT64
    [[0x64, 0xff9b, 1], 48], // lokalt NAT64
    [[0x100, 0, 0, 0], 64], // forkastingsområdet
    [[0x2001, 0], 32], // Teredo
    [[0x2001, 0xdb8], 32], // dokumentasjon
    [[0xfc00], 7], // unik-lokal
    [[0xfe80], 10], // lenkelokal
    [[0xfec0], 10], // gammel stedlokal
    [[0xff00], 8], // multicast
  ];
  if (blocked.some(([prefix, bits]) => groupsMatch(groups, prefix, bits))) return false;
  // 6to4 (2002::/16) bærer en IPv4-adresse som også må være offentlig.
  if (groups[0] === 0x2002) return isPublicIPv4Octets(embeddedIPv4(groups, 1));
  return true;
}

/** `true` når teksten er en IP-adresse (IPv4 eller IPv6, med eller uten []) som er offentlig. */
export function isPublicAddress(address: string): boolean {
  const bare = address.startsWith("[") && address.endsWith("]") ? address.slice(1, -1) : address;
  const family = isIP(bare);
  if (family === 4) {
    const octets = parseIPv4(bare);
    return octets !== null && isPublicIPv4Octets(octets);
  }
  if (family === 6 || bare.includes(":")) {
    const groups = parseIPv6(bare);
    return groups !== null && isPublicIPv6Groups(groups);
  }
  return false;
}

/** `true` når adressen er loopback (127.0.0.0/8, ::1 og IPv4-mappet loopback). */
export function isLoopbackAddress(address: string): boolean {
  const bare = address.startsWith("[") && address.endsWith("]") ? address.slice(1, -1) : address;
  const octets = parseIPv4(bare);
  if (octets) return octets[0] === 127;
  const groups = parseIPv6(bare);
  if (!groups) return false;
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true;
  return groupsMatch(groups, [0, 0, 0, 0, 0, 0xffff], 96) && groups[6] >> 8 === 127;
}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"] as const;

/** Vertsnavnet uten [] rundt IPv6, med små bokstaver og uten avsluttende punktum. */
export function canonicalHostname(hostname: string): string {
  let host = hostname.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  while (host.endsWith(".")) host = host.slice(0, -1);
  return host;
}

/**
 * `true` når vertsnavnet i seg selv viser at det er lokalt: `localhost`, `*.localhost`, `*.local`,
 * `*.internal`, `*.lan`, `*.home.arpa`, og navn uten punktum («intranett», «ruter»), som bare
 * lar seg slå opp i et lokalt nett. IP-adresser vurderes ikke her, men av `isPublicAddress`.
 */
export function isBlockedHostname(hostname: string): boolean {
  const host = canonicalHostname(hostname);
  if (host === "" || isIP(host) !== 0 || host.includes(":")) return false;
  if (host === "localhost" || host === "home.arpa") return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  // Navn uten punktum finnes ikke i offentlig DNS.
  return !host.includes(".");
}

/**
 * Vurderer vertsdelen av en URL før noe slås opp: en IP-adresse skrevet direkte må være offentlig,
 * et vertsnavn må ikke være lokalt. Navn som passerer, sjekkes igjen på selve tilkoblingen (lookup).
 */
export function isAllowedUrlHost(hostname: string): boolean {
  const host = canonicalHostname(hostname);
  if (host === "") return false;
  if (isIP(host) !== 0 || host.includes(":")) return isPublicAddress(host);
  return !isBlockedHostname(host);
}
