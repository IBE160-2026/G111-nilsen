# Spec 6.4f: søk og nullstilling i handlelisten

## Intent
Epic 6. Ida vil søke etter oppskrift i handlelisten, og at handlelisten tømmes når den ikke er lagret.

## Frosset
- **Søk:** feltet «Søk etter oppskrift» over «Velg oppskrifter» filtrerer på tittel, uten hensyn til store/små bokstaver og aksenter («creme» finner «Crème brûlée»). Valgte oppskrifter står alltid igjen, så ingenting valgt blir skjult, og «Du må kjøpe» påvirkes ikke av søket. Under feltet står antall treff, eller «Ingen lagrede oppskrifter passer «…».».
- **Nullstilling:** valgte oppskrifter, antall porsjoner, enhetsvalg, avkrysninger og søk nullstilles når siden forlates (siden holdes ellers igjen i bakgrunnen av Activity i `cacheComponents`, så valgene ble stående). Det som lagres beholdes: oppskrifter og porsjoner som kom fra en lagret uke (`?uke=`), lagrede avkrysninger for uka, og «Har hjemme».
- Gjort i `ShoppingList` med en opprydding i `useEffect` som setter tilstanden tilbake til startverdiene, og en `formKey` for de ukontrollerte antallfeltene.

## Verifisering
lint, typecheck, format:check og build grønne; 114 filer og 2832 tester (søk, nullstilling med `Activity`, uke- og avkrysningsunntak); 24 e2e grønne, med søk og at valgene er borte etter en tur til Ukemeny og tilbake.

## Review Triage Log
Egen gjennomgang.
- Valgt (Majas svar): nullstill når jeg forlater siden, ikke at handlelisten bare lages fra lagrede uker, og «Har hjemme» tømmes ikke automatisk.
- Akseptert: å laste siden på nytt nullstiller også (som før).
- Utsatt: søk i varene på selve listen.
