# 011 – E-postfeltet var tomt når «Lag konto» ble sendt rett etter navigering

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-10, av Claude (ende-til-ende-test for innlogging, Story 6.4) |
| **Løst** | 2026-11-12 |
| **Område** | annet (innlogging) |
| **Alvorlighet** | lav |

## Hva skjedde
I to av fire kjøringer av e2e-testene svarte «Lag konto» «Skriv en gyldig e-postadresse», selv om testen hadde fylt inn e-posten. Siden viste et tomt e-postfelt. Samme melding som i sak 010, men id-ene er nå unike.

## Hvordan gjenskape
1. Hent en oppskrift uten konto og trykk «Logg inn for å lagre».
2. Trykk «Lag konto» og fyll inn e-post og passord med en gang (Playwright, uten å vente).
3. Send skjemaet. Skjer bare av og til.

## Årsak
Ikke bekreftet. Sannsynligvis ble feltet fylt ut før siden var ferdig lastet (skjemaet ligger i en Suspense-grense og strømmes inn), og feltet ble byttet ut etterpå. Feltet er ukontrollert (`defaultValue`), så teksten forsvinner da.

## Løsning / hva kan endres
Testen venter nå på overskriften «Lag en konto» og at nettverket er stille før den fyller ut; 2 × 20 e2e grønne etterpå. For brukere er risikoen liten (man rekker sjelden å skrive før siden er klar), men hvis det dukker opp: vis skjemaet uten Suspense (bare `neste` trenger søkeparametrene), eller ta vare på det som er skrevet.

## Oppfølging (2026-11-12)
Skjemaet stod inne i en `<Suspense>` fordi `?neste=` måtte leses fra adressen. Nå står selve skjemaet i den ferdige siden, og bare det skjulte «neste»-feltet og lenken til den andre siden strømmes inn (`AccountFormExtras`), med en reservelenke i fallback. Ventetrikset (`networkidle`) er fjernet fra e2e-testen, og testen gikk 20 av 20 ganger på begge skjermbredder (`--repeat-each=10`). Årsaken er fortsatt ikke bevist, men feltene byttes ikke lenger ut. Test: `account-pages.test.tsx` sjekker at skjemaet ikke ligger i en Suspense.

## Lærdom / prompt
«E2e: vent til siden er ferdig lastet før du fyller ut skjemaer som strømmes inn.»
