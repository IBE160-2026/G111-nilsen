// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OFFLINE_LIST_KEY } from "@/lib/offline-list";

const session = vi.hoisted(() => ({ user: null as { id: number; email: string } | null }));
vi.mock("@/server/session", () => ({ currentUser: async () => session.user }));
vi.mock("@/app/account-actions", () => ({ logOutAccount: vi.fn() }));

const { default: AccountLink } = await import("./AccountLink");

beforeEach(() => window.localStorage.setItem(OFFLINE_LIST_KEY, "{}"));
afterEach(cleanup);

describe("AccountLink", () => {
  it("uten innlogging: lenke til «Logg inn»", async () => {
    session.user = null;
    render(await AccountLink());
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute("href", "/logg-inn");
    // Handlelisten som er lagret i nettleseren slettes (Story 6.17).
    expect(window.localStorage.getItem(OFFLINE_LIST_KEY)).toBeNull();
  });

  it("uten innlogging og uten nett: handlelisten i nettleseren beholdes", async () => {
    session.user = null;
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(await AccountLink());
    expect(window.localStorage.getItem(OFFLINE_LIST_KEY)).toBe("{}");
    vi.restoreAllMocks();
  });

  it("innlogget: e-posten og «Logg ut»", async () => {
    session.user = { id: 1, email: "maja@eksempel.no" };
    render(await AccountLink());
    expect(screen.getByText("maja@eksempel.no")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logg ut" })).toBeInTheDocument();
    expect(window.localStorage.getItem(OFFLINE_LIST_KEY)).toBe("{}");
  });
});
