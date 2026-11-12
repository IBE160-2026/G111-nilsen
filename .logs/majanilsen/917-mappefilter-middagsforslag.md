# 917 – Mappefilter på middagsforslag

## Oppgave
Story 6.13b: kunne velge hvilke mapper middagen trekkes fra.

## Resultat
- Ny rad med piller under tidsvalgene: «Alle mapper», én pille per mappe og «Uten mappe» når noen oppskrifter mangler mappe. Flere mapper kan velges samtidig, og «Alle mapper» nullstiller valget.
- Domenet: `DinnerCandidate.folderName` og `DinnerFilter.folders` (tom liste = alle mapper), pluss `dinnerFolders` som gir mappene sortert på norsk med «uten mappe» sist.
- Raden vises bare når det finnes mer enn ett valg.
- 150 filer, 3134 tester og 48 e2e grønne. e2e lager en egen mappe og klikker pillen, så det er sjekket at de skjulte avkrysningsboksene virker i en ekte nettleser. Sett ved 390 og 1280 px.

## Åpne punkter
- Valgene huskes ikke mellom besøk; siden starter alltid på «Alle mapper».
