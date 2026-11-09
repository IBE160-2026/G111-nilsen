# 006 – Kantfarge på kontroller var under kontrastkravet (WCAG 1.4.11)

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-09, gjennomgang av Story 1.6 (UI og tilgjengelighet) |
| **Løst** | 2026-11-09 (Story 1.6) |
| **Område** | design |
| **Alvorlighet** | middels |

## Hva skjedde
DESIGN.md oppga `border-strong` (`#CDBFAE`, mørk `#54493E`) som kantfarge for kontroller, og spesifikasjonen for Story 1.6 brukte den på den tomme avkrysningsboksen. Samme farge lå fra før på tallfeltet i porsjonsvelgeren og på skjemafeltene i «Legg inn selv». Kontrasten mot flaten er bare 1,8:1 (lys) og 1,8:1 (mørk). WCAG 2.1 AA (1.4.11, ikke-tekstlig kontrast) krever 3:1 for grensen rundt grensesnittelementer, og PRD-en krever AA.

DESIGN.md hevdet at «alle par av tekst og bakgrunn» oppfyller AA, men målingen gjaldt tekst, ikke kanter.

## Hvordan gjenskape
1. Regn ut kontrastforholdet mellom `#CDBFAE` og `#FFFFFF` (1,8:1), og mellom `#54493E` og `#26211C` (1,8:1).
2. Se på en tom avkrysningsboks eller tallfeltet i lys modus: kanten er knapt synlig.

## Årsak
En feil antakelse i designdokumentet, som ble overtatt uten kontroll i spesifikasjonen. Implementasjonen fulgte spesifikasjonen. Feilen ble funnet av den uavhengige gjennomgangen som regnet kontrast fra tokenverdiene.

## Løsning / hva kan endres
Nytt token `control-border` i DESIGN.md og `src/styles/tokens.css`: `#8A7A68` i lys palett (minst 3,9:1 mot både hvit og papirbakgrunn) og `#8A7D6E` i mørk (minst 4,0:1). Det brukes på avkrysningsboksen, tallfeltet i porsjonsvelgeren og skjemafeltene. `border-strong` beholdes for dempede skillelinjer og deaktiverte knapper. DESIGN.md har en linje som sier hva tokenet er for. `tokens.test.ts` sjekker at alle fargene i DESIGN.md finnes i `tokens.css`, så det nye tokenet er dekket av testen (20 farger).

## Lærdom / prompt
Kontrast må regnes ut for kanter og ikke-tekst også, ikke bare for tekst. Ved gjennomgang av UI: be eksplisitt om kontrastberegning fra tokenverdiene. Tokentesten fanger at DESIGN.md og `tokens.css` er like, men ikke at verdiene i DESIGN.md er gode nok.
