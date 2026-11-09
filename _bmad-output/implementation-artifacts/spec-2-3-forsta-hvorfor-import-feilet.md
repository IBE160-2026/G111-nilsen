# Spec 2.3: Forstå hvorfor en import feilet

## Intent
Tor skal få vite hvorfor en oppskrift ikke kunne hentes og hva han kan gjøre (FR-2, UX-DR8, UX-DR17, AD-7). Feilkomponenten (`ErrorMessage`, venstrekant i aksentfarge, `role="alert"`), «Legg inn selv», lenken som blir stående i feltet og tekstene i `messages.ts` ble bygget i Story 2.2. Denne storyen kontrollerer dem mot akseptansekriteriene og EXPERIENCE.md, og låser dem med tester.

## Matrise
| Tilfelle | Kilde | Melding | Test |
|---|---|---|---|
| Ikke http/https, ugyldig, tom, for lang | `validateUrl` | invalid_url, ingenting hentes | `actions.test.ts` («ugyldig», «tom», «over grensen»), `source-url.test.ts` |
| Svarer ikke, feilkode, over 10 s, blokkert adresse | `http-fetcher` | fetch_failed | `http-fetcher.test.ts`, `address-policy.test.ts`, `actions.test.ts` («lokal adresse») |
| Side uten oppskriftsdata, ikke HTML | extract | «Fant ingen oppskrift på siden.» + forklaring | `actions.test.ts`, `messages.test.ts` |
| Uventet feil | alt | reservemelding, logges | `actions.test.ts` |

Alle viser `ErrorMessage` med «Legg inn selv» (`/ny`), og lenken står igjen (`ImportForm.test.tsx`).

## Endring
- `no_recipe`-tittelen er «Fant ingen oppskrift på siden.» (var «Vi fant ingen …»), slik EXPERIENCE.md og akseptansekriteriet sier.
- Ny test som låser teksten fra EXPERIENCE.md og krav til alle importmeldinger.

## Verifisering
lint, typecheck, format:check, build grønne; 71 filer og 2122 tester; lock-filene uendret.

## Review Triage Log
Endringen er en tekstrettelse pluss tester; komponentene var allerede gjennomgått av tre uavhengige reviews i Story 2.2. Ingen ny gjennomgang.
