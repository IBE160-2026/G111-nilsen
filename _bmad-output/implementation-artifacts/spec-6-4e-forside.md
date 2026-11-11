# Spec 6.4e: forside

## Intent
Epic 6. Importer-siden var forsiden. Ida vil ha en egen forside.

## Frosset
- `/` er en forside (virker uten innlogging). Er ingen logget inn, står det øverst «Du er ikke logget inn» med forklaring og knappene «Logg inn» og «Lag konto» (sender tilbake til `/`); innlogget vises ingen melding. Siden: overskrift «RecipeMate», en kort forklaring og seks kort (`homeMessages.cards`): Hent en oppskrift (`/importer`, uthevet og full bredde på bred skjerm), Oppskrifter, Ukemeny, Handleliste, Mapper, Favoritter.
- Importskjemaet er flyttet til `/importer` (samme side og action). Menypunktet «Importer» peker dit og er markert der; logoen går til `/`, og ingen menypunkt er markert på forsiden.
- Lenker som tidligere pekte på `/` for import peker nå til `/importer` (tom samling: «Importer din første oppskrift»). 404 og feilsidene sier «Gå til forsiden» og lenker til `/`. Innlogging sender fortsatt til `/`.
- Ingen omdirigering fra gamle bokmerker til `/` som importside.

## Salgstekst og klikkflate (tillegg)
- Forsiden er en liten salgsside: overskrift «Fra oppskrift på nettet til middag på bordet», en kort ingress, en stor «Hent en oppskrift»-knapp (`/importer`) med «Du trenger ikke konto for å prøve.», meldingen om innlogging, «Slik virker det» i tre steg, «Mer enn en samling oppskrifter» (ukemeny og handleliste, mapper og favoritter, notater, utskrift) og snarveiene under «Gå rett til». Teksten beskriver bare det appen faktisk kan.
- Klikkflaten rundt «RecipeMate» i menyen er større (minst 44 px høy og luft til høyre), så det er lett å komme til forsiden.

## Verifisering
lint, typecheck, format:check og build grønne; 114 filer og 2825 tester (forside, Importer, meny, 404); 24 e2e grønne, inkludert en ny test for forsiden. Skjermbilder ved 360 og 1280 px sett.

## Review Triage Log
Egen gjennomgang.
- Valgt: snarveiene er statiske; bare innloggingssjekken slår opp (i Suspense, så overskriften står med en gang).
- Utsatt: å vise «Denne uka» og sist åpnede oppskrifter på forsiden (kan komme med designet i Epic 7).
