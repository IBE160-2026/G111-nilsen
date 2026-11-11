# Spec 6.4d: lagre uka, stor «Se alle uker» og egen side for hver uke

## Intent
Epic 6. Ida vil ha en tydelig «Lagre uka»-knapp i stedet for automatisk lagring, en større og tydeligere «Se alle uker»-knapp, og en side per uke med menyen i korte trekk og veien videre til handlelisten.

## Frosset
- **Utkast og lagring:** `WeekPlan` samler endringene i siden (utkast). «Lagre uka» sender hele uka til Server Action `saveWeekPlan({week, items})`, som i én transaksjon erstatter alle oppføringene i uka (`replaceWeek`). Er noe ugyldig eller ikke Idas lagrede oppskrift, endres ingenting. Høyst 100 oppføringer, dag innenfor uka, antall 0,5–50. Knappen er inaktiv (`aria-disabled`) uten endringer.
- **Status:** «Ikke lagret ennå. Trykk «Lagre uka».» ved endringer, «Uka er lagret.» etter lagring; `beforeunload` advarer ved ulagrede endringer. «Lag handleliste for uka» stoppes mens noe er ulagret («Lagre uka først …»).
- **Fjernet:** `addMeal`, `removeMeal`, `removeFromWeek`, `deleteEntry` (erstattet av `saveWeek`/`replaceWeek`).
- **Knapper:** «Se alle uker» er en stor outline-knapp (minst 3,5 rem) øverst på Ukemeny, rett under overskriften, så den ikke krever scrolling; den lille lenken er fjernet.
- **Ukeside:** `/ukemeny/uker/[uke]` ([uke] er mandagen; ugyldig dato eller ikke-mandag gir 404): dagene med rettene (lenke) og porsjoner, stor «Se handlelisten for uka» (`/handleliste?uke=`), «Endre uka», «← Alle uker». Tom uke: «Planlegg uka». Kortene på «Alle uker» lenker hit; «Handleliste»-lenken per kort er fjernet.

## Verifisering
lint, typecheck, format:check og build grønne; 113 filer og 2819 tester; 22 e2e grønne (legg til, «Lagre uka», Se alle uker, ukeside, handleliste, avkrysning). Skjermbilder ved 360 og 1280 px sett.

## Review Triage Log
Egen gjennomgang.
- Valgt: utkast i klienten og én lagring, ikke autolagring (Majas ønske); ingen ekstra «Angre».
- Valgt: lagringen erstatter hele uka, så to faner kan overskrive hverandre; sist lagret vinner.
- Akseptert: ny uke uten oppføringer kan lagres som tom, og fjerner da uka fra «Alle uker».
- Utsatt: å kopiere en uke til en ny.
