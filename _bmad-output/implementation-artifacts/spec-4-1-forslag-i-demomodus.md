# Spec 4.1: Få forslag i demomodus

## Intent
Brukeren kan trykke «Få forslag» på en oppskrift og få 1–3 forslag med begrunnelse (FR-10). Uten språkmodellnøkkel er forslagene eksempelforslag fra `test/fixtures/suggestions/`, tydelig merket «Eksempelforslag» (FR-12, UX-DR7). Alle svar går gjennom én port, `SuggestionProvider`, og valideres med zod-skjemaet `Suggestion` før de vises (AD-5). Under henting vises plassholdere og «Lager forslag …», ved feil en norsk melding mens resten av siden virker. Å ta i bruk, hoppe over og lagre forslag hører til Story 4.2; språkmodell-adapteren til 4.3.

## Frosset
- Forslag lagres ikke og påvirker ikke oppskriften i denne storyen. De vises bare til siden lastes på nytt.
- `Suggestion` = `{ text, reason, appliesTo }`. `appliesTo` er hvilken del av oppskriften forslaget gjelder: `ingredients`, `steps` eller `recipe` (hele retten). Arkitekturen nevner feltet uten å definere det; verdiene her er valgt for denne storyen.
- Porten returnerer `Result<{ suggestions: unknown; isExample: boolean }, AppError>` og kaster aldri. Servicen validerer `suggestions` (1–3 elementer) og gir `suggestion_failed` ved ugyldig svar, feil fra porten eller kast.
- Valg av implementasjon ligger i `src/server/config.ts` som `suggestionMode` (`mock` uten `LLM_API_KEY`, ellers `llm`). Språkmodell-adapteren finnes først i Story 4.3. Til da brukes mock også når nøkkelen er satt, og forslagene er fortsatt merket «Eksempelforslag», slik at merket aldri sier noe uriktig.
- Mock velger sett fra `test/fixtures/suggestions/*.json` ut fra oppskriftens id (sortert filnavn, id modulo antall filer), så samme oppskrift gir samme forslag.
- Feilmeldingen er «Fikk ikke laget forslag akkurat nå. Prøv igjen senere.» (UX/AC); teksten i `messages.ts` oppdateres.
- Forslagsdelen står mellom ingrediensene og stegene på smal skjerm, og under begge kolonnene fra 768 px (UX: «Layout»).

## Atferd
- Før henting: overskriften «Forslag», en kort forklaring og knappen «Få forslag».
- Under henting: knappen blir stående (aria-disabled, så fokus ikke mistes) og dobbeltklikk gir ett kall; teksten «Lager forslag …» (`role="status"`) og tre plassholdere (skjult for skjermleser).
- Suksess: knappen forsvinner, fokus flyttes til forslagsgruppen, hvert forslag vises som kort (forslaget i halvfet, begrunnelsen i meta). Eksempelforslag har merket «Eksempelforslag» og forklaringen «Koble til en språkmodell for forslag til akkurat denne oppskriften.»
- Feil (svar med `ok: false` eller avvist kall): `ErrorMessage` med meldingen over, og knappen «Prøv igjen» med fokus bevart. Resten av siden virker.
- Server Action `requestSuggestions(id)`: validerer id på nytt, kaller servicen, revaliderer ikke, returnerer `{ ok: true, suggestions, isExample }` eller `{ ok: false }`.

## Matrise
| Tilfelle | Utfall | Test |
|---|---|---|
| Skjema: 1–3 elementer, tekst og begrunnelse påkrevd, kjent `appliesTo` | gyldig; ellers avvist, ekstra felt fjernes | `suggestion-provider.test.ts` |
| Mock uten nøkkel | 1–3 forslag, `isExample: true`, samme sett for samme id | `mock-suggestions.test.ts` |
| Alle fixture-filer | gyldige mot skjemaet | `mock-suggestions.test.ts` |
| Mangler/ugyldig fixture | `suggestion_failed`, ingen krasj | `mock-suggestions.test.ts` |
| Service: ukjent oppskrift | `not_found` | `suggestion-service.test.ts` |
| Service: ugyldig svar (0, 4 elementer, feil form, `isExample` ikke boolsk) | `suggestion_failed` | `suggestion-service.test.ts` |
| Service: port feiler eller kaster | `suggestion_failed` | `suggestion-service.test.ts` |
| Service: oppskriften sendes til porten | porten får hele oppskriften | `suggestion-service.test.ts` |
| `suggestionMode` | `mock` uten nøkkel, `llm` med | `config.test.ts` |
| Action: ok, ugyldig id, ukjent id, databasefeil | `ok` med forslag / `{ ok: false }`, ingen revalidering | `actions.test.ts` |
| Komponent: hvile, venting, suksess, eksempelmerke, feil og nytt forsøk, avvist kall, dobbeltklikk | som under Atferd | `SuggestionsSection.test.tsx` |
| Oppskriftssiden | forslagsdelen vises, bundet til oppskriftens id | `RecipeView.test.tsx` |
| Meldingen | ny tekst for `suggestion_failed` | `messages.test.ts` |

## Verifisering
lint, typecheck, format:check og build grønne (build uten Turbopack-advarsler); 77 filer og 2221 tester (57 nye); `package.json` og `package-lock.json` uendret. Ikke kjørt i nettleser i denne økten (skymiljøet har ingen); komponenten er testet med jsdom og Server Action mot ekte SQLite i minnet, og nettleserkontroll gjøres av Maja.

## Review Triage Log
Gjort med egen gjennomgang langs de tre linjene (spesifikasjon/data/arkitektur, sikkerhet, UI/tilgjengelighet/tester), ingen underagenter, for å spare økta. Funn:
- Test fant at forslagsgruppen manglet `role="group"` (ingen tilgjengelig navn for skjermleser) → rettet.
- Statusfeltet «Lager forslag …» ble satt inn først når henting startet, og slike felt blir ikke alltid opplest → feltet står nå alltid i dokumentet (tomt i hvile) → rettet.
- Mock-adapteren ga tre Turbopack-advarsler om dynamisk filsystemtilgang (hele prosjektet ville bli sporet) → `turbopackIgnore` i `readdir` og `join`; bygget er uten advarsler.
- Sikkerhet: Server Action validerer id på nytt, tar ingen annen input, leser bare fixture-filer fra fast sti og lagrer ingenting; tekst vises som tekst (ingen HTML). Lengdegrensene i skjemaet gjelder også svar fra en språkmodell senere.
- Utsatt: `llm`-modus bruker mock til Story 4.3 (merket «Eksempelforslag» er derfor riktig); kall til språkmodellen trenger grense mot gjentatte kall i 4.3; på smal skjerm står forslagene før stegene visuelt, men etter dem i dokumentet (UX-valg, samme som i EXPERIENCE.md); ingen uavhengige reviews og ingen nettleserkontroll for 4.1.
