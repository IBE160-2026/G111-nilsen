// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Activity } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImportFailure, ImportFormState } from "@/app/_shared/import-form";
import { errorMessages, importMessages } from "@/lib/messages";
import ImportForm from "./ImportForm";

afterEach(cleanup);

type Action = (state: ImportFormState, formData: FormData) => Promise<ImportFormState>;

function failure(kind: ImportFailure["kind"], recipeId?: number): ImportFailure {
  const message = errorMessages[kind];
  return { ok: false, kind, title: message.title, body: message.body, recipeId };
}

/** En action som svarer med feilen (og beholder lenken) som den ekte `submitImport`. */
function failing(kind: ImportFailure["kind"], recipeId?: number) {
  return vi.fn<Action>(async (previous, formData) => ({
    url: String(formData.get("url")),
    error: failure(kind, recipeId),
    attempt: previous.attempt + 1,
  }));
}

/** En action som aldri er ferdig før `release()` kalles. */
function slow() {
  let release!: () => void;
  const gate = new Promise<void>((done) => (release = done));
  const action = vi.fn<Action>(async (previous, formData) => {
    await gate;
    return {
      url: String(formData.get("url")),
      error: failure("fetch_failed"),
      attempt: previous.attempt + 1,
    };
  });
  return { action, release };
}

const field = () => screen.getByRole("textbox", { name: importMessages.label });
const submit = () => screen.getByRole("button", { name: importMessages.submit });

describe("ImportForm: åpning og felt", () => {
  it("lenkefeltet har fokus når siden åpnes", () => {
    render(<ImportForm action={failing("invalid_url")} />);
    expect(field()).toHaveFocus();
  });

  it("autofokus settes av useEffect, ikke av autoFocus-attributtet", () => {
    render(<ImportForm action={failing("invalid_url")} />);
    expect(field()).not.toHaveAttribute("autofocus");
  });

  it("feltet har etikett, url-tastatur, ingen autofyll og ingen stavekontroll", () => {
    render(<ImportForm action={failing("invalid_url")} />);
    expect(field()).toHaveAttribute("type", "text");
    expect(field()).toHaveAttribute("inputmode", "url");
    expect(field()).toHaveAttribute("autocomplete", "off");
    expect(field()).toHaveAttribute("spellcheck", "false");
    expect(field()).toHaveAttribute("name", "url");
    expect(field()).toHaveAccessibleDescription(importMessages.hint);
    expect(field()).not.toHaveAttribute("aria-invalid");
  });

  it("har ingen feilmelding og et tomt statusområde ved start", () => {
    render(<ImportForm action={failing("invalid_url")} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("ImportForm: sending", () => {
  it("Enter sender det som står i feltet", async () => {
    const user = userEvent.setup();
    const action = failing("invalid_url");
    render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][1].get("url")).toBe("https://a.no/x");
  });

  it("knappen «Hent oppskrift» sender", async () => {
    const user = userEvent.setup();
    const action = failing("invalid_url");
    render(<ImportForm action={action} />);
    await user.type(field(), "hei");
    await user.click(submit());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][1].get("url")).toBe("hei");
  });

  it("tomt felt sendes til serveren, som gir meldingen om ugyldig lenke", async () => {
    const user = userEvent.setup();
    const action = failing("invalid_url");
    render(<ImportForm action={action} />);
    await user.click(submit());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0][1].get("url")).toBe("");
  });
});

describe("ImportForm: mens henting pågår", () => {
  it("knappen sier «Henter oppskriften …», er aria-disabled, og statusområdet sier det samme", async () => {
    const user = userEvent.setup();
    const { action, release } = slow();
    render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x{Enter}");

    const button = await screen.findByRole("button", { name: importMessages.pending });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(importMessages.pending);
    expect(field()).toHaveValue("https://a.no/x");
    expect(field()).toHaveAttribute("readonly");

    await act(async () => release());
    await screen.findByRole("button", { name: importMessages.submit });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("dobbeltklikk gir bare én henting, og fokus blir på knappen", async () => {
    const user = userEvent.setup();
    const { action, release } = slow();
    render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x");
    const button = submit();
    await user.dblClick(button);
    await user.click(button);
    await user.keyboard("{Enter}");
    expect(action).toHaveBeenCalledTimes(1);
    expect(button).toHaveFocus();
    await act(async () => release());
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("to synkrone innsendinger gir bare én henting", async () => {
    const user = userEvent.setup();
    const { action, release } = slow();
    render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x");
    const form = field().closest("form")!;
    act(() => {
      form.requestSubmit();
      form.requestSubmit();
    });
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => release());
  });

  it("etter feil ved klikk på knappen går fokus tilbake til feltet", async () => {
    const user = userEvent.setup();
    render(<ImportForm action={failing("fetch_failed")} />);
    await user.type(field(), "https://a.no/x");
    await user.click(submit());
    await screen.findByRole("alert");
    expect(field()).toHaveFocus();
  });

  it("Enter i feltet mens det pågår sender ikke på nytt", async () => {
    const user = userEvent.setup();
    const { action, release } = slow();
    render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x{Enter}");
    await screen.findByRole("button", { name: importMessages.pending });
    field().focus();
    await user.keyboard("{Enter}{Enter}");
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => release());
  });

  it("etter en feil kan man sende på nytt", async () => {
    const user = userEvent.setup();
    const action = failing("fetch_failed");
    render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x{Enter}");
    await screen.findByRole("alert");
    await user.click(submit());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  });
});

describe("ImportForm: feil", () => {
  it.each(["invalid_url", "fetch_failed", "no_recipe"] as const)(
    "%s: varsel med tittel og forklaring, «Legg inn selv» til /ny",
    async (kind) => {
      const user = userEvent.setup();
      render(<ImportForm action={failing(kind)} />);
      await user.type(field(), "https://a.no/x{Enter}");
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(errorMessages[kind].title);
      expect(alert).toHaveTextContent(errorMessages[kind].body);
      expect(
        within(alert).getByRole("link", { name: importMessages.enterManually }),
      ).toHaveAttribute("href", "/ny");
      expect(within(alert).queryByRole("link", { name: importMessages.openRecipe })).toBeNull();
    },
  );

  it("feltet er koblet til feilen (aria-describedby, aria-invalid), lenken står igjen og fokus er i feltet", async () => {
    const user = userEvent.setup();
    render(<ImportForm action={failing("fetch_failed")} />);
    await user.type(field(), "https://a.no/Lang?x=1{Enter}");
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(field()).toHaveFocus());
    expect(field()).toHaveValue("https://a.no/Lang?x=1");
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field().getAttribute("aria-describedby")).toContain(alert.id);
    expect(field()).toHaveAccessibleDescription(
      `${importMessages.hint} ${errorMessages.fetch_failed.title} ${errorMessages.fetch_failed.body} ${importMessages.enterManually}`,
    );
  });

  it("feilen står under feltet, før knappen", async () => {
    const user = userEvent.setup();
    render(<ImportForm action={failing("no_recipe")} />);
    await user.type(field(), "x{Enter}");
    const alert = await screen.findByRole("alert");
    expect(field().compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(alert.compareDocumentPosition(submit()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("duplicate: «Åpne oppskriften» til oppskriften i stedet for «Legg inn selv»", async () => {
    const user = userEvent.setup();
    render(<ImportForm action={failing("duplicate", 12)} />);
    await user.type(field(), "https://a.no/x{Enter}");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Du har allerede lagret denne oppskriften");
    expect(within(alert).getByRole("link", { name: importMessages.openRecipe })).toHaveAttribute(
      "href",
      "/oppskrift/12",
    );
    expect(within(alert).queryByRole("link", { name: importMessages.enterManually })).toBeNull();
    expect(field()).toHaveValue("https://a.no/x");
  });

  it("samme feil to ganger leses opp på nytt: meldingen tegnes om", async () => {
    const user = userEvent.setup();
    render(<ImportForm action={failing("fetch_failed")} />);
    await user.type(field(), "https://a.no/x{Enter}");
    const first = await screen.findByRole("alert");
    await user.click(submit());
    await waitFor(() => expect(screen.getByRole("alert")).not.toBe(first));
  });

  it("meldingen forsvinner mens en ny henting pågår", async () => {
    const user = userEvent.setup();
    let mode: "fail" | "slow" = "fail";
    let release!: () => void;
    const gate = new Promise<void>((done) => (release = done));
    const action = vi.fn<Action>(async (previous, formData) => {
      if (mode === "slow") await gate;
      return {
        url: String(formData.get("url")),
        error: failure("fetch_failed"),
        attempt: previous.attempt + 1,
      };
    });
    render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x{Enter}");
    await screen.findByRole("alert");
    mode = "slow";
    await user.click(submit());
    await screen.findByRole("button", { name: importMessages.pending });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => release());
    await screen.findByRole("alert");
  });
});

describe("ImportForm: nullstilling ved navigasjon", () => {
  function page(mode: "visible" | "hidden", action: Action) {
    return (
      <Activity mode={mode}>
        <ImportForm action={action} />
      </Activity>
    );
  }

  it("Activity skjuler og viser siden: feltet og feilen er nullstilt, og fokus er i feltet", async () => {
    const user = userEvent.setup();
    const action = failing("fetch_failed");
    const { rerender } = render(page("visible", action));
    await user.type(field(), "https://a.no/x{Enter}");
    await screen.findByRole("alert");

    rerender(page("hidden", action));
    rerender(page("visible", action));
    await waitFor(() => expect(field()).toHaveValue(""));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");
    expect(field()).toHaveFocus();
    expect(submit()).toBeInTheDocument();
  });

  it("avmontering og ny montering gir et tomt skjema", async () => {
    const user = userEvent.setup();
    const action = failing("fetch_failed");
    const first = render(<ImportForm action={action} />);
    await user.type(field(), "https://a.no/x{Enter}");
    await screen.findByRole("alert");
    first.unmount();
    render(<ImportForm action={action} />);
    expect(field()).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ImportForm.module.css", () => {
  const css = readFileSync(join(process.cwd(), "src/components/ImportForm.module.css"), "utf8");

  it("bruker bare tokens (ingen hardkodede farger)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(|\bhsla?\(/);
  });

  it("44 px trykkflater, fokusring, lange lenker og forced-colors", () => {
    expect(css.match(/min-height:\s*var\(--tap-target-min\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("forced-colors: active");
  });
});
