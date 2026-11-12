# Spec 6.26b: rettinger (sak 011 og basisvarer)

## Intent
Epic 6. Maja ba om å se etter feil som kan rettes, og pekte på sak 011 (tomt e-postfelt rett etter navigering).

## Frosset
- **Sak 011:** `AccountForm` har ikke lenger `next`; det som avhenger av `?neste=` (skjult felt og bytte-lenke) ligger i `AccountFormExtras` og sendes inn som `extras`. På `/logg-inn` og `/ny-konto` står skjemaet i den ferdige siden, og bare `extras` ligger i `<Suspense>`, med en reservelenke i fallback. Dermed kan feltene ikke byttes ut mens brukeren skriver. Ventetrikset (`networkidle`) er fjernet fra e2e-testen.
- **Basisvarer i «Hva kan jeg lage?»:** en ingrediens der alle ordene er vann, salt, pepper (og «og», «svart», «malt», «kokende», «kaldt», «lunkent») og som brukeren ikke har skrevet inn selv, teller verken som hjemme eller som mangler. Salt i en lengre ingrediens («saltet smør») og «pepperrot» regnes ikke som basisvare. Siden sier det under «Dette er den samme listen …».
- Sak 011 er satt til Løst i `issues/`.

## Verifisering
tsc, eslint og format rene; 154 filer og 3183 tester; innloggingstesten gikk 20 av 20 på begge skjermbredder uten venting; full e2e grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: flytte det som leses fra adressen ut av skjemaet, framfor å ta vare på det som er skrevet. Skjemaet er statisk, så feltene er der med en gang.
- Valgt: basisvarer er nøytrale (ikke «hjemme»), så en oppskrift ikke dukker opp i «Hva kan jeg lage?» bare fordi den har salt.
- Akseptert: årsaken til 011 er ikke bevist; rettingen fjerner den sannsynlige mekanismen, og 20/20 kjøringer taler for at den er borte.
- Akseptert: sammensatte ord («hvetemel» mot «mel») matches fortsatt ikke; det ville ført «kokosmelk» til «melk».
