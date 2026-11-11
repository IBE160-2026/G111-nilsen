# Spec 6.6: utskriftsvennlig oppskrift

## Intent
Epic 6 (FR-33). Ida kan skrive ut en oppskrift som en ren side til kjøkkenet.

## Frosset
- **Knapp:** «Skriv ut» (`PrintButton`, tekstknapp lik «Rediger») ved tittelen kaller `window.print()`. Tilgjengelig navn: «Skriv ut <tittel>».
- **Utskriftsstil:** ren CSS med `@media print`, ingen egen utskriftsside. Det som ikke hører hjemme på papir får `data-print="hide"` (toppmeny, «Rediger», «Skriv ut», «Hent tid», notater, forslag, lagre-linjen, «Endre» ved opprinnelig antall); i tillegg skjules alle knapper i `main`, glidebryteren, enhetsvelgeren (`fieldset`) og dialoger.
- **Utseende på papir:** hvit bakgrunn, svart tekst, 12 pt, ingen sidemarg i siden (marg settes av utskriftsdialogen). Én kolonne: ingredienser først, så stegene. Antall personer står som tekst uten ramme. Avkrysningsboksene beholdes, så de kan brukes med penn. Rader og overskrifter brytes ikke midt i.
- **Kilde:** lenken skrives som vanlig tekst med adressen bak, siden en lenke ikke kan trykkes på papir.
- **Forslag som er tatt i bruk** står i ingredienser og steg som ellers; selve forslagsdelen skrives ikke ut.
- Ingen databaseendringer, ingen nye avhengigheter.

## Verifisering
lint, typecheck, format:check og build grønne; 111 filer og 2787 tester (ny test for knappen og at forslag, «Rediger» og «Skriv ut» er merket for skjuling); 22 e2e grønne, der oppskriftssiden i utskriftsmodus (`emulateMedia`) mangler meny og knapper og har tittel og «Slik gjør du». PDF laget fra siden med Chromium er sett: én A4-side for Pannekaker.

## Review Triage Log
Egen gjennomgang.
- Fikset: første PDF viste enhetsvelgeren («Vis mengder i») og «oppr. 4 ·» med hengende punktum; velger og «Endre» er skjult.
- Akseptert: kortene har fortsatt en tynn ramme på papir. Den er ufarlig og gjør at ingredienser og steg skilles.
- Akseptert: nettleserens egne topp- og bunntekster (dato, adresse) styres i utskriftsdialogen, ikke av siden.
- Utsatt: egen «kortversjon» med bare ingredienser, og utskrift av ukemeny eller handleliste.
