# Spec 6.33b: valgfritt antall porsjoner og utbytte i tekst

## Intent
Epic 6. En kake har ikke porsjoner, og kanelboller gir «ca. 12 boller». Antall porsjoner skal kunne stå tomt, med en egen tekst for utbytte.

## Frosset
- «Antall porsjoner» er valgfritt i skjemaet (ny, redigér, lim inn tekst); tomt gir `originalServings = null`, som modellen allerede støttet (skalering og porsjonsvelger skjules).
- Nytt valgfritt felt «Utbytte» (maks 100 tegn), ny kolonne `recipes.yield_note` (migrasjon 0018). Vises i toppen av oppskriften som «Gir: …».
- Egne oppskrifter uten antall får ikke dialogen «Hvor mange er oppskriften laget for?» av seg selv (kun importerte, som før); knappen «Oppgi antall porsjoner» finnes fortsatt.
- Utbytte følger med i kopi som variant, papirkurv (gamle øyeblikksbilder uten feltet leses fortsatt), og eksport/import av sikkerhetskopi (gamle filer uten feltet leses fortsatt).

## Verifisering
tsc, eslint, format rene; 158 filer og 3229 tester; 56 e2e; build grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: eget tekstfelt framfor å gjenbruke notatfeltet, så utbyttet vises sammen med tiden.
- Valgt: dialogen spør bare for importerte oppskrifter.
- Akseptert: handlelisten og ukemenyen regner uten porsjonsantall som før (uskalert).
- Akseptert: kopiert variant og deling viser utbyttet bare i oppskriftsvisningen.
