# Spec 6.4: ukemeny

## Intent
Epic 6 (FR-31). Planlegg middagene: legg lagrede oppskrifter på dagene i en uke med antall porsjoner, og lag én handleliste for hele uka.

## Frosset
- **Data** (migrasjon `0009_meal_plan`): tabellen `meal_plan_entries` (`user_id`, `recipe_id`, `day` «ÅÅÅÅ-MM-DD», `servings`, `created_at`), indeks på bruker og dag. Sletting av konto eller oppskrift sletter oppføringene (cascade).
- **Uker** (`src/domain/week.ts`, rent domene): mandag–søndag, ISO-ukenummer, «Uke 46 · 9.–15. november 2026», «mandag 9. november». All regning i UTC på datotekst; «i dag» og denne uka regnes i norsk tid (`Europe/Oslo`). Gyldige datoer er årene 1900–2999.
- **Side** `/ukemeny` (krever innlogging), eget punkt i toppmenyen foran Handleliste: `?uke=` med hvilken som helst dag velger uka, ugyldig verdi gir denne uka. «← Forrige uke», «Neste uke →», «Denne uka» når man har bladd bort. Én boks per dag med oppføringene (tittel som lenke, «N pers.», «Fjern») og et skjema med oppskrift og porsjoner. Oppskriften velges med et søkefelt («Søk etter oppskrift», ARIA combobox med listboks): skriv for å filtrere på tittel (alle ordene, æ/ø/å som egne bokstaver), velg med klikk eller pil og Enter (Enter sender ikke skjemaet), Escape lukker; skrevet helt likt én tittel regnes som valgt. Tomt personfelt gir antallet oppskriften starter på (sist valgt, ellers originalen, ellers 4). Uten lagrede oppskrifter: tom-tilstand med lenke til Oppskrifter.
- **Handlinger:** `addMeal` og `removeMeal` validerer på nytt (zod og tjenesten): bare egne, lagrede oppskrifter; 0,5–50 porsjoner i halve steg; gyldig dag. Feil under skjemaet (`role="alert"`), suksess i `aria-live`.
- **Handleliste for uka:** «Lag handleliste for uka» åpner `/handleliste?uke=<mandag>`. Ukas oppskrifter er valgt, antall porsjoner for samme oppskrift flere dager legges sammen (maks 50), og en linje viser hvilken uke valget kom fra. Valget kan endres som før.
- **Navigasjon:** «Ukemeny» er det sjette punktet i toppmenyen. Under 560 px står punktene i to rader med tre i hver; fra 560 px på én linje.

## Verifisering
lint, typecheck, format:check og build grønne; 108 filer og 2758 tester (domene for uker, tjeneste, handlinger, `WeekPlan` med søk, `matchRecipes`, toppmenyen, sidene `/ukemeny` og `/handleliste?uke=`, migrasjon); 20 e2e grønne i skyen. Skjermbilder ved 320, 360, 480, 559, 560, 767 og 1280 px sett (meny i to rader under 560 px, ingen vannrett rulling).

## Review Triage Log
Egen gjennomgang.
- Etter Majas test: nedtrekkslisten ble byttet med et søkefelt, og «Ukemeny» flyttet fra lenken ved Oppskrifter-overskriften til toppmenyen.
- Fikset: på 360 px stod forrige uke, uka og neste uke på hver sin linje; nå står uka øverst og forrige/neste på én rad.
- Fikset: e2e valgte oppskrift ut fra testdata som ikke alltid var lagret i den skjermbredden; testen bruker nå den første lagrede oppskriften i valget.
- Funnet: innloggingstesten feilet av og til fordi e-posten ble fylt ut før skjemaet var klart (sak 011). Testen venter nå; årsaken er ikke bekreftet.
- Akseptert: sju små skjemaer (ett per dag) gir en lang side på mobil, men hver dag kan fylles uten å velge dag først. Designepicen kan samle dem.
- Akseptert: samme oppskrift flere dager med til sammen over 50 porsjoner kappes til 50 på handlelisten (handlelistens grense).
- Utsatt: dra og slipp mellom dager, kopiere en uke, ukemeny delt med andre (6.19).
