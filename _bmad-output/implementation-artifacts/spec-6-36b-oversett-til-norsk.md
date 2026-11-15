# Spec 6.36b: oversette engelske oppskrifter til norsk

## Intent
Epic 6. En oppskrift som er engelsk, beholdes på engelsk, men kan vises på norsk. Valget er brukerens, og oversettelsen lagres.

## Frosset
- Sprakmodellen gjør oversettelsen (samme nøkkel og modell som forslagene, `LLM_API_KEY`). Det finnes bevisst ingen mock: en falsk oversettelse ville vært villedende. Uten nøkkel viser knappen «Oversettelse er ikke slått på».
- Port `TranslationProvider` + adapter `llm-translation` (frist 40 s, maks 10 kall per minutt per prosess, nøkkel og svartekst aldri i feildetaljen). Svaret valideres med `translationSchema`, og antall ingredienser og steg må være det samme som i originalen, ellers `translation_failed`.
- Ny tabell `recipe_translations` (migrasjon 0019), én rad per oppskrift: tittel, ingredienslinjer, steg, delnavn og `active`. Originalen endres aldri, og redigering viser fortsatt originalen.
- Oppskriftssiden: «Oversett til norsk» vises når oppskriften ser engelsk ut (`looksEnglish`, en enkel ordtelling) og ikke er skrivebeskyttet. Finnes en oversettelse som passer, byttes det mellom «Original» og «Norsk» (lagret valg). Passer den ikke lenger (oppskriften er endret), vises originalen.
- Norsk visning bytter tittel, ingredienser (tolkes på nytt, så mengder skaleres) og steg; id, posisjon og deler beholdes.

## Verifisering
tsc, eslint, format rene; 162 filer og 3275 tester; 58 e2e (uten nøkkel: forklaringen vises); build grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: lagre oversettelsen (ikke oversette hver gang), så bytte er gratis og virker uten nøkkel etterpå.
- Akseptert: `looksEnglish` er en enkel gjetning; en oppskrift som ikke får knappen kan ikke oversettes.
- Akseptert: handlelisten og ukemenyen bruker fortsatt originalens linjer.
- Akseptert: ikke prøvd mot den ekte språkmodellen (ingen nøkkel i testmiljøet); adapteren er testet mot et falskt API.
