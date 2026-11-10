---
title: RecipeMate – EXPERIENCE
status: draft
created: 2026-11-04
updated: 2026-11-10
sources:
  - ../../prds/prd-RecipeMate-2026-11-04/prd.md
  - DESIGN.md
---

## Foundation

- **Form-faktor:** responsiv webapp, mobil først (fra 360 px), også for nettbrett og desktop.
- **Visuell identitet:** se `DESIGN.md`. Ved konflikt mellom dette dokumentet, `DESIGN.md` og mockupene gjelder spine-dokumentene (`DESIGN.md` og `EXPERIENCE.md`).
- **UI-system:** ingen ferdig komponentpakke. Komponentene er beskrevet her og i `DESIGN.md`.
- **Mockuper:** [`mockups/key-screens.html`](mockups/key-screens.html) viser Oppskrift (lys og mørk), Importer med feilmelding og Samlingen med tom mappe. Designretningene som ble vurdert ligger i [`.working/directions-3.html`](.working/directions-3.html) (A ble valgt). Skjermene Manuell innlegging, Mapper og Favoritter bygges ut fra tabellene i dette dokumentet.

## Information Architecture

Toppmenyen har fire punkter i v1 og fem fra versjon 2 (Handleliste), pluss «Logg inn»/«Logg ut» ved logoen. Alle andre skjermer nås derfra. «Samlingen» heter «Oppskrifter» i menyen.

| Skjerm | Hva den gjør | Nås fra | Krav |
|---|---|---|---|
| **Importer** (startside) | Lenkefelt, «Hent oppskrift», lenke til manuell innlegging | Toppmeny, tom samling | FR-1, FR-2 |
| **Manuell innlegging** | Skjema: tittel, antall personer, ingredienser og steg (én per linje) | Importer, feilmelding | FR-4 |
| **Oppskrift** | Fast format, porsjonsvelger, avkrysning, forslag, lagre/mappe/favoritt/slett | Import, lister | FR-3, FR-5–FR-11, FR-13, FR-15, FR-17 |
| **Samlingen** | Alle lagrede oppskrifter, sist brukt først | Toppmeny | FR-16 |
| **Mapper** | Liste over mapper med antall oppskrifter; opprett, gi nytt navn, slett | Toppmeny | FR-14 |
| **Mappe** | Oppskriftene i én mappe | Mapper | FR-14, FR-16 |
| **Favoritter** | Alle favoritter | Toppmeny | FR-15, FR-16 |
| **Handleliste** (v2) | Velg oppskrifter og antall, sammenslått liste med avkrysning og «Kopier listen», «Har hjemme» | Toppmeny, Oppskrifter | FR-23, FR-24 |
| **Kokemodus** (v2) | Fullskjerm over oppskriften: ett steg om gangen, ingrediensene i steget | Oppskrift | FR-21 |
| **Logg inn / Lag konto** (v2) | E-post og passord; sender tilbake dit brukeren kom fra | Toppmeny, «Logg inn for å lagre», sider som krever konto | FR-27 |

**Dialoger:** «Hvor mange er oppskriften laget for?» (FR-3), «Lagre i mappe» (velg mappe, ny mappe eller ingen), «Slette oppskriften?» og «Slette mappen?».

## Voice and Tone

- Norsk bokmål, du-form, korte setninger, vennlig og saklig. Ingen utropstegn og ingen spøk i feilmeldinger.
- Feilmeldinger sier hva som skjedde og hva brukeren kan gjøre: «Fant ingen oppskrift på siden. Lenken ser ut til å gå til en oversikt. Åpne selve oppskriften og lim inn den lenken, eller legg den inn selv.»
- Knapper er verb: «Hent oppskrift», «Lagre», «Ta i bruk», «Hopp over», «Legg inn selv».
- Bekreftelser er korte: «Lagret i Hverdag.»
- Eksempelforslag i demomodus merkes «Eksempelforslag» med forklaringen «Koble til en språkmodell for forslag til akkurat denne oppskriften.»

## Component Patterns

| Komponent | Oppførsel |
|---|---|
| Toppmeny | Alltid synlig øverst. Aktiv side markert med understrek. Under 768 px ligger logoen på egen linje og de fire menypunktene på linjen under, fordelt over hele bredden (logo og fire punkter får ikke plass på én linje på 360 px). Hvert punkt er minst 44 px høyt. |
| Lenkefelt | Fokuseres automatisk på Importer. Enter starter import. Knappen er deaktivert mens import pågår. |
| Porsjonsvelger | −/+ endrer med 1 innenfor 1–50. Tallet kan skrives inn; ugyldig verdi gir melding under feltet og beholder forrige verdi. «Tilbakestill til 4» vises når valgt ≠ opprinnelig. Opprinnelig antall kan endres via «oppr. 4 · endre». |
| Ingredienslinje | Trykk på hele linjen krysser av og fjerner avkrysning. Skalering endrer ikke avkrysning. |
| Steg | Nummerert, trykk krysser av som for ingredienser. |
| Forslagskort | «Få forslag» henter 1–3 forslag. «Ta i bruk» flytter forslaget til «Dine valgte forslag» øverst i forslagsdelen; «Hopp over» skjuler det. Et valgt forslag kan fjernes. |
| Lagre-linje | Fast nederst på oppskriftssiden. Før lagring: «Lagre». Etter lagring: mappenavn (trykk for å bytte) og hjerte for favoritt. |
| Oppskriftskort i lister | Hele kortet åpner oppskriften. Hjertet kan trykkes direkte uten å åpne. |

## State Patterns

| Tilstand | Hvordan den vises |
|---|---|
| Import pågår | Knappen viser «Henter oppskriften …». Etter 10 sekunder: feilmeldingen om at siden ikke kunne hentes. |
| Import feilet | Feilmelding under lenkefeltet, lenken står igjen i feltet, og en knapp «Legg inn selv». Tre varianter: ugyldig lenke, siden kunne ikke hentes, ingen oppskrift funnet. |
| Porsjonsantall mangler | Dialog før oppskriften vises: «Hvor mange er oppskriften laget for?» med porsjonsvelger. |
| Duplikat | «Du har allerede lagret denne oppskriften» med lenke til den. |
| Henter forslag | Plassholdere i forslagsdelen og teksten «Lager forslag …». |
| Forslag feilet | «Fikk ikke laget forslag akkurat nå. Prøv igjen senere.» Resten av siden virker. |
| Demomodus | Merket «Eksempelforslag» over forslagene. |
| Tom samling | «Du har ingen lagrede oppskrifter ennå.» og knappen «Importer din første oppskrift». |
| Tom mappe / ingen favoritter | Kort forklaring og vei videre: «Legg oppskrifter i mappen fra oppskriftssiden.» / «Trykk på hjertet på en oppskrift for å gjøre den til favoritt.» |
| Lagret | Kort bekreftelse nederst i 3 sekunder, leses opp av skjermleser. |

## Interaction Primitives

- Trykk og klikk. Ingen sveip eller lange trykk, slik at alt også virker med mus og tastatur.
- Trykkflater minst 44 × 44 px.
- Endringer i porsjonsantall og avkrysning skjer umiddelbart uten innlasting.
- Sletting krever bekreftelse i dialog; ingen angreknapp i v1.

## Accessibility Floor

- All funksjonalitet kan nås med tastatur i logisk rekkefølge, med synlig fokusmarkering.
- Alle skjemafelt har synlige etiketter. Feilmeldinger knyttes til feltet (`aria-describedby`).
- Avkrysning er ekte avkrysningsbokser med etikett (ingrediensen eller steget).
- Porsjonsvelgeren har etikett, og endret antall annonseres for skjermlesere.
- Statusmeldinger (lagret, import feilet) leses opp (`aria-live`).
- Tekst kan forstørres til 200 % uten at innhold forsvinner.

## Responsive & Platform

- **< 768 px:** én kolonne. Rekkefølge på oppskrift: tittel, kilde, porsjonsvelger, ingredienser, forslag, steg.
- **≥ 768 px:** ingredienser og porsjonsvelger til venstre, steg til høyre, forslag under.
- Lys eller mørk modus følger systemet.

## Key Flows

**UJ-1. Ida lager taco til fem** (oppskrift skrevet for 4)
1. Ida åpner RecipeMate. Importer er startsiden og lenkefeltet har fokus.
2. Hun limer inn lenken og trykker «Hent oppskrift».
3. Oppskriften vises i fast format med «Antall personer 4».
4. Hun trykker + én gang. **Klimaks:** alle mengder oppdateres med en gang, «400 g kjøttdeig» blir «500 g», og løken får merket «ca.».
5. Hun trykker «Lagre», velger mappen «Hverdag» og trykker hjertet. Bekreftelsen «Lagret i Hverdag.» vises.
6. Under matlagingen krysser hun av ingrediensene etter hvert.
- *Kanttilfelle:* siden oppgir ikke porsjoner. Dialogen spør først hvor mange oppskriften er laget for.

**UJ-2. Tor prøver et forslag** (engelsk blogg, laget for 2)
1. Tor importerer, setter antall til 5 og ser «3 egg (ca.)».
2. Han trykker «Få forslag» og får tre forslag.
3. **Klimaks:** han trykker «Ta i bruk» på sitronforslaget. Det flyttes til «Dine valgte forslag».
4. Han lagrer i «Helg». Forslaget er der neste gang han åpner oppskriften.
- *Kanttilfelle:* lenken går til en oversiktsside. Feilmeldingen «Fant ingen oppskrift på siden» vises med knappen «Legg inn selv».

**UJ-3. Ida finner favoritten**
1. Ida trykker «Favoritter» i toppmenyen.
2. **Klimaks:** tacooppskriften ligger øverst. Hun åpner den, og den står på 5 personer som sist.
3. Hun endrer til 3 og lager maten.

## Versjon 2 (2026-11-10)

Mønstrene over gjelder også for det som kom i versjon 2. Det som er nytt:

- **Porsjonsvelger:** «+ ½» og en glidebryter fra 0,5 til 50 under feltet (FR-19).
- **Oppskrifter:** søkefelt, «Bare favoritter» og mappevalg over listen; treffantall leses opp; «Nullstill søk» ved ingen treff (FR-20).
- **«Vis mengder i»:** radiogruppe «Som i oppskriften / Volum (dl) / Vekt (gram)» over ingrediensene og i handlelisten; omregnede mengder merkes «ca.» (FR-22).
- **Forslag i oppskriften:** en ingredienslinje fra et forslag har merket «Forslag»; et stegforslag står uthevet inne i stegteksten og leses opp som «Forslag:» (FR-26). Uten nøkkel heter merket på forslagene «Enkle forslag» (FR-25).
- **Uten konto:** sider som krever konto viser «Logg inn for å se dette» med «Logg inn» og «Lag konto»; lagre-linjen viser «Logg inn for å lagre» (FR-27).

Fullstendig oppførsel per skjerm står i `spec-5-1` til `spec-5-13` under `_bmad-output/implementation-artifacts/`.
