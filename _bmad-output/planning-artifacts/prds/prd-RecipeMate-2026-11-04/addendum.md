# Addendum til PRD: RecipeMate

Tekniske valg, begrunnelser og forkastede alternativer som hører til arkitektur og implementasjon, ikke til selve kravene i `prd.md`.

## Teknologistakk

| Del | Valg | Begrunnelse |
|---|---|---|
| App | Next.js med TypeScript | Én kodebase for grensesnitt og API, godt dokumentert, `.gitignore` er satt opp for det |
| Database | SQLite som lokal fil | Ingen databaseserver for sensor (NFR-1) |
| Henting og lesing av kilde | HTTP-henting på serveren og lesing av JSON-LD fra HTML | Oppskriftsdata (schema.org `Recipe`) er standarden de fleste oppskriftssider bruker |
| Tolking og skalering | Egen ren TypeScript-modul uten avhengighet til grensesnitt eller database | Lett å enhetsteste mot eksemplene i FR-8 |
| Forslag | Grensesnitt med to implementasjoner: mock (standard) og språkmodell via nøkkel i `.env` | FR-12 og NFR-1: appen virker uten nøkkel, og testene blir stabile |
| Tester | Vitest for enhet og integrasjon, Playwright for ende-til-ende | Dekker skalering, import fra testsider og kjerneflyten |

## Forkastede alternativer

- **Python med `recipe-scrapers`:** biblioteket støtter over 745 sider, men gir to kjøremiljøer (Python og Node) for sensor å installere. Lesing av JSON-LD er enkelt nok til å gjøre selv i TypeScript, og egen kode gir mer å teste og forklare.
- **Konto og innlogging:** gir mer arbeid og personopplysninger uten å støtte suksessmålene for v1.
- **Oppskrift i flere mapper:** gir en mange-til-mange-relasjon og mer komplisert grensesnitt. Favoritt dekker behovet for en ekstra gruppering.
- **Forslag som endrer ingredienslisten direkte:** gjør det uklart hva som er originalen og vanskeliggjør skalering. Forslag lagres i stedet ved siden av oppskriften.
- **Manuell innlegging som innlimt fritekst:** krever tolking av hele oppskriften (i praksis KI). Et enkelt skjema bruker samme tolking som importen.

## Forslag fra språkmodell

- Kallet sender tittel, ingredienslinjer og steg, og ber om 1–3 forslag som JSON med feltene `tekst`, `begrunnelse` og `gjelder` (ingrediens, steg eller rett).
- Svaret valideres mot et skjema før det vises (FR-10). Ugyldige svar avvises.
- Leverandør og modell avgjøres i arkitekturen. Et lite, billig modellnivå holder for oppgaven.
- Eksempelsvar lagres i testdata og brukes både av mock-implementasjonen og i tester.

## Testdata

- Kildeliste og hentskript: `test/fixtures/sources.md` og `scripts/fetch-fixtures.sh`.
- Observasjoner fra ekte sider (manglende porsjonsantall, ingredienslinjer uten navn eller enhet, oversiktssider) står i `research-og-avklaringer.md` §3 og er grunnlaget for FR-3, FR-6 og FR-2.
