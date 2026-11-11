# Spec 6.10: lag egen variant av en oppskrift

## Intent
Epic 6 (FR-34). Ida vil kopiere en oppskrift og endre kopien uten å røre originalen.

## Frosset
- **Knapp:** «Lag egen variant» ved «Rediger» og «Skriv ut», bare for en lagret oppskrift, skjult på utskrift. Under arbeid står «Lager variant …», og nye trykk ignoreres.
- **Kopien:** ny lagret oppskrift hos samme eier, tittel «Kopi av <tittel>» avkortet til 200 tegn, `savedAt`/`createdAt`/`updatedAt` = nå. Samme ingredienser og steg (slik de er lagret, uten tatt i bruk forslag), kildenavn, antall, tid, mappe, notater, «passer til» og merkelapper. Kilde-adressen følger ikke med, så import av adressen fortsatt finner originalen. Vurdering, favoritt, laget-telling og valgt antall starter blanke.
- **Etterpå:** brukeren sendes til `/oppskrift/<ny id>/rediger`; alle sider revalideres. Ved feil blir brukeren på siden med en melding.
- **Eierskap:** bare eieren (`mayChange`); ukjent eller ulagret oppskrift gir «ikke funnet». Alt skrives i én transaksjon (`copyRecipe`), tjenesten `copyRecipeAsVariant` tar tittelprefikset som parameter (tekstene ligger i `variantMessages`).
- **Data:** ingen ny migrasjon.

## Verifisering
lint, typecheck, format:check og build grønne; 119 filer og 2919 tester (repository, tjeneste, handling, knapp, visning); 32 e2e grønne, med kopi, nytt navn, original uendret og begge i Oppskrifter. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Valgt: kopien starter uten kilde-adresse, så en ny import av samme adresse ikke gir en «allerede lagret»-melding om kopien.
- Valgt: sendt rett til redigering, siden en variant nesten alltid skal endres.
- Akseptert: tatt i bruk forslag følger ikke med; de er knyttet til originalen.
- Utsatt: å legge til hvilken oppskrift varianten kom fra.
