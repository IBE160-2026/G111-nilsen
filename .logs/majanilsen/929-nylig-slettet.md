# 929 – Angre sletting, «Nylig slettet»

## Oppgave
Story 6.11: kunne hente tilbake en slettet oppskrift i 7 dager («Nylig slettet»-alternativet).

## Resultat
- Sletting legger et øyeblikksbilde i `deleted_recipes`; «Angre» etter sletting, siden `/nylig-slettet` med «Hent tilbake» og «Slett for godt», og timevis rydding etter 7 dager. Ny migrasjon `0015_deleted_recipes`.
- Gjenopprettingen tar med innhold, mappe, merkelapper, notater, vurdering, favoritt, forslag og plass i ukemeny og handlelister.
- Fant og rettet to feil på veien: gammel liste på en skjult side, og melding som forsvant etter siste sletting.
- 124 filer, 2974 tester og 34 e2e grønne. Spec 6-11, epics og README.

## Åpne punkter
- Gjenopprettet oppskrift får ny id, så gamle lenker til den virker ikke.
- Sletting av mapper, handlelister og ukemenyer kan ikke angres.
