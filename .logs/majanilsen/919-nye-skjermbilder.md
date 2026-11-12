# 919 – Nye skjermbilder og en rettelse i de enkle forslagene

## Oppgave
Bytte ut skjermbildene i README, som viste appen slik den var i versjon 2. Maja pekte også på at «La røren hvile i 20–30 minutter» ikke er et tips, men noe som står i oppskriften.

## Resultat
- **Funnet:** hun hadde rett. Godt.no-oppskriften sier «La pannekakerøren svelle i 10-15 minutter», men regelen hoppet bare over rådet hvis steget inneholdt ordet «hvile». Nå teller også «svelle», «stå» og «trekke» som hvile (`restsAlready` i `suggest-for-recipe.ts`), og tre nye tilfeller er testet. Samme sjekk brukes av rådene for kjøttdeig og kylling.
- **Demo-database:** bygget på nytt fra lagrede testsider (`IMPORT_SOURCE=fixtures`) pluss tre egne retter, med mapper, favoritter, vurderinger, merkelapper, notater, ukemeny og «Har hjemme», så bildene viser realistisk innhold.
- **Seks nye skjermbilder** i `docs/`: oppskriftssiden (skalert 4 → 6 med et valgt forslag), Oppskrifter med søk og sortering, ukemeny, handleliste, «Hva kan jeg lage?» og kokemodus på mobil. Tatt ved 1280 px (og 390 px for mobil), skalert ned til 1,5× og komprimert: til sammen under 600 kB mot 630 kB for de to gamle.
- 150 filer, 3125 tester og 48 e2e grønne.

## Åpne punkter
- `docs/skjermbilde-versjon-2.png` er ikke i bruk lenger og bør slettes.
