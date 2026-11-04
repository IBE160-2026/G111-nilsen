---
title: RecipeMate – DESIGN
name: RecipeMate
description: Matlagingsassistent for oppskrifter fra nettet. Varm og rolig som en kokebok på kjøkkenbenken.
status: draft
created: 2026-11-04
updated: 2026-11-04
sources:
  - ../../prds/prd-RecipeMate-2026-11-04/prd.md
  - .working/directions-3.html (retning A)
colors:
  surface-base: '#FBF7F0'
  surface-raised: '#FFFFFF'
  surface-tint: '#FFF4EC'
  ink-primary: '#2B2118'
  ink-secondary: '#6E5E4E'
  accent: '#B8432F'
  on-accent: '#FFFFFF'
  border-hairline: '#E9DFD1'
  border-strong: '#CDBFAE'
  surface-base-dark: '#1C1814'
  surface-raised-dark: '#26211C'
  surface-tint-dark: '#33251F'
  ink-primary-dark: '#F2EBE1'
  ink-secondary-dark: '#BCAE9C'
  accent-dark: '#E58A6E'
  on-accent-dark: '#1C1814'
  border-hairline-dark: '#3A332B'
  border-strong-dark: '#54493E'
typography:
  display:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.15
  heading:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.5
  quantity:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: 17px
    fontWeight: 600
    note: 'tabular-nums, slik at mengder står rett under hverandre'
  label:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: 12px
    fontWeight: 600
    letterSpacing: 0.06em
    note: 'store bokstaver, brukes for ingrediensseksjoner'
  meta:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: 14px
    fontWeight: 400
rounded:
  sm: 10px
  md: 14px
  full: 999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.on-accent}'
    rounded: '{rounded.sm}'
    padding: 12px 16px
  button-secondary:
    backgroundColor: transparent
    textColor: '{colors.ink-primary}'
    border: '1px solid {colors.border-hairline}'
    rounded: '{rounded.sm}'
  card:
    backgroundColor: '{colors.surface-raised}'
    border: '1px solid {colors.border-hairline}'
    rounded: '{rounded.md}'
    padding: '{spacing.4}'
  stepper-button:
    size: 44px
    border: '1.5px solid {colors.accent}'
    textColor: '{colors.accent}'
    rounded: '{rounded.full}'
---

## Brand & Style

RecipeMate skal føles som en godt brukt kokebok på kjøkkenbenken, ikke som en nettside med reklame. Oppskriften er hovedpersonen. Uttrykket er varmt og rolig: papirfarget bakgrunn, serif-titler, god luft mellom linjene og bare én sterk farge.

Appen brukes ofte med mel på fingrene og telefonen et stykke unna. Derfor er tekst og mengder større enn vanlig, trykkflatene romslige og alt ligger i én kolonne på mobil.

## Colors

- **Papir (`#FBF7F0`)** er bakgrunnen i lys modus. Varm, så den ikke føles klinisk.
- **Hvitt (`#FFFFFF`)** brukes på kort (ingredienser, steg, forslag) for å skille innhold fra bakgrunn.
- **Blekk (`#2B2118`)** er brødtekst og titler. **Dempet (`#6E5E4E`)** brukes for kilde, metadata og seksjonsetiketter.
- **Tomat (`#B8432F`)** er den eneste aksentfargen: primærknapper, porsjonsvelger, lenker, «ca.»-merket og venstrekant på feilmeldinger.
- **Rosa tint (`#FFF4EC`)** markerer forslagskort.
- **Mørk modus** følger systemet og bruker samme roller: `#1C1814` bakgrunn, `#26211C` kort, `#F2EBE1` tekst, `#BCAE9C` dempet og `#E58A6E` aksent.

Alle par av tekst og bakgrunn oppfyller WCAG 2.1 AA (målt: brødtekst 14,8:1, dempet tekst 5,8:1, aksent på hvitt 5,4:1, mørk aksent 6,9:1).

Unngå: flere aksentfarger, grønt/rødt for tilstander, gradienter og bilder fra kildesidene.

## Typography

- **Display** (Georgia, 28 px) for oppskriftstittelen. **Heading** (Georgia, 20 px) for kortoverskrifter som «Ingredienser» og «Slik gjør du».
- **Body** (systemfont, 17 px, linjehøyde 1,5) for ingredienser, steg og skjema. Større enn standard fordi teksten leses på avstand.
- **Quantity** (systemfont, 17 px, halvfet, tabulære tall) for mengder, slik at tallene står i en egen kolonne.
- **Label** (12 px, store bokstaver) for ingrediensseksjoner. **Meta** (14 px) for kilde og hjelpetekst.
- Brøker vises med brøktegn (½ ¼ ¾ ⅓ ⅔).

## Layout & Spacing

Skala 4 / 8 / 12 / 16 / 24 / 32 px. Sidemarg 16–18 px på mobil. Én kolonne opp til 768 px. Fra 768 px vises ingredienser og steg side om side på oppskriftssiden. Innholdet er maks 1040 px bredt.

## Elevation & Depth

Ingen skygger for hierarki. Kort skilles fra bakgrunnen med farge og en tynn kant (`border-hairline`). Eneste unntak er lagre-linjen nederst på oppskriftssiden, som har en kant øverst når innholdet ruller under den.

## Shapes

`rounded/sm` (10 px) for knapper og felt, `rounded/md` (14 px) for kort og meldinger, `rounded/full` for knappene i porsjonsvelgeren.

## Components

- **Toppmeny** — Logo «RecipeMate» til venstre og lenkene Importer, Samlingen, Mapper og Favoritter. Aktiv side har understrek i aksentfargen.
- **Porsjonsvelger** — Kort med teksten «Antall personer», runde −/+-knapper (44 px) i aksentfarge og tallet i Georgia 24 px.
- **Ingredienslinje** — Mengde i `quantity` til venstre, navn til høyre, tynn skillelinje. «ca.» i aksentfarge, 12 px. Utolkbare linjer i kursiv dempet tekst.
- **Avkrysset linje** — Tekst i `ink-secondary` med gjennomstreking og en fylt avkrysningsboks i aksentfarge.
- **Forslagskort** — `surface-tint`-bakgrunn, forslaget i halvfet, begrunnelse i `meta`, knappene «Ta i bruk» (primær) og «Hopp over» (sekundær). Valgt forslag får merket «Tatt i bruk».
- **Feilmelding** — Kort med 4 px venstrekant i aksentfarge, tittel i halvfet og én forklarende setning.
- **Oppskriftskort i lister** — Tittel i Georgia 18 px, kilde i `meta`, hjerte for favoritt.

## Do's and Don'ts

| Gjør | Ikke gjør |
|---|---|
| Én aksentfarge, brukt på handlinger og viktige markører | Fargekode mapper, tilstander eller kategorier |
| Store mengder og trykkflater på minst 44 px | Komprimere for å få mer på skjermen |
| Vise kilden med lenke på hver importert oppskrift | Vise bilder eller reklame fra kildesiden |
| Feilmeldinger med kant og forklarende tekst | Røde helfylte feilbokser |
