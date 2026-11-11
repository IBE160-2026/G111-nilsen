# Spec 6.11: angre sletting, «Nylig slettet» i 7 dager

## Intent
Epic 6 (FR-34). Ida vil kunne hente tilbake en oppskrift hun har slettet, i opptil 7 dager.

## Frosset
- **Sletting:** en lagret oppskrift med eier skrives først som et øyeblikksbilde (JSON) til `deleted_recipes` og slettes så som før, i én transaksjon. Ulagrede oppskrifter slettes rett. Resten av appen kjenner ikke til søppelet, så ingen eksisterende spørringer er endret.
- **Øyeblikksbildet:** innhold (ingredienser og steg med seksjoner), kilde, antall, tid, tidspunkter, favoritt, notater, «passer til», vurdering, laget-telling, mappe, merkelapper, tatt i bruk forslag, plasser i ukemenyen og i lagrede handlelister.
- **Gjenoppretting:** oppskriften settes inn igjen med ny id og alt over, og bildet slettes, i én transaksjon. En mappe eller handleliste som er slettet i mellomtiden hoppes over. Ukjent, en annens, utløpt eller ødelagt bilde (valideres med zod) gir «ikke funnet» og endrer ingenting.
- **Frist:** 7 dager (`TRASH_DAYS`). Utløpte oppskrifter skjules med en gang (listen, oppslaget og gjenopprettingen sjekker datoen) og slettes av den timevise ryddingen i `instrumentation.ts`, som nå også kjører `purgeDeletedRecipes`.
- **Visning:** etter sletting sendes brukeren til `/oppskrifter?slettet=<id>`, som viser «Oppskriften «X» er slettet.» med «Angre» og lenke til Nylig slettet (bare for eierens egen, ikke utløpte oppskrift). `/nylig-slettet` lister dem med dato, dager igjen, «Hent tilbake» og «Slett for godt» (bekreftelse). Lenke «Nylig slettet» ved overskriften i Oppskrifter. Slettedialogen sier nå at oppskriften kan hentes tilbake i 7 dager.
- **Etter gjenoppretting** sendes brukeren til oppskriften. Listen og den tomme tilstanden er samme komponent, og listen følger det serveren sender, så meldingen overlever og en skjult side ikke viser gamle oppskrifter.
- **Data:** tabellen `deleted_recipes` (migrasjon `0015_deleted_recipes`), slettes med brukeren.

## Verifisering
lint, typecheck, format:check og build grønne; 124 filer og 2974 tester (database, tjeneste, handlinger, komponenter, sider, rydding, migrasjon); 34 e2e grønne, med slett, angre, hent tilbake og slett for godt. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: «Nylig slettet»-listen viste en gammel liste da siden ble besøkt på nytt (skjult side beholdt tilstanden), og «Slett for godt» ga «ikke funnet». Listen følger nå det serveren sender.
- Funnet og rettet: meldingen etter «Slett for godt» forsvant når den siste ble slettet, fordi siden byttet komponent. Listen og tom-tilstanden er nå samme komponent.
- Valgt: øyeblikksbilde i egen tabell i stedet for en «slettet»-kolonne, så ingen eksisterende spørring kan vise en slettet oppskrift ved en feil.
- Valgt: gjenopprettet oppskrift får ny id; lenker til den gamle id-en virker ikke igjen.
- Akseptert: delte lenker eller åpne faner til den slettede oppskriften viser «ikke funnet» også etter gjenoppretting.
- Utsatt: å angre sletting av mapper, handlelister og ukemenyer.
