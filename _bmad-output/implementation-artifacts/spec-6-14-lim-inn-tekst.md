# Spec 6.14: lim inn tekst som oppskrift

## Intent
Epic 6. Ida vil lagre en oppskrift ved å lime inn teksten i stedet for å skrive den om.

## Frosset
- **Tolking (ren domenefunksjon `parseRecipeText`):** tittel = første linje; porsjoner fra «4 porsjoner», «Til 4 personer», «Porsjoner: 4»; tid fra linje som starter med tid/total tid/tilberedningstid/koketid/steketid (minutter eller timer og minutter); ingredienser under «Ingredienser»/«Du trenger»; steg under «Fremgangsmåte»/«Slik gjør du»/«Steg»/«Trinn» m.fl. Kulepunkter, avkrysning og stegnummer fjernes. Linjer som slutter med «:» i ingredienslisten (deloverskrifter) droppes. Uten overskrifter: linje som er kulepunkt eller har mengde (`parseLine`) og er maks 80 tegn blir ingrediens, resten steg. Ingress mellom tittel og første overskrift droppes.
- **Ingen LLM og ingen nettverk:** teksten tolkes i nettleseren og sendes ingen steder.
- **Flyt:** `/lim-inn` (overskrift utenfor Suspense, innlogging kreves siden lagring krever det). «Lag utkast» fyller det vanlige `ManualRecipeForm` med utkastet (remountes med ny `key` ved nytt utkast); lagring med `saveManualRecipe`, samme zod-validering som «Legg inn selv». Ingenting lagres før «Lagre oppskrift». Lenke «Lim inn tekst» på Importer. All tekst i `pasteMessages`. Ingen migrasjon.

## Verifisering
lint, typecheck, format:check og build grønne; 133 filer og 3033 tester; 40 e2e grønne (kjørt tre ganger, med nytt løp for lim inn). Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: e2e feilet én gang fordi testen fylte feltet før siden var klar; ventetid på nettverk lagt til.
- Valgt: utkast i det eksisterende skjemaet fremfor ny lagringsvei, så all validering er felles.
- Utsatt: tolking med LLM for rotete tekst, kilde-lenke, deloverskrifter i ingredienslisten, å lime inn flere oppskrifter på en gang.
