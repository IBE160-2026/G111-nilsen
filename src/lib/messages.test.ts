import { describe, expect, it } from "vitest";
import {
  collectionMessages,
  deleteDialogMessages,
  deleteFolderDialogMessages,
  editRecipeMessages,
  errorMessages,
  fallbackMessage,
  favoriteMessages,
  folderDialogMessages,
  folderMessages,
  manualRecipeFieldMessages,
  messageFor,
  recipeActionMessages,
  recipeCountLabel,
  servingStepperMessages,
} from "./messages";
import { LIMITS } from "./recipe-input";
import { ERROR_KINDS } from "./result";

describe("messageFor", () => {
  it.each(ERROR_KINDS)("%s gir en egen norsk melding", (kind) => {
    const message = messageFor(kind);
    expect(message).toBe(errorMessages[kind]);
    expect(message.title.length).toBeGreaterThan(0);
    expect(message.body.length).toBeGreaterThan(0);
  });

  it.each([undefined, null, "", "ukjent", "toString", "__proto__"])(
    "%s gir reservemeldingen",
    (kind) => {
      expect(messageFor(kind)).toBe(fallbackMessage);
    },
  );

  it("meldingene bruker ikke utropstegn", () => {
    const texts = [
      ...Object.values(errorMessages).flatMap((m) => [m.title, m.body]),
      fallbackMessage.title,
      fallbackMessage.body,
      ...Object.values(manualRecipeFieldMessages),
      ...Object.values(servingStepperMessages),
      ...Object.values(editRecipeMessages),
      ...Object.values(collectionMessages),
      ...Object.values(recipeActionMessages),
      ...Object.values(deleteDialogMessages),
      ...Object.values(folderMessages),
      ...Object.values(deleteFolderDialogMessages),
      ...Object.values(folderDialogMessages),
      ...Object.values(favoriteMessages),
      recipeCountLabel(0),
      recipeCountLabel(1),
      recipeCountLabel(12),
    ];
    for (const text of texts) expect(text).not.toContain("!");
  });
});

describe("servingStepperMessages", () => {
  it("bygger grensene for antall personer fra LIMITS", () => {
    expect(servingStepperMessages.invalid).toContain(
      `${LIMITS.servingsMin} til ${LIMITS.servingsMax}`,
    );
  });
});

describe("recipeActionMessages og deleteDialogMessages", () => {
  it("har teksten fra spesifikasjonen (Story 3.2)", () => {
    expect(recipeActionMessages).toEqual({
      save: "Lagre",
      saving: "Lagrer …",
      saved: "Lagret.",
      delete: "Slett",
      chooseFolder: "Lagre i mappe",
      changeFolderSuffix: "bytt mappe",
      folderSavedPrefix: "Lagret i ",
      folderSavedSuffix: ".",
      folderRemoved: "Fjernet fra mappen.",
    });
    expect(deleteDialogMessages.title).toBe("Slette oppskriften?");
    expect(deleteDialogMessages.confirm).toBe("Slett");
    expect(deleteDialogMessages.cancel).toBe("Avbryt");
  });
});

describe("mappetekster (Story 3.3)", () => {
  it("har meldingene for mappenavn fra spesifikasjonen", () => {
    expect(folderMessages.nameTaken).toBe("Du har allerede en mappe med dette navnet.");
    expect(folderMessages.nameRequired.length).toBeGreaterThan(0);
    expect(folderMessages.nameTooLong).toContain("40");
  });

  it("har tekstene for lagre-linjen og dialogene", () => {
    expect(recipeActionMessages.chooseFolder).toBe("Lagre i mappe");
    expect(recipeActionMessages.folderRemoved).toBe("Fjernet fra mappen.");
    expect(deleteFolderDialogMessages.title).toBe("Slette mappen?");
    expect(deleteFolderDialogMessages.descriptionAfterName).toContain("liggende i Oppskrifter");
    expect(folderDialogMessages.title).toBe("Lagre i mappe");
  });

  it.each([
    [0, "Ingen oppskrifter"],
    [1, "1 oppskrift"],
    [3, "3 oppskrifter"],
    [12, "12 oppskrifter"],
  ])("recipeCountLabel(%s) gir «%s»", (count, expected) => {
    expect(recipeCountLabel(count)).toBe(expected);
  });
});

describe("favoriteMessages (Story 3.4)", () => {
  it("har teksten fra spesifikasjonen, og tom-tilstanden er uendret fra før", () => {
    expect(favoriteMessages).toEqual({
      heading: "Favoritter",
      loading: "Henter favorittene …",
      loadFailed: "Kunne ikke hente favorittene",
      emptyTitle: "Du har ingen favoritter ennå.",
      emptyDescription: "Trykk på hjertet på en oppskrift for å gjøre den til favoritt.",
      emptyAction: "Gå til oppskriftene",
      labelPrefix: "Favoritt: ",
      added: "Lagt til i favoritter.",
      removed: "Fjernet fra favoritter.",
    });
  });

  it("er korte setninger på norsk uten utropstegn", () => {
    for (const text of Object.values(favoriteMessages)) {
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("!");
    }
  });
});

describe("importfeil (Story 2.3): teksten fra EXPERIENCE.md", () => {
  it("no_recipe: «Fant ingen oppskrift på siden» med forklaring og vei videre", () => {
    expect(errorMessages.no_recipe.title).toBe("Fant ingen oppskrift på siden.");
    expect(errorMessages.no_recipe.body).toBe(
      "Lenken ser ut til å gå til en oversikt. Åpne selve oppskriften og lim inn den lenken, eller legg den inn selv.",
    );
  });

  it.each(["invalid_url", "fetch_failed", "no_recipe"] as const)(
    "%s har tittel som slutter på punktum og en forklaring som sier hva man kan gjøre",
    (kind) => {
      expect(errorMessages[kind].title).toMatch(/\.$/);
      expect(errorMessages[kind].body.length).toBeGreaterThan(20);
    },
  );
});
