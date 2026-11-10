// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ user: null as { id: number; email: string } | null }));
vi.mock("@/server/session", () => ({ currentUser: async () => session.user }));
vi.mock("@/app/account-actions", () => ({ logOutAccount: vi.fn() }));

const { default: AccountLink } = await import("./AccountLink");

afterEach(cleanup);

describe("AccountLink", () => {
  it("uten innlogging: lenke til «Logg inn»", async () => {
    session.user = null;
    render(await AccountLink());
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute("href", "/logg-inn");
  });

  it("innlogget: e-posten og «Logg ut»", async () => {
    session.user = { id: 1, email: "maja@eksempel.no" };
    render(await AccountLink());
    expect(screen.getByText("maja@eksempel.no")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logg ut" })).toBeInTheDocument();
  });
});
