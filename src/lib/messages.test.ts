import { describe, expect, it } from "vitest";
import { errorMessages, fallbackMessage, manualRecipeFieldMessages, messageFor } from "./messages";
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
    ];
    for (const text of texts) expect(text).not.toContain("!");
  });
});
