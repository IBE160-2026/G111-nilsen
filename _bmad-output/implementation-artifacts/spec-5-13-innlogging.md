# Spec 5.13: innlogging og egne oppskrifter per konto

## Intent
Versjon 2. Man skal kunne logge inn, slik at oppskriftene lagres på kontoen sin. Valgt av Maja: e-post og passord (ingen eksterne kontoer eller nøkler), man kan prøve appen uten konto men ikke lagre, og den første kontoen overtar det som allerede ligger i databasen. Endrer PRD-forutsetningen om én bruker uten innlogging.

## Frosset
- **Data** (migrasjon `0006_accounts`): `users` (e-post unik og normalisert, `password_hash`), `sessions` (SHA-256 av token, bruker, utløp), og `user_id` på `recipes`, `folders` og `pantry_items` (ON DELETE CASCADE). Mappenavn og «Har hjemme» er unike per bruker.
- **Passord og økter**: scrypt med eget salt (`scrypt$salt$hash`), sjekk i konstant tid, samme svar for ukjent e-post og feil passord. Passord 8–200 tegn, e-post `noe@noe.noe`. Økten er et tilfeldig token (32 byte) i cookien `recipemate_session` (httpOnly, SameSite=Lax, Secure over https, 30 dager); databasen har bare hashen. Utløpte økter ryddes ved innlogging. Ingen «glemt passord».
- **Første konto** overtar lagrede oppskrifter, mapper og «Har hjemme» uten eier, i samme transaksjon som kontoen lages. Ulagrede importer forblir uten eier.
- **Eierskap**: en lagret oppskrift har alltid eier. `canAccessRecipe(viewer, id)`: eieren, eller alle når oppskriften ikke har eier (import uten innlogging). En annens oppskrift gir `not_found` overalt (side, redigering, alle handlinger, forslag). Lister (Oppskrifter, Favoritter, Mapper, mappeside, Handleliste, «Har hjemme») viser bare brukerens egne. Import uten innlogging har ingen eier; innlogget import blir brukerens, og «finnes fra før» gjelder bare samme eier.
- **Uten innlogging**: Importer, oppskriftsside, skalering, kokemodus og forslag virker. «Lagre» blir lenken «Logg inn for å lagre» (tilbake til oppskriften etterpå). Oppskrifter, Mapper, Favoritter, Handleliste, mappesider og «Legg inn selv» viser «Logg inn for å se dette» med «Logg inn» og «Lag konto». Handlinger som krever konto gir feilen `login_required` («Du må logge inn.»).
- **Sider**: `/logg-inn` og `/ny-konto` med `?neste=/sti` (bare stier i appen; `//…`, `https://…` og linjeskift gir forsiden). Feil står under feltet (e-post beholdes, passord ikke) og fokus flyttes dit. «Logg inn»/«e-post + Logg ut» står ved logoen på mobil og sist i menyraden på desktop.
- **Arkitektur**: tjenester for lister og mapper tar `userId` som første parameter; enkeltoppskrifter sjekkes med `canAccessRecipe` i Server Actions og `getRecipeFor` på sidene. Cookie-lesing bare i `src/server/session.ts` (inne i Suspense eller Server Actions).

## Matrise
| Tilfelle | Utfall |
|---|---|
| Lag konto med «kort» | «Passordet må ha minst 8 tegn.» under passordet |
| Samme e-post igjen (andre store bokstaver) | «Det finnes allerede en konto …» |
| Feil passord / ukjent e-post | «Feil e-post eller passord.» |
| Uten innlogging: Lagre | lenke «Logg inn for å lagre» → tilbake til oppskriften |
| Uten innlogging: /oppskrifter, /handleliste, /ny | «Logg inn for å se dette» |
| Annen bruker åpner /oppskrift/ID | «Fant ikke oppskriften» |
| Annen brukers mappe | ikke funnet |
| Første konto | overtar lagrede oppskrifter, mapper og «Har hjemme» |
| Økt eldre enn 30 dager | ikke innlogget |
| `?neste=//evil.no` | forsiden |

## Verifisering
lint, typecheck, format:check og build grønne; 99 filer og 2618 tester; 18 e2e grønne i skymiljøet (ny test: hent uten konto → logg inn for å lagre → lag konto → lagre → annen nettleser finner den ikke → logg ut; alle andre tester logger inn med egen konto per skjermbredde). Skjermbilder sett ved 360 og 1280 px.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Fra «Logg inn» til «Lag konto» lå forrige side skjult i DOM-en (Activity) med samme `id="email"`, så e-posten havnet i feil felt. Løst med `useId()` ([issue 010](../../issues/010-skjult-side-med-like-id-er.md)).
- Kontolenken i toppmenyen leste klokka under forhåndsrendring («unstable value new Date()»); `currentUser` kaller nå `connection()` før økten sjekkes.
- Tilgangssjekkene i oppskriftshandlingene lå først utenfor `try`, så en databasefeil kastet i stedet for å gi reservemelding; flyttet inn.
- Testene: `createTestDb()` har nå en testbruker (`TEST_USER_ID`); alle tester av tjenester og sider bruker den, og nye tester dekker andres data, uten innlogging og første konto.
- Kjente grenser: en import uten eier kan endres og slettes av alle med lenken til den lagres eller ryddes bort (døgnet). Ingen begrensning på antall innloggingsforsøk, ingen «glemt passord», ingen sletting av konto. Skjemaet «Legg inn selv» har fortsatt faste id-er.
- Utsatt: glemt passord og bytte passord, begrensning av innloggingsforsøk, slette konto, dele oppskrifter mellom kontoer.
