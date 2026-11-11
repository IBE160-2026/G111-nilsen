# Spec 6.6b: «Passer til» ved notatene

## Intent
Epic 6. Ida vil notere hvor mange en oppskrift egentlig passer til etter egen erfaring, ved siden av notatene. Opprinnelig antall porsjoner («oppr. 4») styrer fortsatt skaleringen; «Passer til» er bare en tekst.

## Frosset
- **Data:** ny kolonne `recipes.fits_for` (tekst, valgfri; migrasjon `0010_fits_for`). `Recipe.fitsFor`.
- **Regler:** teksten trimmes og flere mellomrom blir ett; tom tekst fjerner den; maks 60 tegn (`validation`, felt `fitsFor`, egen melding). Bare for lagrede oppskrifter og bare eieren (som notatene).
- **Server:** `setRecipeFitsFor` (tjeneste), `updateFitsFor` (repo), Server Action `saveFitsFor` som `saveNotes` (sjekker eier, validerer med egen melding).
- **Skjerm:** et tekstfelt «Passer til» over notatfeltet i notatkortet, med hjelpetekst («Din egen vurdering, for eksempel «2 sultne» eller «4 barn». Endrer ikke mengdene.»). Samme knapp «Lagre notat» lagrer begge; bare det som er endret sendes, og en feil i det ene hindrer ikke det andre.
- Skrives ikke ut (notatkortet skjules i utskrift, 6.6).

## Verifisering
lint, typecheck, format:check og build grønne; 111 filer og 2791 tester (service, action, to komponenttester, migrasjonstestene oppdatert); 22 e2e grønne der «Passer til» lagres og står igjen etter ny innlasting. Skjermbilde ved 360 px sett.

## Review Triage Log
Egen gjennomgang.
- Valgt: egen vurdering som fritekst, ikke et tall som skalerer mengdene, siden Maja valgte «Passer til» som notat (alternativene var å flytte «oppr. antall» hit eller å skalere fra egen vurdering).
- Akseptert: feltet vises bare i notatkortet; det står ikke i oppskriftslisten eller i utskriften.
- Utsatt: å vise «Passer til» ved tittelen eller i søk.
