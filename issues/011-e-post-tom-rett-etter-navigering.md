# 011 – E-postfeltet var tomt når «Lag konto» ble sendt rett etter navigering

| | |
|---|---|
| **Status** | Åpen (testen venter; årsaken er ikke bekreftet) |
| **Funnet** | 2026-11-10, av Claude (ende-til-ende-test for innlogging, Story 6.4) |
| **Løst** | – |
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

## Lærdom / prompt
«E2e: vent til siden er ferdig lastet før du fyller ut skjemaer som strømmes inn.»
