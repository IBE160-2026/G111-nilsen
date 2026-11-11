# Spec 6.7: merkelapper, også i søket

## Intent
Epic 6 (FR-34). Ida vil sette egne merkelapper på oppskriftene og finne dem igjen i søket.

## Frosset
- **Merkelapper:** på en lagret oppskrift, med «Legg til» eller Enter og «×» for å fjerne. Teksten trimmes og dobbelte mellomrom slås sammen; 1–30 tegn; høyst 10 per oppskrift. Samme merkelapp uavhengig av store og små bokstaver og aksenter (`normalizeSearch`) legges ikke til to ganger, og skrivemåten som kom først beholdes. Rekkefølgen er den de ble lagt til i.
- **Eierskap:** bare eieren kan endre (`mayChange`); ukjent eller ulagret oppskrift gir «ikke funnet».
- **Søk og filter:** merkelappene er med i søketeksten i Oppskrifter, kortet viser dem, og et valg «Merkelapp» (skjules når ingen oppskrift har noen) filtrerer. Hver merkelapp står én gang i valget.
- **Data:** tabellen `recipe_labels` (`label`, `labelKey`, unik på oppskrift og nøkkel; slettes med oppskriften), migrasjon `0013_recipe_labels`. Tjeneste `addRecipeLabel` / `removeRecipeLabel`, handlinger `addLabel` / `removeLabel` (valideres på nytt), alle tekster i `labelMessages`.

## Verifisering
lint, typecheck, format:check og build grønne; 117 filer og 2882 tester (repository, tjeneste, handlinger, komponenter, filter, migrasjon); 26 e2e grønne, med merkelapp på oppskriften, søk, filter og fjerning. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Valgt: en felles merkelappliste per oppskrift i stedet for faste kategorier, siden mapper allerede er faste.
- Valgt: grensen på 10 gir ikke feil for en merkelapp som finnes fra før.
- Akseptert: merkelapper kan ikke gis nytt navn, bare fjernes og legges til.
- Utsatt: forslag til merkelapper fra de som allerede er brukt, og å legge til merkelapper fra kortet.
