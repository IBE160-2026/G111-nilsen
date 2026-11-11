# 937 – Respons ved klikk i menyen

## Oppgave
Maja la merke til at et trykk på «RecipeMate» fra Importer-siden ikke reagerer med en gang.

## Resultat
- Målt i produksjonsbygget: logo og menypunkter åpner siden på ca. 90 ms, så det er ikke en feil i siden. Treg respons kommer trolig av at utviklingsserveren (`npm run dev`) kompilerer siden første gang den åpnes.
- Hver menylenke og logoen viser nå en pulserende strek (`useLinkStatus` i `TopNav`) fra klikket til siden er åpnet, så det alltid er tydelig at klikket er mottatt. Stripen er skjult for skjermlesere og står stille ved «reduser bevegelse».
- 114 filer, 2827 tester og 24 e2e grønne.

## Åpne punkter
- Hvis responsen er treg også med `npm run build` + `npm run start`, trenger jeg å vite hvilken side den gjelder.
