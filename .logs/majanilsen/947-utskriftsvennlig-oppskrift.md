# 947 – Story 6.6: utskriftsvennlig oppskrift

## Oppgave
Oppskriften skal kunne skrives ut som en ren side.

## Plan
«Skriv ut»-knapp ved tittelen og utskriftsstil som skjuler meny, knapper, forslag og notater. Epic, spec, test, e2e og PDF-sjekk.

## Resultat
- Ny `PrintButton`, `printMessages`, `@media print` i `globals.css` og `RecipeView.module.css`, `data-print="hide"` på det som ikke skal på papir.
- 111 testfiler og 2787 tester, 22 e2e, lint, tsc, format og build grønne. PDF fra Chromium viser én A4-side.
- Spec: `spec-6-6-utskriftsvennlig-oppskrift.md`.

## Åpne punkter
- Prøv utskrift (eller «Lagre som PDF») på Mac og telefon.
