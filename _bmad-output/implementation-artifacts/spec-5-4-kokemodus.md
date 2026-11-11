# Spec 5.4: kokemodus

## Intent
Versjon 2. Når brukeren står og lager maten (mobil på kjøkkenbenken), viser kokemodus ett steg om gangen i stor tekst, med ingrediensene i det valgte antallet tilgjengelige, og holder skjermen våken.

## Frosset
- Knappen «Kokemodus» står i oppskriftens overskrift (ved «Rediger»), bare når oppskriften har steg.
- Kokemodus er en fullskjerms modal `<dialog>` (`showModal()`): fokusfelle, Escape og `aria-modal` fra nettleseren. «Avslutt» og Escape lukker; fokus går tilbake til knappen.
- Visning: tittel, «Steg N av M» med fremdriftsstolpe, stegteksten i stor skrift, og «Forrige» / «Neste» (siste steg: «Ferdig», som lukker). Piltaster venstre/høyre bytter steg. «Forrige» er `aria-disabled` på første steg. Steget leses opp (`aria-live="polite"`).
- «Ingredienser» er en sammenleggbar liste (lukket fra start) med mengdene skalert til antallet som er valgt akkurat nå: sist valgt på siden (via `SelectedServings`), ellers lagret valgt antall, ellers opprinnelig. Listen viser antallet («for 4,5 porsjoner») når oppskriften har et gyldig opprinnelig antall.
- Steget starter på 1 hver gang kokemodus åpnes. Ingenting lagres.
- Skjermen holdes våken med Screen Wake Lock mens kokemodus er åpen; lås slippes ved lukking og tas på nytt når fanen blir synlig igjen. Støttes den ikke, eller feiler den, virker kokemodus uansett (ingen melding).
- Avkrysning på siden bak er uendret og urørt.

## Matrise
| Tilfelle | Utfall |
|---|---|
| Oppskrift uten steg | ingen «Kokemodus»-knapp |
| Åpne | steg 1 av M, fokus i dialogen, `showModal` kalt |
| Neste / Forrige / piltaster | bytter steg; grensene stopper |
| Siste steg | «Ferdig» lukker |
| Escape / Avslutt | lukker, fokus tilbake til knappen |
| Valgt antall 8 av opprinnelig 4 | ingrediensene vises doblet |
| Valgt antall endret på siden før åpning | nyeste antall brukes |
| Wake Lock mangler eller avvises | ingen feil |
| Lukk | lås slippes |

## Verifisering
lint, typecheck, format:check, build grønne; enhetstester grønne (10 nye for `CookingMode`); 14 e2e-tester grønne i skymiljøet (ny test: søk, halv porsjon og kokemodus på 360 og 1280 px). Ikke vurdert visuelt i nettleser; Wake Lock ikke prøvd på ekte enhet.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Startfokus settes eksplisitt på «Avslutt» etter `showModal()` (React `autoFocus` virker ikke i en lukket dialog).
- Kokemodus er skjult for oppskrifter uten steg.
- Utsatt: ingredienser per steg, tidtakere, avkrysning av ingredienser inne i kokemodus, stor tekst som innstilling, å huske hvilket steg man var på.
