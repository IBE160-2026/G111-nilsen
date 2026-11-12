# Spec 6.32b: delelister i ingredienser

## Intent
Epic 6. En oppskrift kan ha flere ingredienslister, for eksempel «Kanelboller» og «Fyll».

## Frosset
- Datamodellen hadde allerede `section` på ingredienslinjer, og visningen grupperer etter den; det som manglet var å kunne skrive den inn.
- I feltet «Ingredienser» (ny, redigér og «lim inn tekst») er en linje som slutter på «:» («Fyll:») eller begynner med «#» en overskrift for linjene under. Linjer før første overskrift hører til ingen liste.
- Ren domenefunksjon `splitSections` / `joinSections` / `sectionHeading`; overskrift maks 60 tegn, ellers er linjen en vanlig ingrediens («Fyll: smør» er altså en ingrediens).
- Overskrifter teller ikke som ingredienser (grensen på 100, og «minst én ingrediens»).
- Redigering skriver listene tilbake som «Navn:»-linjer.
- Hjelpeteksten under feltet forklarer det.

## Verifisering
tsc, eslint, format rene; 158 filer og 3223 tester; 54 e2e (ny: lag oppskrift med to lister og åpne den til redigering); build grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: enkel tekstsyntaks framfor egen «legg til liste»-knapp; passer skjemaet og «lim inn tekst».
- Akseptert: en ekte ingrediens som ender på kolon, tolkes som overskrift.
- Akseptert: steg har fortsatt ingen delelister.
