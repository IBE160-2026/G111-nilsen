# Spec 4.3: Forslag fra språkmodell

## Intent
Med `LLM_API_KEY` satt lager appen forslag for akkurat denne oppskriften i stedet for eksempelforslag (FR-10, AD-5, AD-9). Adapteren sender tittel, ingredienslinjer og steg til en billig språkmodell og ber om 1–3 forslag på norsk som JSON. Svaret valideres med samme zod-skjema som mock. Uten nøkkel er alt som før (FR-12). Testene bruker lagrede svar og ingen nettverk (AD-11).

## Frosset
- Modellvalg (logget i arkitekturens `.memlog.md`): Anthropic Messages API via `fetch` (ingen ny pakke), standardmodell `claude-haiku-5-5`, `LLM_MODEL` overstyrer. Valgt fordi det er billigst i familien, følger JSON-instruks og gir ett API å forklare i README. Kan byttes bak `SuggestionProvider` uten å røre resten.
- Adapteren (`src/server/adapters/llm-suggestions.ts`) leser aldri miljøet; nøkkel og modell kommer fra `config.ts` via `providerFor` (AD-9). `providerFor("llm")` uten nøkkel faller tilbake til mock.
- Svaret returneres som `unknown` med `isExample: false`; servicen kjører `suggestionsSchema` som for mock. Kodeblokk (```json) rundt svaret fjernes.
- Feil, HTTP-feil, tidsavbrudd (20 s), ikke-JSON og tomt svar gir `suggestion_failed` med kort detaljkode (`network`, `timeout`, `http_<status>`, `invalid_response`, `invalid_json`, `rate_limited`). Nøkkel og svartekst fra API-et havner aldri i feilen.
- Grense mot gjentatte kall: maks 10 per minutt per prosess (glidende vindu, i minnet). Én leverandør per prosess, så telleren gjelder på tvers av kall.
- Oppskriftsteksten settes inne i `<oppskrift>…</oppskrift>` og beskrives som data; prompten kuttes ved 8000 tegn. Svaret vises bare som tekst.
- Ikke i denne storyen: grense per oppskrift eller bruker, streaming, flere leverandører.

## Matrise
| Tilfelle | Utfall | Test |
|---|---|---|
| Prompt | tittel, ingredienslinjer, nummererte steg; kuttes | `llm-suggestions.test.ts` |
| Vellykket svar (lagret) | gyldige forslag, `isExample: false`, nøkkel i hode, riktig modell | `llm-suggestions.test.ts` |
| Svar i kodeblokk | tolkes | `llm-suggestions.test.ts` |
| HTTP-feil, ikke-JSON, tomt, uten tekst, ikke-JSON-tekst, nettverk, tidsavbrudd | `suggestion_failed` med detaljkode, uten nøkkel i feilen | `llm-suggestions.test.ts` |
| Ugyldig form i svaret | avvises av skjemaet | `llm-suggestions.test.ts` |
| Grense mot gjentatte kall | kall 11 gir `rate_limited`, nytt vindu slipper til | `llm-suggestions.test.ts` |
| `providerFor` | mock uten nøkkel eller i modus mock; språkmodell med nøkkel; samme objekt for samme innstillinger | `suggestion-service.test.ts` |
| `.env.example` og README | variablene beskrevet uten ekte verdier; nøkkel forklart | gjennomgang |

## Verifisering
lint, typecheck, format:check og build grønne; 79 filer og 2303 tester (17 nye); `package.json` og `package-lock.json` uendret. Ikke prøvd mot ekte API (ingen nøkkel eller nett i utviklingsmiljøet): svarformen følger dokumentert Messages API og er testet med lagrede svar i `test/fixtures/llm/`. Maja prøver 3–5 oppskrifter med egen nøkkel.

## Review Triage Log
Gjort med egen gjennomgang langs de tre linjene, ingen underagenter, for å spare økta. Funn:
- Data/arkitektur: porten er uendret; servicen validerer alt fra adapteren. Tidligere `llm → mock` er fjernet; uten nøkkel er det mock, så kjernen virker uten nøkkel. `isExample: false` gjør at «Eksempelforslag»-merket ikke vises på ekte svar.
- Sikkerhet: nøkkel sendes bare i `x-api-key` til fast adresse (ingen brukerstyrt URL, ingen SSRF); nøkkel og API-svar lekker ikke til feildetaljer eller UI (testet). Oppskriftstekst fra nettet er upålitelig input til modellen (prompt-injeksjon): den merkes som data, svaret valideres mot skjemaet med lengdegrenser og vises som ren tekst. Svaret kan likevel være dårlige råd; brukeren velger selv hva som tas i bruk.
- Kostnad: 10 kall per minutt per prosess og `max_tokens` 700. Ingen grense per bruker eller dag.
- Utsatt: ikke prøvd mot ekte API; grensen er i minnet og nullstilles ved omstart; ingen uavhengige reviews og ingen nettleserkontroll.
