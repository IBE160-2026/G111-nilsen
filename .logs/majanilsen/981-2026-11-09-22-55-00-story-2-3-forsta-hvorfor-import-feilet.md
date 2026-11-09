# Story 2.3: forstå hvorfor en import feilet

## 2026-11-09 kl. 22:55 — majanilsen

### Oppgave
Story 2.3 (FR-2, UX-DR8, UX-DR17): brukeren skal forstå hvorfor en import feilet og hva hun kan gjøre.

### Plan
- Feilkomponenten, «Legg inn selv», lenken i feltet og tekstene ble bygget i [story-2-2](982-2026-11-09-22-40-00-story-2-2-importer-fra-lenke.md). Kontrollere dem mot akseptansekriteriene og EXPERIENCE.md, rette avvik og låse med tester.
- Spesifikasjon: [spec-2-3](../../_bmad-output/implementation-artifacts/spec-2-3-forsta-hvorfor-import-feilet.md). Liten tekstendring uten ny gjennomgang (komponentene er gjennomgått tre ganger i 2.2).

### Resultat
- Tittelen for side uten oppskrift er nå «Fant ingen oppskrift på siden.» (var «Vi fant ingen …») slik EXPERIENCE.md krever.
- Ny test låser teksten og at importmeldingene har punktum og en forklaring. De øvrige akseptansekriteriene var dekket av tester fra 2.2.
- 2122 tester i 71 filer, lint, typecheck, format og build grønne.

### Åpne punkter
- Se meldingene i nettleseren (ugyldig lenke, side uten oppskrift, side som ikke kan hentes) sammen med testen av Story 2.2.
