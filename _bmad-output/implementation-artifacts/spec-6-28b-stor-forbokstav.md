# Spec 6.28b: stor forbokstav i ingredienser og steg

## Intent
Epic 6. Maja ba om at ingredienser får stor forbokstav, og at første bokstav i en setning også er stor.

## Frosset
- **Ved visning, ikke i databasen.** Det gjelder dermed også oppskrifter som allerede er lagret eller importert, og teksten brukeren skrev endres ikke (søk, handleliste og «Hva kan jeg lage?» regner på originalen).
- **Ren funksjon** `capitalizeFirst` (første bokstav stor; æ, ø og å virker; tall og tegn står urørt) og `capitalizeSentences` (første bokstav, og første bokstav etter `.`, `!` eller `?` og mellomrom).
- **Ingredienser:** navnet i ingredienslisten («2 dl Melk») og hele linjen når den ikke kan tolkes («Salt og pepper»). Mengde og enhet er uendret.
- **Steg:** hver setning i stegteksten, ikke i forslag som er flettet inn (de kommer fra oppskriften eller forslagene og vises som før).
- **Forkortelser:** etter «ca.», «f.eks.», «dvs.», «evt.», «osv.», «inkl.» og noen få til får ordet etter ikke stor bokstav, og tall med punktum («1.5 dl») berøres ikke.
- **Utenfor denne storyen:** kokemodus (bruker «2 dl melk» som løpende tekst), handlelisten og «Har hjemme»-listen.

## Verifisering
tsc, eslint og format rene; 155 filer og 3192 tester (nye for `capitalize`, og forventningene i `IngredientList` og `RecipeView` er oppdatert); 50 e2e grønne; build grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: visning framfor lagring, så ingenting i databasen endres og gamle oppskrifter følger med.
- Valgt: mengdelinjer får stor forbokstav på navnet («2 dl Melk»), siden mengde og navn står i hver sin kolonne i listen. Teksten i kokemodus og på handlelisten er løpende tekst og er ikke endret.
- Akseptert: «5 min. server» får stor S etter «min.» siden «min» ikke står i forkortelseslisten; i stegtekst er det oftest slutten på en setning.
- Akseptert: egennavn og merkevarer midt i en setning rettes ikke (kun setningsstart).
