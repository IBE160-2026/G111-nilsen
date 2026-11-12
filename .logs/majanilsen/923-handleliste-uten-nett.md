# 923 – Handlelisten uten nett

## Oppgave
Story 6.17: se og krysse av i handlelisten uten nett.

## Resultat
- Handlelisten lagrer et utdrag (varer og avkrysninger) i nettleseren mens den vises. «Du er frakoblet»-siden viser utdraget med avkrysning som huskes. Utdraget slettes ved utlogging (bare med nett). Service worker v2 oppdaterer frakoblet-siden. Ingen migrasjon.
- 144 filer, 3081 tester og 46 e2e grønne. Spec 6-17, epics og README.

## Åpne punkter
- Avkrysninger uten nett synkroniseres ikke tilbake til ukelisten.
- Maja må teste 6.16 og 6.17 på en ekte telefon (installere, flymodus, åpne handlelisten).
