import { describe, expect, it } from "vitest";
import {
  canonicalHostname,
  isAllowedUrlHost,
  isBlockedHostname,
  isLoopbackAddress,
  isPublicAddress,
  parseIPv6,
} from "./address-policy";

describe("isPublicAddress: IPv4", () => {
  // [adresse, offentlig?]: hver blokkerte rekkevidde med første og siste adresse og naboer utenfor.
  it.each([
    // 0.0.0.0/8
    ["0.0.0.0", false],
    ["0.255.255.255", false],
    ["1.0.0.1", true],
    // 10/8
    ["9.255.255.255", true],
    ["10.0.0.0", false],
    ["10.255.255.255", false],
    ["11.0.0.0", true],
    // 100.64/10
    ["100.63.255.255", true],
    ["100.64.0.0", false],
    ["100.127.255.255", false],
    ["100.128.0.0", true],
    // 127/8
    ["126.255.255.255", true],
    ["127.0.0.1", false],
    ["127.255.255.255", false],
    ["128.0.0.1", true],
    // 169.254/16
    ["169.253.255.255", true],
    ["169.254.0.0", false],
    ["169.254.169.254", false],
    ["169.254.255.255", false],
    ["169.255.0.0", true],
    // 172.16/12
    ["172.15.255.255", true],
    ["172.16.0.0", false],
    ["172.31.255.255", false],
    ["172.32.0.0", true],
    // 192.0.0/24, 192.0.2/24
    ["192.0.0.0", false],
    ["192.0.0.255", false],
    ["192.0.1.1", true],
    ["192.0.2.0", false],
    ["192.0.2.255", false],
    ["192.0.3.0", true],
    // 192.88.99/24
    ["192.88.98.255", true],
    ["192.88.99.1", false],
    ["192.88.100.0", true],
    // 192.168/16
    ["192.167.255.255", true],
    ["192.168.0.1", false],
    ["192.168.255.255", false],
    ["192.169.0.0", true],
    // 198.18/15
    ["198.17.255.255", true],
    ["198.18.0.0", false],
    ["198.19.255.255", false],
    ["198.20.0.0", true],
    // 198.51.100/24, 203.0.113/24
    ["198.51.99.255", true],
    ["198.51.100.7", false],
    ["198.51.101.0", true],
    ["203.0.112.255", true],
    ["203.0.113.7", false],
    ["203.0.114.0", true],
    // 224/4 og 240/4
    ["223.255.255.255", true],
    ["224.0.0.1", false],
    ["239.255.255.255", false],
    ["240.0.0.0", false],
    ["255.255.255.254", false],
    ["255.255.255.255", false],
    // offentlige
    ["8.8.8.8", true],
    ["1.1.1.1", true],
    ["93.184.216.34", true],
    ["151.101.1.69", true],
  ])("%s er offentlig: %s", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });
});

describe("isPublicAddress: IPv6", () => {
  it.each([
    ["::", false],
    ["::1", false],
    ["[::1]", false],
    ["0:0:0:0:0:0:0:1", false],
    ["0000:0000:0000:0000:0000:0000:0000:0001", false],
    ["::2", false],
    ["::7f00:1", false],
    // IPv4-mappet: den innebygde IPv4-adressen avgjør
    ["::ffff:127.0.0.1", false],
    ["::ffff:7f00:1", false],
    ["::FFFF:7F00:0001", false],
    ["0:0:0:0:0:ffff:10.0.0.1", false],
    ["::ffff:10.1.2.3", false],
    ["::ffff:192.168.1.1", false],
    ["::ffff:169.254.169.254", false],
    ["::ffff:a9fe:a9fe", false],
    ["::ffff:0.0.0.0", false],
    ["::ffff:8.8.8.8", true],
    ["::ffff:808:808", true],
    // NAT64
    ["64:ff9b::1", false],
    ["64:ff9b::808:808", false],
    ["64:ff9b::7f00:1", false],
    ["64:ff9b:1::1", false],
    // 100::/64
    ["100::", false],
    ["100::1", false],
    ["100:0:0:1::1", true],
    // dokumentasjon
    ["2001:db8::", false],
    ["2001:db8:ffff::1", false],
    ["2001:db9::1", true],
    // unik-lokal fc00::/7
    ["fc00::1", false],
    ["fd12:3456:789a::1", false],
    ["fdff:ffff::1", false],
    ["fe00::1", true],
    ["fbff::1", true],
    // lenkelokal fe80::/10
    ["fe80::1", false],
    ["febf::1", false],
    ["fec0::1", false],
    ["fe80::1%eth0", false],
    // multicast
    ["ff00::1", false],
    ["ff02::1", false],
    ["ffff::1", false],
    // Teredo og 6to4
    ["2001::1", false],
    ["2002:7f00:1::1", false],
    ["2002:a00:1::1", false],
    ["2002:808:808::1", true],
    // offentlige
    ["2606:4700:4700::1111", true],
    ["2001:4860:4860::8888", true],
    ["2a00:1450:4001:81b::200e", true],
    // ugyldig tolkes som blokkert
    ["", false],
    ["abc", false],
    ["1.2.3", false],
    ["1.2.3.4.5", false],
    ["256.1.1.1", false],
    ["::g", false],
    ["1:2:3:4:5:6:7:8:9", false],
    ["1::2::3", false],
  ])("%s er offentlig: %s", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });
});

describe("parseIPv6", () => {
  it("utvider :: og innebygd IPv4", () => {
    expect(parseIPv6("::1")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(parseIPv6("1::")).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(parseIPv6("::ffff:1.2.3.4")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x102, 0x304]);
    expect(parseIPv6("1:2:3:4:5:6:7:8")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each(["1:2:3:4:5:6:7", "::1:2:3:4:5:6:7:8", "1::2::3", "12345::", "::ffff:1.2.3"])(
    "avviser %s",
    (text) => {
      expect(parseIPv6(text)).toBeNull();
    },
  );
});

describe("isLoopbackAddress", () => {
  it.each([
    ["127.0.0.1", true],
    ["127.9.9.9", true],
    ["::1", true],
    ["[::1]", true],
    ["::ffff:127.0.0.1", true],
    ["10.0.0.1", false],
    ["8.8.8.8", false],
    ["::2", false],
    ["abc", false],
  ])("%s", (address, expected) => {
    expect(isLoopbackAddress(address)).toBe(expected);
  });
});

describe("isBlockedHostname", () => {
  it.each([
    ["localhost", true],
    ["LOCALHOST", true],
    ["localhost.", true],
    ["app.localhost", true],
    ["a.b.localhost", true],
    ["printer.local", true],
    ["Printer.Local.", true],
    ["db.internal", true],
    ["metadata.google.internal", true],
    ["nas.lan", true],
    ["router.home.arpa", true],
    ["home.arpa", true],
    // navn uten punktum finnes ikke i offentlig DNS
    ["intranett", true],
    ["ruter", true],
    // like på slutten, men ikke et suffiks
    ["notlocalhost.no", false],
    ["mylocal.no", false],
    ["local.no", false],
    ["internal.example.com", false],
    ["lan.no", false],
    ["www.matprat.no", false],
    ["xn--bokml-pra.no", false],
    // IP-adresser vurderes av isPublicAddress, ikke her
    ["127.0.0.1", false],
    ["[::1]", false],
  ])("%s er blokkert: %s", (host, expected) => {
    expect(isBlockedHostname(host)).toBe(expected);
  });
});

describe("isAllowedUrlHost", () => {
  it.each([
    ["www.matprat.no", true],
    ["8.8.8.8", true],
    ["[2606:4700:4700::1111]", true],
    ["localhost", false],
    ["127.0.0.1", false],
    ["[::1]", false],
    ["[::ffff:7f00:1]", false],
    ["10.0.0.1", false],
    ["169.254.169.254", false],
    ["app.local", false],
    ["", false],
  ])("%s er tillatt: %s", (host, expected) => {
    expect(isAllowedUrlHost(host)).toBe(expected);
  });

  it("URL-parserens IP-former ender som adresser adapteren avviser", () => {
    for (const input of [
      "http://2130706433/",
      "http://0x7f.1/",
      "http://127.1/",
      "http://0177.0.0.1/",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[0:0:0:0:0:0:0:1]/",
      "http://0/",
      "http://167772161/",
      "http://3232235777/",
      "http://2852039166/",
    ]) {
      expect(isAllowedUrlHost(new URL(input).hostname), input).toBe(false);
    }
  });
});

describe("canonicalHostname", () => {
  it("fjerner [], avsluttende punktum og store bokstaver", () => {
    expect(canonicalHostname("[::1]")).toBe("::1");
    expect(canonicalHostname("WWW.A.NO..")).toBe("www.a.no");
  });
});
