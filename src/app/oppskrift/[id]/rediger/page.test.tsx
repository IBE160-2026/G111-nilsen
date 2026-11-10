// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createManualRecipe } from "@/server/services/recipe-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({
  currentUserId: async () => session.userId,
  currentUser: async () =>
    session.userId === null ? null : { id: session.userId, email: "test@example.com" },
}));

const state = vi.hoisted(() => ({ db: null as Db | null, forcedErrorKind: null as string | null }));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

class NotFoundError extends Error {}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundError("NEXT_HTTP_ERROR_FALLBACK;404");
  },
  redirect: () => {},
}));

vi.mock("@/server/services/recipe-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/recipe-service")>();
  return {
    ...actual,
    getRecipeFor: (...args: Parameters<typeof actual.getRecipeFor>) =>
      state.forcedErrorKind
        ? { ok: false, error: { kind: state.forcedErrorKind } }
        : actual.getRecipeFor(...args),
  };
});

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

const { default: EditRecipePage, generateMetadata } = await import("./page");

afterEach(cleanup);
beforeEach(() => {
  state.db = createTestDb();
  state.forcedErrorKind = null;
});

type AsyncComponent = (props: unknown) => Promise<ReactElement>;

/** Kjører den asynkrone delen inne i Suspense-grensen, slik serveren gjør. */
async function renderPage(id: string): Promise<ReactElement> {
  const page = EditRecipePage({ params: Promise.resolve({ id }) }) as ReactElement<{
    children: ReactElement;
  }>;
  const loader = page.props.children;
  return (loader.type as AsyncComponent)(loader.props);
}

function create(values: Partial<Parameters<typeof createManualRecipe>[1]> = {}): number {
  const created = createManualRecipe(
    TEST_USER_ID,
    {
      title: "Pannekaker",
      servings: 4,
      ingredients: ["3 dl hvetemel", "0,5 ts salt", "salt og pepper"],
      steps: ["Visp.", "Stek.", "Tips: bruk smør."],
      ...values,
    },
    state.db!,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  return created.value.id;
}

describe("/oppskrift/[id]/rediger", () => {
  it("viser skjemaet forhåndsutfylt med «Lagre endringer» og «Avbryt»", async () => {
    const id = create();
    render(await renderPage(String(id)));

    expect(screen.getByRole("heading", { level: 1, name: "Rediger «Pannekaker»" })).toBeVisible();
    expect(screen.getByLabelText("Tittel")).toHaveValue("Pannekaker");
    expect(screen.getByLabelText("Antall personer")).toHaveValue("4");
    expect(screen.getByLabelText("Ingredienser")).toHaveValue(
      "3 dl hvetemel\n0,5 ts salt\nsalt og pepper",
    );
    expect(screen.getByLabelText("Steg (valgfritt)")).toHaveValue("Visp.\nStek.\nTips: bruk smør.");
    expect(screen.getByRole("button", { name: "Lagre endringer" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Avbryt" })).toHaveAttribute(
      "href",
      `/oppskrift/${id}`,
    );
  });

  it("lar porsjonsfeltet stå tomt når oppskriften ikke har antall", async () => {
    const id = create();
    state.db!.$client.prepare("update recipes set original_servings = null where id = ?").run(id);
    render(await renderPage(String(id)));
    expect(screen.getByLabelText("Antall personer")).toHaveValue("");
  });

  it("sorterer ingredienser og steg på position", async () => {
    const id = create();
    state
      .db!.$client.prepare("update steps set position = 5 - position where recipe_id = ?")
      .run(id);
    state
      .db!.$client.prepare(
        "update ingredient_lines set position = 5 - position where recipe_id = ?",
      )
      .run(id);
    render(await renderPage(String(id)));
    expect(screen.getByLabelText("Steg (valgfritt)")).toHaveValue("Tips: bruk smør.\nStek.\nVisp.");
    expect(screen.getByLabelText("Ingredienser")).toHaveValue(
      "salt og pepper\n0,5 ts salt\n3 dl hvetemel",
    );
  });

  it.each(["999999", "abc", "0", "1abc", "01", "-1", "1.5", "Infinity", String(2 ** 53)])(
    "ukjent eller ugyldig id %s gir notFound()",
    async (id) => {
      await expect(renderPage(id)).rejects.toBeInstanceOf(NotFoundError);
    },
  );

  it("andre feil enn not_found kastes videre til error.tsx", async () => {
    state.forcedErrorKind = "validation";
    const rendering = renderPage("1");
    await expect(rendering).rejects.toThrow(/validation/);
    await expect(rendering).rejects.not.toBeInstanceOf(NotFoundError);
  });

  it("setter fanetittelen «Rediger · <tittel>»", async () => {
    const id = create();
    const metadata = await generateMetadata({ params: Promise.resolve({ id: String(id) }) });
    expect(metadata.title).toBe("Rediger · Pannekaker");
  });

  it.each(["999999", "abc"])("ukjent id %s gir fanetittelen «Rediger»", async (id) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ id }) });
    expect(metadata.title).toBe("Rediger");
  });
});
