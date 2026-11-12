# Spec 6.16: installerbar app (PWA)

## Intent
Epic 6. Ida vil legge RecipeMate på hjemskjermen og åpne den som en egen app.

## Frosset
- **Manifest:** `src/app/manifest.ts` (`/manifest.webmanifest`): navn og kortnavn «RecipeMate», `lang: nb`, `display: standalone`, `start_url: /oppskrifter`, `scope: /`, bakgrunn `#fbf7f0` og tema `#b8432f` (samsvarer med designtokenene, testet). Ikoner i `public/icons/`: 192 og 512 (`any`) og 512 maskerbart; `src/app/apple-icon.png` (180) for iOS. `themeColor` i viewport følger lys/mørk modus.
- **Service worker (`public/sw.js`, bevisst smal):** (1) `/_next/static/` hentes cache-først (filnavn med hash endres aldri); (2) en sidenavigasjon uten svar fra nettet får den ferdig lagrede siden `/frakoblet`; (3) ved installasjon lagres `/frakoblet` og filene den bruker; (4) ingenting annet lagres: ingen sider, API-svar eller brukerdata, så ingen andres data blir liggende på en delt telefon. Bare GET og samme opprinnelse. Gamle mellomlagre ryddes ved aktivering (`VERSION`).
- **Registrering:** `ServiceWorkerRegister` i rotlayouten, bare når `config.isProduction` (dev-filer har ikke hash). Feiler registreringen, virker appen som før.
- **Side `/frakoblet`:** statisk; «Prøv igjen» (`RetryButton`) laster adressen på nytt (siden vises på adressen brukeren ba om). All tekst i `pwaMessages`. Ingen migrasjon.
- **Utenfor denne storyen:** frakoblet handleliste (6.17), push-varsler, bakgrunnssynkronisering.

## Verifisering
lint, typecheck, format:check og build grønne; 142 filer og 3066 tester; 44 e2e grønne to ganger (manifest, ikoner, frakoblet side via Playwright med nettet av). Skjermbilder av frakoblet-siden ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: frakoblet-siden mistet stilen uten nett, fordi stilarkene den bruker ikke var lagret; installasjonen henter nå også filene siden peker på.
- Funnet og rettet: «Prøv igjen» som lenke i appen kunne bruke gammel tilstand; byttet til full omlasting.
- Akseptert: e2e tester bare «uten nett»-siden. Veien tilbake (omlasting med nett) er enhetstestet; Playwrights nettverksemulering ga ustabil gjenoppretting for service workers.
- Ikke sjekket her: selve «Legg til på hjemskjermen» på en ekte telefon (Maja tester).
- Utsatt: frakoblet handleliste (6.17), tilpasset installasjonsknapp.
