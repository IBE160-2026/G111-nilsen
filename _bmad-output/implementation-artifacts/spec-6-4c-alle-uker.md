# Spec 6.4c: alle uker med meny og handleliste

## Intent
Epic 6. Ida vil velge en uke (uke 38, uke 39 …) fra én side og finne menyen og handlelisten for uka, og kunne gå tilbake til tidligere uker.

## Frosset
- **Side:** `/ukemeny/uker` («Alle uker», krever innlogging; uten innlogging sendes hun tilbake hit). En lenke «Alle uker» ligger ved «Denne uka» på Ukemeny. Siden viser hver uke med planlagte retter (høyst 52, nyeste først): «Uke 46 · 9.–15. november 2026», antall retter («denne uka» på inneværende uke), titlene i dagsrekkefølge, en lenke til menyen (`/ukemeny?uke=`) og en «Handleliste»-lenke (`/handleliste?uke=`). Uten planlagte uker: «Du har ikke planlagt noen uker ennå.» med «Planlegg en uke».
- **Lagrede avkrysninger:** ny tabell `week_checks` (migrasjon `0011_week_checks`; bruker, uke (mandag) og varenøkkel, unik). Handlelisten med `?uke=` leser avkrysningene for uka og lagrer hver endring med en Server Action (`setWeekItemChecked`), så de består etter ny innlasting og på andre enheter. De gjelder bare den uka. Uten `?uke=` huskes ingenting, som før.
- **Regler:** hvilken som helst dag i uka velger uka; ugyldig dag, tom eller for lang nøkkel (over 200 tegn) gir `validation`. Feiler lagringen, rulles avkrysningen tilbake og Ida får beskjed.
- Handlelisten for en uke lages på nytt av ukas retter hver gang; bare avkrysningene lagres.

## Verifisering
lint, typecheck, format:check og build grønne; 112 filer og 2810 tester (tjeneste, action, side, handlelistekomponent, migrasjonstestene); 22 e2e grønne der Alle uker åpnes fra Ukemeny, handlelisten for uka åpnes, en vare krysses av og står igjen etter ny innlasting. Skjermbilder ved 360 px sett.

## Review Triage Log
Egen gjennomgang.
- Valgt: egen side «Alle uker» (Majas valg), ikke en liste nederst på Ukemeny; «Dine uker» fra Story 6.4b er flyttet hit.
- Valgt: bare avkrysningene lagres per uke; «Har hjemme» er felles for alle uker, siden det er det man har hjemme nå.
- Akseptert: endres menyen for en uke, kan en lagret avkrysning peke på en vare som ikke lenger står på listen. Den gjør ingen skade og vises igjen om varen kommer tilbake.
- Utsatt: å vise fremdrift («5 av 12 varer») per uke i oversikten, og å kopiere en uke til en ny.
