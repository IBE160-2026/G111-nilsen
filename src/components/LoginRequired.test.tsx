// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LoginRequired, { loginHref } from "./LoginRequired";

afterEach(cleanup);

describe("LoginRequired", () => {
  it("lenker til innlogging og ny konto, med veien tilbake", () => {
    render(<LoginRequired next="/mapper/3" />);
    expect(screen.getByRole("heading", { name: "Logg inn for å se dette" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute(
      "href",
      "/logg-inn?neste=%2Fmapper%2F3",
    );
    expect(screen.getByRole("link", { name: "Lag konto" })).toHaveAttribute(
      "href",
      "/ny-konto?neste=%2Fmapper%2F3",
    );
  });

  it("loginHref koder stien", () => {
    expect(loginHref("/a?b=1")).toBe("/logg-inn?neste=%2Fa%3Fb%3D1");
  });
});
