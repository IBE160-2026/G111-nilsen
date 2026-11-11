# 948 – Tidtakerknapper nederst i kokemodus

## Oppgave
«Test lyden» skulle stå ved siden av tidtakerknappene, og «Start tidtaker» nederst til høyre på samme linje som «Ingredienser for X personer».

## Resultat
- `CookingMode.tsx`: ny `bottomRow` med ingrediens-boksen og `timerControls` (startknapper + «Test lyden» + status).
- `CookingMode.module.css`: knappene ligger til høyre og brytes til ny linje når de ikke får plass (mobil). Sjekket ved 360 og 1280 px.

## Åpne punkter
- Ved to tider i samme steg havner knappene på en linje under ingrediensboksen, ikke ved siden av. Test på telefon gjenstår.
