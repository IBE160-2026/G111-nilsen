/**
 * Delelister i ingredienser (Story 6.32b): i tekstfeltet er en linje som slutter på «:»
 * («Fyll:») eller begynner med «#» («# Fyll») en overskrift for linjene under. Linjene før
 * første overskrift hører ikke til noen liste. Ren funksjon uten avhengigheter.
 */

/** Lengste overskrift; lengre linjer som ender på «:» regnes som vanlige ingredienser. */
export const MAX_SECTION_LENGTH = 60;

export type SectionedLine = { text: string; section: string | null };

/** Overskriften i linjen (uten «:» og «#»), eller `null` når linjen er en ingrediens. */
export function sectionHeading(line: string): string | null {
  const trimmed = line.trim();
  const name = trimmed.startsWith("#")
    ? trimmed.replace(/^#+\s*/, "").replace(/:\s*$/, "")
    : trimmed.endsWith(":")
      ? trimmed.slice(0, -1)
      : null;
  if (name === null) return null;
  const clean = name.trim();
  if (clean === "" || clean.length > MAX_SECTION_LENGTH) return null;
  return clean;
}

/** Deler ferdig trimmede, ikke-tomme linjer i ingredienser med liste, og dropper overskriftene. */
export function splitSections(lines: readonly string[]): SectionedLine[] {
  const result: SectionedLine[] = [];
  let section: string | null = null;
  for (const line of lines) {
    const heading = sectionHeading(line);
    if (heading !== null) {
      section = heading;
      continue;
    }
    result.push({ text: line, section });
  }
  return result;
}

/** Motsatt vei, for redigering: lagrede linjer i rekkefølge blir tekst med overskrifter. */
export function joinSections(lines: readonly SectionedLine[]): string[] {
  const out: string[] = [];
  let current: string | null = null;
  for (const line of lines) {
    const section = line.section?.trim() || null;
    if (section !== current) {
      if (section !== null) out.push(`${section}:`);
      current = section;
    }
    out.push(line.text);
  }
  return out;
}
