# Story 4.4: test kjerneflyten og ferdigstill README

## 2026-11-10 kl. 11:00 — majanilsen

### Oppgave
Story 4.4: Playwright-tester for UJ-1, UJ-2 og UJ-3 mot midlertidig database, lagrede sider og eksempelforslag; README som lar en sensor installere, kjøre og teste uten nøkkel (NFR-1, NFR-2, AD-11, SM-6); tastatur og kontrast ved 360 px og desktop, lys og mørk.

### Plan
- Spesifikasjon: [spec-4-4](../../_bmad-output/implementation-artifacts/spec-4-4-test-kjerneflyt-og-readme.md).
- `@playwright/test` (låst), `playwright.config.ts`, `e2e/kjerneflyt.spec.ts`, README med skjermbilde, e2e-avsnitt og ny mappestruktur. Egen gjennomgang i stedet for underagenter.
- Forrige økt: [story-4-3](977-2026-11-10-10-45-00-story-4-3-forslag-fra-sprakmodell.md). 4.2 og 4.3 ligger committet på Macen (`332e896`, `002452c`, `e969bd0`, `4a5865d`); pushes av Maja.

### Resultat
- 10 e2e-tester grønne (360 og 1280 px): UJ-1, UJ-2 med kanttilfelle, UJ-3 og tastatur i lys og mørk modus. Kjørt i skymiljøet med forhåndsinstallert Chromium.
- Testen fant [issue 009](../../issues/009-valgt-antall-glemmes-ved-lagring.md): antall valgt før «Lagre» huskes ikke (PRD UJ-1/UJ-3 forventer det). Ført, ikke rettet.
- Låsfila mistet `"gypfile": false` for better-sqlite3 ved `npm install`; satt tilbake (testen `lockfile.test.ts` fanget det). En ren kopi installerer, migrerer, bygger og starter.
- lint, typecheck, format grønne; 2303 enhetstester; bare tillegg i `package-lock.json` og én linje i `package.json`.

### Åpne punkter
- Maja på Macen: `npm install`, `npx playwright install chromium`, stopp `npm run dev`, kjør `npm run test:e2e` (forvent 10 grønne) og `npm test` (2303).
- Maja: kontroll av kontrast og 200 % zoom i nettleser (NFR-5); ikke automatisert.
- Beslutning: skal issue 009 rettes (la «Lagre» ta med valgt antall) eller PRD justeres?
- Fortsatt åpent fra tidligere: /samlingen → /oppskrifter, `npm audit`, CI, turbopack.root-advarsel, PRD/UX/arkitektur er `draft`, refleksjonsrapport, flaky ManualRecipeForm-test (deferred-work.md).
