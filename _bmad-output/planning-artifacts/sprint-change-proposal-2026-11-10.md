# Endringsforslag 2026-11-10: versjon 2 (Epic 5)

| | |
|---|---|
| **Utløst av** | Bruk av den ferdige v1 (Epic 1–4) i nettleser og på mobil. Maja ønsket ny funksjonalitet, og to v1-forutsetninger holdt ikke i bruk: faste eksempelforslag passet ikke retten, og uten konto kunne ikke oppskriftene knyttes til en person. |
| **Beslutning** | Godkjent av Maja 2026-11-10 (dette dokumentet og oppdateringen av planen). Storiene ble bygget én og én med egen spec (`spec-5-1` til `spec-5-13`) og godkjent fortløpende; dette dokumentet samler endringene i planen. |
| **Berører** | PRD (§4.4, §4.5, ny §4.6 med FR-19–FR-27, NFR-1, NFR-7, §6, §7), addendum (forkastede alternativer), arkitektur-spinen (ny AD-12, kravkart, utsatte beslutninger), `epics.md` (ny Epic 5), UX (`EXPERIENCE.md`: toppmeny, nye skjermer) og README. |

## Hva skjedde
Epic 1–4 var ferdige og levert. Under bruk kom det ønsker som lå utenfor v1-omfanget i PRD §7.2, og to krav måtte endres:
1. **Nye funksjoner** fra «hvis tid»-listen og fra bruk: søk og filtrering, halve porsjoner og glidebryter, kokemodus, dl/gram, handleliste og «Har hjemme».
2. **Forslag (FR-11, FR-12):** de tre faste eksempelsettene passet ofte ikke retten («La retten hvile» til pannekaker), og et forslag som ble tatt i bruk, sto bare i forslagsdelen, ikke i oppskriften.
3. **Konto (PRD §6, NFR-7):** v1 forutsatte én lokal bruker uten innlogging. Maja ville kunne lagre oppskriftene på en konto.

## Konsekvens hvis planen ikke endres
PRD, epics og arkitektur beskriver en annen app enn den som kjører: krav som er bygget har ingen ID, tester og commits viser til storier som ikke står i planen, og PRD sier fortsatt «ingen personopplysninger» og «ingen konto». Det svekker sporbarheten fra krav til kode.

## Endringer
| Område | Før | Etter |
|---|---|---|
| Omfang | v1: FR-1–FR-18 | v2: også FR-19–FR-27 (PRD §4.6) |
| Epics | Epic 1–4 | Ny Epic 5 «Versjon 2» med Story 5.1–5.13 |
| FR-11 | Ingredienser og steg endres ikke | Lagrede ingredienser og steg endres fortsatt ikke, men forslaget vises merket i ingredienslisten og flettet inn i stegteksten (FR-26) |
| FR-12 | Forhåndslagrede eksempelforslag | Enkle forslag laget av regler ut fra ingredienser og steg; generelle eksempler bare når ingen regel passer (FR-25) |
| Konto | Ikke-mål i v1 | E-post og passord; hver konto har egne data; den første kontoen overtar eksisterende data (FR-27) |
| NFR-1 | Hele kjerneflyten uten nøkkel | Uendret: konto er gratis og lokal (ingen ekstern tjeneste); å hente og se oppskrifter krever ikke konto |
| NFR-7 | Ingen personopplysninger | Bare e-post og passordhash lagres, lokalt; passord aldri i klartekst |
| Arkitektur | AD-1–AD-11 | Ny AD-12 «Kontoer, økter og eierskap»; migrasjon `0005_pantry` og `0006_accounts` |
| Toppmeny | Fire punkter | Fem punkter (Handleliste) og «Logg inn»/«Logg ut» |

## Vurdering
- Alle nye funksjoner bygger på eksisterende lag: rene domenefunksjoner (`filter-collection`, `convert-units`, `step-ingredients`, `shopping-list`, `suggest-for-recipe`, `apply-suggestions`), tjenester og Server Actions. AD-1–AD-11 gjelder uendret.
- AD-2 (originalen er fasit) holder også for forslag: de vises i listene og stegteksten, men lagres ved siden av oppskriften og kan fjernes.
- Kontoer er den største endringen: eier på oppskrifter, mapper og «Har hjemme», tilgangssjekk i alle handlinger og sider, og testene bruker en testbruker. Den er samlet i AD-12, og `createTestDb()` har en testbruker så eksisterende tester gjelder fortsatt.
- Risiko: en oppskrift hentet uten innlogging kan åpnes og endres av alle med lenken til den lagres eller ryddes bort etter et døgn. Ingen «glemt passord» og ingen grense på innloggingsforsøk (utsatt).
- Innsats: 13 storier med spec, tester (2618 enhetstester, 18 e2e) og egen gjennomgang; ingen tilbakerulling av v1.

## Neste steg
- Oppdatere README med versjon 2 og nye skjermbilder.
- Retrospektiv for Epic 5.
- Utsatt (backlog): glemt passord (med e-postport og konsolladapter uten nøkkel), begrensning av innloggingsforsøk, slette konto, notater på oppskrift, amerikanske mål i visningen, mål i stegtekst, huske handlelisteutvalg.
