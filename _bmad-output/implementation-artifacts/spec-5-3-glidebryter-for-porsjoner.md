# Spec 5.3: glidebryter for porsjoner

## Intent
Versjon 2. Brukeren kan dra en glidebryter fra 0,5 til 50 personer, i halve steg, for å endre antall porsjoner raskt (bygger på Story 5.1).

## Frosset
- Glidebryteren (`<input type="range">`, min 0,5, maks 50, steg 0,5) ligger i porsjonsvelgeren på oppskriftssiden (`allowHalf`), under feltet. Etikett «Skyv for å velge antall personer»; `aria-valuetext` «6,5 personer». Piltaster flytter ett halvt steg.
- Valgt antall kan nå være **0,5–50** (hele og halve). `LIMITS.selectedServingsMin = 0.5` brukes av `isSelectedServings`, så komponenten, Server Actions og tjenesten har samme regel. Antallet oppskriften er skrevet for er fortsatt minst 1 og et heltall.
- Feltet, −/+ og «+ ½» virker som før; −/+ stopper på 0,5 og 50. «+ ½» ved 0,5 gir 1.
- Hver endring på glidebryteren går gjennom samme `change` som knappene: skalerer, melder valgt antall (utkast og lagre) og husker det for lagrede oppskrifter. Server Actions kjøres i rekkefølge, så siste verdi vinner.
- Ingen databaseendring.

## Matrise
| Tilfelle | Utfall |
|---|---|
| Dra til 2,5 | felt «2,5», mengder skalert, `onServingsChange(2.5)` |
| Dra til 0,5 | felt «0,5», mengder halvert fra «oppr. 1» |
| Lagret 6,5 | glidebryter på 6,5 |
| − ved 1,5 | 0,5; − ved 0,5 deaktivert |
| Skriv «0,5» | godtas; «0,4» og «0» avvises |
| `rememberServings(0.5)` | lagres; 0,4 og 50,5 gir `validation` |

## Verifisering
lint, typecheck, format:check, build grønne; 81 filer og 2368 enhetstester; 12 e2e-tester grønne i skymiljøet (Chromium). Ikke kjørt på Macen eller i Safari/Firefox.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Tabulatorrekkefølgen har ett stopp til (glidebryteren); tastaturtesten oppdatert.
- Utsatt: lagre bare når glidebryteren slippes (nå ett kall per steg under dra), tellemerker på glidebryteren.
