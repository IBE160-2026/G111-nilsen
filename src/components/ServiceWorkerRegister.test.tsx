// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

const register = vi.fn();

beforeEach(() => {
  register.mockReset().mockResolvedValue({});
  Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
});
afterEach(() => {
  cleanup();
  // @ts-expect-error fjerner stubben
  delete navigator.serviceWorker;
});

describe("ServiceWorkerRegister", () => {
  it("registrerer /sw.js når den er slått på", () => {
    render(<ServiceWorkerRegister enabled />);
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("gjør ingenting når den er av (utvikling)", () => {
    render(<ServiceWorkerRegister enabled={false} />);
    expect(register).not.toHaveBeenCalled();
  });

  it("tåler at registreringen feiler", async () => {
    register.mockRejectedValue(new Error("nei"));
    expect(() => render(<ServiceWorkerRegister enabled />)).not.toThrow();
    await Promise.resolve();
  });

  it("gjør ingenting i nettlesere uten service worker", () => {
    // @ts-expect-error fjerner stubben
    delete navigator.serviceWorker;
    expect(() => render(<ServiceWorkerRegister enabled />)).not.toThrow();
    expect(register).not.toHaveBeenCalled();
  });
});
