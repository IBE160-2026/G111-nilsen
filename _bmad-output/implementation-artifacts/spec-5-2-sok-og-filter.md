# Spec 5.2: søk og filtrering i Oppskrifter

## Intent
Versjon 2. Når samlingen vokser, finner brukeren raskt en oppskrift ved å søke på tittel eller ingrediens og snevre inn med mappe og favoritter. Står først på PRD-ens «hvis tid»-liste.

## Frosset
- Filtreringen skjer i nettleseren på listen siden allerede har lest (ingen ny spørring per tegn, ingen nettverk, virker uten JavaScript-sti til serveren). Tilstanden holdes i komponenten, ikke i adressen.
- Ren funksjon `filterCollection` i domenelaget. Søkeord deles på mellomrom; **alle** ord må finnes (delstreng, uten hensyn til store/små bokstaver) i oppskriftens søketekst: tittel, kilde, mappenavn og ingrediensnavn. Æ, ø og å skilles fra a og o.
- `listCollection` gir `CollectionEntry` = `RecipeSummary` + `searchText` (ferdig normalisert i tjenesten). Ingrediensnavn leses med én ekstra spørring, ikke én per oppskrift.
- Kontroller over listen, bare når samlingen har oppskrifter: søkefelt («Søk i oppskrifter»), avkrysning «Bare favoritter», og mappevalg («Alle mapper» + mappene som finnes). Treffantall leses opp i et statusfelt («3 av 12 oppskrifter»).
- Ingen treff: «Ingen oppskrifter passer.» og knappen «Nullstill søk». Tom samling viser som før tom-tilstanden, uten kontroller.
- Rekkefølgen er som før (sist lagret først). Kortene er uendret.

## Matrise
| Tilfelle | Utfall |
|---|---|
| Tomt søk, ingen filtre | alle oppskrifter |
| «pannekake» | oppskrifter med ordet i tittel eller ingrediens |
| «pannekake melk» | bare de som har begge ord |
| «MELK», « melk  » | samme som «melk» |
| «bla» mot «blåbær» | ingen treff (bokstavene skilles fra a) |
| Bare favoritter | kun favoritter; kombineres med søk og mappe |
| Mappevalg | kun oppskrifter i den mappen |
| Ingen treff | melding og «Nullstill søk» som tømmer alt |
| Treffantall | status oppdateres for skjermleser |
| Tom samling | tom-tilstand, ingen kontroller |

## Verifisering
lint, typecheck, format:check og build grønne; 81 filer og 2361 tester (20 nye: 9 for `filterCollection`, 7 for `CollectionBrowser`, 2 for søketekst i tjenesten og eksisterende tester uendret). Ikke kjørt i nettleser; ikke lagt til i e2e.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- `listCollection` returnerer nå `CollectionEntry` (summary + `searchText`); eksisterende sidetester og tjenestetester passerte uendret.
- Søketeksten sendes til nettleseren sammen med hvert kort (litt mer data per oppskrift); akseptabelt for en samling på noen hundre oppskrifter.
- Utsatt: filter i adressen (delbare lenker, tilbakeknapp), sortering (alfabetisk, nyeste), søk i steg og notater, søk på Favoritter- og Mapper-sidene, e2e-test av søk.
