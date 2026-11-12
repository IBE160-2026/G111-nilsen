// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountFormState } from "@/app/_shared/account-form";
import AccountForm from "./AccountForm";
import AccountFormExtras from "./AccountFormExtras";

afterEach(cleanup);

describe("AccountForm", () => {
  it("innlogging: e-post, passord, knapp og lenke til ny konto med «neste»", () => {
    render(
      <AccountForm
        mode="login"
        action={vi.fn()}
        extras={<AccountFormExtras mode="login" next="/oppskrifter" />}
      />,
    );
    expect(screen.getByLabelText("E-post")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Passord")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Passord")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Logg inn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lag konto" })).toHaveAttribute(
      "href",
      "/ny-konto?neste=%2Foppskrifter",
    );
  });

  it("ny konto: passordhint og lenke til innlogging", () => {
    render(
      <AccountForm
        mode="register"
        action={vi.fn()}
        extras={<AccountFormExtras mode="register" next="/" />}
      />,
    );
    expect(screen.getByLabelText("Passord")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Passord")).toHaveAccessibleDescription("Minst 8 tegn.");
    expect(screen.getByRole("link", { name: "Logg inn" })).toHaveAttribute("href", "/logg-inn");
  });

  it("sender skjemaet og viser feil under feltet med fokus, og beholder e-posten", async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (_state: AccountFormState, data: FormData): Promise<AccountFormState> => ({
        email: String(data.get("email")),
        passwordError: "Passordet må ha minst 8 tegn.",
      }),
    );
    render(
      <AccountForm
        mode="register"
        action={action}
        extras={<AccountFormExtras mode="register" next="/handleliste" />}
      />,
    );
    await user.type(screen.getByLabelText("E-post"), "maja@eksempel.no");
    await user.type(screen.getByLabelText("Passord"), "kort");
    await user.click(screen.getByRole("button", { name: "Lag konto" }));
    expect(await screen.findByText("Passordet må ha minst 8 tegn.")).toBeInTheDocument();
    const sent = action.mock.calls[0][1];
    expect(sent.get("neste")).toBe("/handleliste");
    expect(screen.getByLabelText("Passord")).toHaveFocus();
    expect(screen.getByLabelText("Passord")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("E-post")).toHaveValue("maja@eksempel.no");
  });

  it("feil e-post eller passord vises for hele skjemaet", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      email: "a@b.no",
      formError: "Feil e-post eller passord.",
    }));
    render(
      <AccountForm
        mode="login"
        action={action}
        extras={<AccountFormExtras mode="login" next="/" />}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Logg inn" }));
    expect(await screen.findByText("Feil e-post eller passord.")).toBeInTheDocument();
  });
});
