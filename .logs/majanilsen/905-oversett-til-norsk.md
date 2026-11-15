# 905 – Oversette engelske oppskrifter til norsk

## Oppgave
Engelske oppskrifter skal beholdes på engelsk, men kunne vises på norsk hvis man ønsker det.

## Plan
Valgt sammen med Maja: gjelder oppskriftene (ikke appens menyer), og oversettelsen lagres.

## Resultat
- «Oversett til norsk» på oppskrifter som ser engelske ut; språkmodellen oversetter tittel, ingredienser, steg og delnavn. Lagret i ny tabell (migrasjon 0019); bryter mellom «Original» og «Norsk».
- Uten `LLM_API_KEY` vises en forklaring (ingen falsk oversettelse).
- 162 filer og 3275 tester, 58 e2e grønne.

## Åpne punkter
- Ikke prøvd mot den ekte språkmodellen; test med nøkkel i `.env`.
- Handleliste og ukemeny bruker originalens ingredienser.
- Engelsk-gjetningen er enkel; kan finjusteres.
