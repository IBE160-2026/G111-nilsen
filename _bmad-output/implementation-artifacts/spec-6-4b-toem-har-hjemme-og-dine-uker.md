# Spec 6.4b: tøm «Har hjemme» og «Dine uker»

## Intent
Epic 6. To ønsker etter bruk: «Har hjemme» ligger igjen mellom handleturene og må kunne tømmes, og ukemenyer skal være lette å finne igjen.

## Frosset
- **Tøm «Har hjemme»:** knappen «Tøm listen» i «Har hjemme»-kortet, bare når noe er lagt inn. Den åpner bekreftelsen «Tømme «Har hjemme»?» (startfokus på «Avbryt»). Ved «Tøm» fjernes alt for den innloggede (`clearPantry`, Server Action `clearPantryItems`), varene kommer tilbake på handlelisten, og statusen sier «Har hjemme er tømt.». Andre brukere påvirkes ikke. Feil vises under feltet og listen står uendret.
- **Ikke automatisk:** «Har hjemme» tømmes bare når Ida trykker, siden mange har salt og olje hjemme hele tiden.
- **Dine uker:** under ukemenyen en liste over alle uker med planlagte retter (`listPlannedWeeks`, høyst 52 uker, nyeste først): «Uke 46 · 9.–15. november 2026», antall retter, og lenke til `?uke=`. Under hver uke står rettene (titlene, uten gjentakelser, i dagsrekkefølge) og en lenke «Handleliste» som åpner handlelisten laget av ukas retter (`?uke=`). Uka som vises er markert (`aria-current`, «Vises nå»). Listen vises ikke uten planlagte uker. Hver uke var allerede lagret i databasen; nytt er oversikten.
- Ingen databaseendringer.

## Verifisering
lint, typecheck, format:check og build grønne; 111 filer og 2801 tester (tjeneste, action, komponent og side for begge deler); 22 e2e grønne, der «Tøm listen» og «Dine uker» er med. Skjermbilde av «Dine uker» ved 360 px sett.

## Review Triage Log
Egen gjennomgang.
- Valgt: manuell «Tøm listen» med bekreftelse, ikke automatisk tømming (Maja valgte «tøm etter handling»; et automatisk tidspunkt finnes ikke, siden appen ikke vet når man har handlet).
- Valgt: oversikt over uker som lenker (Majas valg), ikke datovelger eller kopiering av uke.
- Etter Majas ønske om å se tidligere uker og handlelister: «Dine uker» viser nå rettene per uke og en lenke til handlelisten for uka.
- Akseptert: handlelisten for en gammel uke lages på nytt av ukas retter; avkrysninger og «Har hjemme» lagres ikke per uke.
- Utsatt: å hoppe til en valgt uke med dato, og å kopiere en uke til en ny.
