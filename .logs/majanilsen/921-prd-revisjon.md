# 921 – Revisjon av PRD etter tilbakemelding

## Oppgave
Faglærer la 2026-11-12 inn formativ tilbakemelding på PRD-en (`tilbakemelding-prd.md`), med tre punkter som måtte avklares nå. Rette PRD-en etter den.

## Resultat
- **Scope (høy):** ny §4.0 med oversikt over FR-1–FR-43 og status Bygget/Kandidat/Ikke nå. §4.7 delt i tre. FR-32 splittet (tidtaker bygget, stemmestyring FR-40 ikke nå), FR-38 splittet (deling bygget, offentlig lenke FR-41 og delt handleliste FR-42 kandidater). §6 og §7.2 rettet, og en motsigelse i §2.2 jeg fant selv.
- **Testbarhet (høy):** konsekvenser lagt til for FR-19–FR-26 og alle bygde krav i Epic 6. Kjøkkenverdiene for dl↔gram står nå i FR-22 i stedet for «m.fl.».
- **Motsigelser (medium):** FR-7 skrevet om til 0,5–50 i steg på 0,5; FR-19 viser til den. Fem nye rader i FR-8-tabellen, verifisert ved å kjøre dem gjennom appen, og lagt inn som tester (`scale-line.test.ts`). FR-22-konsekvensene er også blitt tester (`convert-units.test.ts`).
- **Språkmodell (medium):** nytt NFR-8 med tidsavbrudd, kallgrense, promptgrense, svarstørrelse og modellvalg; nytt NFR-9 om hva som lagres i nettleseren. §9 punkt 1 og 2 lukket.
- **Udelelig ingrediens (medium):** den faktiske regelen (enhet, ikke navn) står nå i §3.
- Glossaret utvidet, frontmatter `draft` → `active`, SM-8–SM-10 lagt til.
- Nytt dokument `svar-paa-tilbakemelding-prd.md` med hva som er endret og svar på de to refleksjonsspørsmålene.
- 150 filer og 3124 tester grønne.

## Åpne punkter
- Ved rate-limit mot språkmodellen gir appen en feilmelding i stedet for å falle tilbake til de regelbaserte forslagene (FR-25). PRD-en er rettet til det appen gjør; selve forbedringen er ikke bygget.
- §9 punkt 3 (opphavsrett) må fortsatt spørres faglærer om.
- Brukerreiser for versjon 2 og Epic 6 er ikke skrevet.
