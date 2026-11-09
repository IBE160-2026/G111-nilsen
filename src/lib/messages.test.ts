import { describe, expect, it } from "vitest";
import {
  collectionMessages,
  editRecipeMessages,
  errorMessages,
  fallbackMessage,
  manualRecipeFieldMessages,
  messageFor,
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
