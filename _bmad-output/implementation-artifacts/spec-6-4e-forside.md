# Spec 6.4e: forside

## Intent
Epic 6. Importer-siden var forsiden. Ida vil ha en egen forside.

## Frosset
- `/` er en forside uten dataoppslag (virker uten innlogging): overskrift «RecipeMate», en kort forklaring og seks kort (`homeMessages.cards`): Hent en oppskrift (`/importer`, uthevet og full bredde på bred skjerm), Oppskrifter, Ukemeny, Handleliste, Mapper, Favoritter.
- Importskjemaet er flyttet til `/importer` (samme side og action). Menypunktet «Importer» peker dit og er markert der; logoen går til `/`, og ingen menypunkt er markert på forsiden.
- Lenker som tidligere pekte på `/` for import peker nå til `/importer` (tom samling: «Importer din første oppskrift»). 404 og feilsidene sier «Gå til forsiden» og lenker til `/`. Innlogging sender fortsatt til `/`.
- Ingen omdirigering fra gamle bokmerker til `/` som importside.

## Verifisering
lint, typecheck, format:check og build grønne; 114 filer og 2823 tester (forside, Importer, meny, 404); 24 e2e grønne, inkludert en ny test for forsiden. Skjermbilder ved 360 og 1280 px sett.

## Review Triage Log
Egen gjennomgang.
- Valgt: statiske snarveier uten dataoppslag, så siden er rask og lik for alle.
- Utsatt: å vise «Denne uka» og sist åpnede oppskrifter på forsiden (kan komme med designet i Epic 7).
