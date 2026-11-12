# Spec 6.30b: angre på sletting av mappe

## Intent
Epic 6. Mappesletting var siste destruktive handling uten angre.

## Frosset
- Etter sletting vises «Mappen «X» er slettet …» med knappen «Angre» (aria-label «Angre slettingen av X»).
- Serveren gir tilbake mappenavn og id-ene til oppskriftene som lå i mappen; klienten holder dem til siden forlates. Ingen ny tabell.
- `undoDeleteFolder(navn, ids)` lager mappen på nytt (samme navnevalidering som ellers) og legger bare tilbake oppskrifter som fortsatt er lagrede, tilhører brukeren og er uten mappe (200 om gangen, maks 5000 id-er, zod-validert).
- Navnet kan være tatt i mellomtiden: da vises meldingen og man kan prøve igjen.
- Bekreftelsesdialogen sier nå «Du kan angre rett etterpå» i stedet for «Du kan ikke angre».

## Verifisering
Tester for repository (`restoreFolder`), service, action, `FolderManager`; e2e for slett → angre.

## Review Triage Log
Egen gjennomgang.
- Valgt: ingen lagring av slettede mapper; angre gjelder bare mens siden står åpen (samme som andre angre-knapper).
- Akseptert: oppskrifter som er flyttet til en annen mappe mens man ventet, blir liggende der.
