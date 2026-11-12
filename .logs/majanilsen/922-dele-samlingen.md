# 922 – Dele samlingen

## Oppgave
Story 6.19: dele oppskriftene med en annen konto.

## Resultat
- Ny tabell `shares` (migrasjon 0016) og tjeneste for invitasjon, godtatt deling og avslutning. Side `/delt` og `/delt/<eier>`. Delte oppskrifter kan leses og kopieres, ikke endres: `canViewRecipe` ved siden av `canAccessRecipe`. Lenke fra Oppskrifter.
- 150 filer, 3113 tester og 48 e2e grønne (to kontoer i hver sin nettleser). Spec 6-19, epics og README.

## Åpne punkter
- Ingen felles redigering, felles handleliste eller varsling.
- Invitasjon krever at mottakeren har konto fra før.
