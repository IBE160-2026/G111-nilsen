// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ManualRecipeFormState } from "@/app/ny/actions";
import ManualRecipeForm from "./ManualRecipeForm";

afterEach(cleanup);

/** En falsk action som svarer som serveren gjør ved valideringsfeil. */
function failingAction(fieldErrors: ManualRecipeFormState["fieldErrors"]) {
  return vi.fn(async (_state: ManualRecipeFormState, formData: FormData) => ({
    fieldErrors,
    values: {
      title: String(formData.get("title") ?? ""),
      servings: String(formData.get("servings") ?? ""),
      ingredients: String(formData.get("ingredients") ?? ""),
      steps: String(formData.get("steps") ?? ""),
    },
  }));
}

describe("ManualRecipeForm", () => {
  it("har synlige etiketter for alle felt og knappen «Lagre oppskrift»", () => {
    render(<ManualRecipeForm action={failingAction({})} />);
    expect(screen.getByLabelText("Tittel")).toHaveAttribute("name", "title");
    expect(screen.getByLabelText("Antall personer")).toHaveAttribute("name", "servings");
    expect(screen.getByLabelText("Ingredienser")).toHaveAttribute("name", "ingredients");
    expect(screen.getByLabelText("Steg (valgfritt)")).toHaveAttribute("name", "steps");
    expect(screen.getByRole("button", { name: "Lagre oppskrift" })).toBeEnabled();
    expect(screen.getByLabelText("Ingredienser")).toHaveAccessibleDescription(
      /Én ingrediens per linje/,
    );
  });

  it("viser feil under feltet, kobler dem med aria-describedby, beholder verdier og flytter fokus", async () => {
    const user = userEvent.setup();
    const action = failingAction({
      servings: "Skriv et helt tall fra 1 til 50.",
      ingredients: "Skriv minst én ingrediens, én per linje.",
    });
    render(<ManualRecipeForm action={action} />);

    await user.type(screen.getByLabelText("Tittel"), "Pannekaker");
    await user.type(screen.getByLabelText("Antall personer"), "2,5");
    await user.type(screen.getByLabelText("Steg (valgfritt)"), "Stek");
    await user.click(screen.getByRole("button", { name: "Lagre oppskrift" }));

    const servings = screen.getByLabelText("Antall personer");
    await waitFor(() => expect(servings).toHaveFocus());
    expect(action).toHaveBeenCalledTimes(1);

    expect(servings).toHaveAttribute("aria-invalid", "true");
    expect(servings).toHaveAccessibleDescription(/Skriv et helt tall fra 1 til 50\./);
    expect(servings.getAttribute("aria-describedby")).toContain("servings-error");
    expect(document.getElementById("servings-error")).toHaveTextContent(
      "Skriv et helt tall fra 1 til 50.",
    );
    expect(screen.getByLabelText("Ingredienser")).toHaveAccessibleDescription(
      /Skriv minst én ingrediens/,
    );
    expect(screen.getByLabelText("Tittel")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Tittel")).not.toHaveAttribute("aria-describedby");

    expect(screen.getByLabelText("Tittel")).toHaveValue("Pannekaker");
    expect(servings).toHaveValue("2,5");
    expect(screen.getByLabelText("Steg (valgfritt)")).toHaveValue("Stek");
  });

  it("deaktiverer knappen mens skjemaet sendes", async () => {
    const user = userEvent.setup();
    let finish: (state: ManualRecipeFormState) => void = () => {};
    const action = vi.fn(() => new Promise<ManualRecipeFormState>((resolve) => (finish = resolve)));
    render(<ManualRecipeForm action={action} />);
    const button = screen.getByRole("button", { name: "Lagre oppskrift" });
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    finish({
      fieldErrors: { title: "Skriv en tittel." },
      values: { title: "", servings: "", ingredients: "", steps: "" },
    });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.getByLabelText("Tittel")).toHaveFocus();
  });

  it("har live-regionen i DOM-en også før det finnes en skjemafeil", () => {
    const { container } = render(<ManualRecipeForm action={failingAction({})} />);
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();
  });

  it("viser skjemafeil i et aria-live-område og flytter fokus dit", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async () => ({
      fieldErrors: {},
      values: { title: "A", servings: "4", ingredients: "2 egg", steps: "" },
      formError: "Noe gikk galt. Prøv igjen.",
    }));
    render(<ManualRecipeForm action={action} />);
    await user.click(screen.getByRole("button", { name: "Lagre oppskrift" }));
    const message = await screen.findByText("Noe gikk galt. Prøv igjen.");
    const region = message.closest("[aria-live]");
    expect(region).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(region).toHaveFocus());
    expect(screen.getByLabelText("Tittel")).toHaveValue("A");
  });
});
