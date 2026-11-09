# Story 2.2: importer en oppskrift fra lenke

## 2026-11-09 kl. 22:40 — majanilsen

### Oppgave
Bygge Story 2.2 (FR-1, FR-13): lime inn en lenke, hente siden trygt, lese oppskriften (Story 2.1) og vise den som «ikke i samlingen», med forståelige feilmeldinger. Neste story i rekkefølgen 1 → 3 → 2 → 4.

### Plan
- Spesifikasjon: [spec-2-2](../../_bmad-output/implementation-artifacts/spec-2-2-importer-fra-lenke.md).
- Implementasjon av underagent, egen verifisering, tre uavhengige gjennomganger (spesifikasjon/data/arkitektur, sikkerhet i henting og URL, UI/tilgjengelighet/testkvalitet i Chromium), triage i spesifikasjonen og retting.
- Relaterte endringer samlet: `unknown`-feil i `messages.ts`, `config.importSource` med `.env.example` og README, kildelenke på oppskriftssiden.
- Forrige økt: [story-2-1](983-2026-11-09-21-35-00-story-2-1-les-oppskriftsdata.md).

### Resultat
Commit `6b555ed`.
- **Importflyt:** `validateUrl` → `normalizeSourceUrl` (fjerner fragment og sporingsparametere) → duplikatsjekk (lagret = `duplicate` med «Åpne oppskriften», ulagret gjenbrukes) → henting → JSON-LD → normalisering → `parseLine` → lagring med `savedAt = null`, deretter videre til oppskriften.
- **Sikker henting (AD-8):** kun http/https, avviser interne/loopback/link-local-adresser (kontrollert på hvert omdirigeringshopp og på adressen som faktisk kobles til), 10 s tidsavbrudd, maks 2 MB, maks 5 omdirigeringer.
- **To adaptere:** HTTP og fixture (`IMPORT_SOURCE=fixtures`, leser `test/fixtures/sources.md`), så appen kan demonstreres uten nett.
- **UI:** `ImportForm` på forsiden (fokus i feltet, lenken blir stående ved feil, `aria-invalid`, `role=alert`, én henting ved dobbeltklikk, virker uten JavaScript) og `ErrorMessage`. Kilden på oppskriftssiden er en lenke som åpner i ny fane.
- **Gjennomgang:** ingen høye funn. Rettet: gjenbrukt ulagret import fikk ikke fornyet `createdAt` (kunne ryddes bort av døgnrenholdet), `revalidatePath` i samme `try` som importen, trimming av vilkårlig lange tekster, avsluttende punktum i vertsnavn, lav kontrast på deaktivert knapp (2,6:1), to testhull funnet ved mutasjon. Sikkerhetsgjennomgangen fant ingen vei forbi adressevernet.
- **Verifisering:** lint, typecheck, format:check og build grønne; 2118 tester i 71 filer; `package.json` og `package-lock.json` identiske med før. Ingen test bruker internett.
- **Ikke prøvd mot ekte nettsider:** miljøet hadde ikke utgående nett, så HTTP-adapteren er bare testet mot lokale tjenere.

### Åpne punkter
- Test import i nettleseren på Macen: først `IMPORT_SOURCE=fixtures npm run dev` (lim inn en lenke fra `test/fixtures/sources.md`), deretter vanlig `npm run dev` med en ekte lenke (Matprat, Godt.no). Sjekk feilmeldingene (ugyldig lenke, side uten oppskrift, duplikat), 360 og 1280 px, lys og mørk, 200 % zoom.
- Kjør `npm test` på Macen og bekreft 2118 grønne.
- Utsatt (deferred-work.md): portbegrensning, prosentkoding i normalisering, redirect-aliaser som egne rader, indeks på `source_url`, DNS-tidsavbrudd, samtidighetsgrense, porsjonsdialog (Story 2.4).
