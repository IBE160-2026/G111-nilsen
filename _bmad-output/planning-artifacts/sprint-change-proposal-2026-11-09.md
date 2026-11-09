# Endringsforslag 2026-11-09: finn igjen og rediger oppskrifter

| | |
|---|---|
| **Utløst av** | Manuell test av Story 1.4 i nettleseren (Maja), se `issues/005` |
| **Beslutning** | Godkjent av Maja 2026-11-09 |
| **Berører** | PRD (FR-13, ny FR-18), `epics.md` (Epic 2 og 3, rekkefølge), arkitektur-spinen (kravkart) |

## Hva skjedde
Etter Story 1.4 kunne en oppskrift legges inn, men:
1. Det fantes ingen måte å finne den igjen på. Samlingen kom først i Epic 3, og manuelt innlagte oppskrifter ble lagret som «ikke i samlingen» selv om knappen heter «Lagre oppskrift».
2. En «Tips»-seksjon i innlimt tekst havnet blant stegene, og oppskriften kunne ikke rettes. Redigering fantes ikke i PRD-en.

## Konsekvens hvis planen ikke endres
Brukeren mister oversikten over oppskriftene sine til Epic 3 er ferdig (etter importen), og enhver feil i en oppskrift krever ny innlegging. Det svekker både brukertesten (SM-5, «finne igjen») og inntrykket av appen.

## Endringer
| Område | Før | Etter |
|---|---|---|
| Rekkefølge | Epic 1 → 2 → 3 → 4 | Epic 1 → 3 → 2 → 4 (numrene beholdes) |
| Manuell innlegging | Lagres som «ikke i samlingen» | Lagres rett i samlingen; eksisterende manuelle oppskrifter flyttes inn ved migrering (Story 3.1) |
| Story 3.1/3.2 | 3.1 Lagre og slette, 3.2 Samlingen og duplikater | 3.1 Se samlingen, 3.2 Lagre og slette |
| Duplikatsjekk ved import | Story 3.2 | Story 2.2 (hører til importen) |
| Redigering | Ikke i PRD | Ny FR-18 og Story 3.5 «Rediger en oppskrift» |

## Vurdering
- Epic 3 avhenger bare av oppskrifter fra Epic 1, så rekkefølgen kan byttes uten at noen story får avhengighet framover. Unntaket var duplikatsjekken, som er flyttet til importen.
- Lagre-knappen for importerte oppskrifter (Story 3.2) bygges og testes på tjenestenivå i Epic 3 og blir synlig i bruk når importen kommer.
- Redigering gjenbruker skjema, validering og tolking fra Story 1.4, så tillegget er lite.
- Ingen endring i arkitekturbeslutningene (AD-1 til AD-11).

## Neste steg
Story 1.5 og 1.6 (fullføre Epic 1), deretter Epic 3 (3.1–3.5), Epic 2 og Epic 4.
