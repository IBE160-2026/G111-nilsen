# Spec 6.4: ukemeny

## Intent
Epic 6 (FR-31). Planlegg middagene: legg lagrede oppskrifter på dagene i en uke med antall personer, og lag én handleliste for hele uka.

## Frosset
- **Data** (migrasjon `0009_meal_plan`): tabellen `meal_plan_entries` (`user_id`, `recipe_id`, `day` «ÅÅÅÅ-MM-DD», `servings`, `created_at`), indeks på bruker og dag. Sletting av konto eller oppskrift sletter oppføringene (cascade).
- **Uker** (`src/domain/week.ts`, rent domene): mandag–søndag, ISO-ukenummer, «Uke 46 · 9.–15. november 2026», «mandag 9. november». All regning i UTC på datotekst; «i dag» og denne uka regnes i norsk tid (`Europe/Oslo`). Gyldige datoer er årene 1900–2999.
- **Side** `/ukemeny` (krever innlogging): `?uke=` med hvilken som helst dag velger uka, ugyldig verdi gir denne uka. «← Forrige uke», «Neste uke →», «Denne uka» når man har bladd bort. Én boks per dag med oppføringene (tittel som lenke, «N pers.», «Fjern») og et skjema med oppskrift og personer; tomt personfelt gir antallet oppskriften starter på (sist valgt, ellers originalen, ellers 4). Uten lagrede oppskrifter: tom-tilstand med lenke til Oppskrifter.
- **Handlinger:** `addMeal` og `removeMeal` validerer på nytt (zod og tjenesten): bare egne, lagrede oppskrifter; 0,5–50 personer i halve steg; gyldig dag. Feil under skjemaet (`role="alert"`), suksess i `aria-live`.
- **Handleliste for uka:** «Lag handleliste for uka» åpner `/handleliste?uke=<mandag>`. Ukas oppskrifter er valgt, antall personer for samme oppskrift flere dager legges sammen (maks 50), og en linje viser hvilken uke valget kom fra. Valget kan endres som før.
- **Navigasjon:** lenken «Ukemeny» står ved overskriften på Oppskrifter (ved «Lag handleliste»). Hovedmenyen har fortsatt fem punkter; plasseringen ses på igjen i designepicen (Epic 7).

## Verifisering
lint, typecheck, format:check og build grønne; 107 filer og 2751 tester (domene for uker, tjeneste, handlinger, `WeekPlan`, sidene `/ukemeny` og `/handleliste?uke=`, migrasjon); 20 e2e grønne i skyen to ganger på rad. Skjermbilder ved 360 og 1280 px sett, ingen vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Fikset: på 360 px stod forrige uke, uka og neste uke på hver sin linje; nå står uka øverst og forrige/neste på én rad.
- Fikset: e2e valgte oppskrift ut fra testdata som ikke alltid var lagret i den skjermbredden; testen bruker nå den første lagrede oppskriften i valget.
- Funnet: innloggingstesten feilet av og til fordi e-posten ble fylt ut før skjemaet var klart (sak 011). Testen venter nå; årsaken er ikke bekreftet.
- Akseptert: sju små skjemaer (ett per dag) gir en lang side på mobil, men hver dag kan fylles uten å velge dag først. Designepicen kan samle dem.
- Akseptert: samme oppskrift flere dager med til sammen over 50 personer kappes til 50 på handlelisten (handlelistens grense).
- Utsatt: dra og slipp mellom dager, kopiere en uke, ukemeny delt med andre (6.19).
