import { describe, expect, it } from "vitest";
import {
  collectionMessages,
  deleteDialogMessages,
  deleteFolderDialogMessages,
  editRecipeMessages,
  errorMessages,
  fallbackMessage,
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
    expect(deleteFolderDialogMessages.descriptionAfterName).toContain("liggende i samlingen");
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
