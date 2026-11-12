# 915 – Statistikk over samlingen

## Oppgave
Story 6.20b: en side som viser hvilken rett som er laget mest, og andre tall om samlingen.

## Resultat
- Ny side `/statistikk`: nøkkeltall (oppskrifter, ganger laget, favoritter, planlagte middager), snittvurdering og snittid, og kort for «Laget oftest», «Sist laget», «Best vurdert», mapper, merkelapper, kilder og «Oftest i ukemenyen». Titlene lenker til oppskriften. Lenke fra Oppskrifter og fra «Og dessuten» på forsiden.
- Ren domenefunksjon `collectionStats`; ingen nye data og ingen migrasjon.
- Ryddet bort en halvferdig, ubrukt statistikkmodul som lå i arbeidskopien (ikke i git, ikke på maskinen): `src/domain/statistics.ts` med test, `statisticsMessages`, en dobbel lenke i Oppskrifter og en e2e-test for en side som ikke fantes. Filene er lagt til side, ikke slettet.
- 152 filer, 3154 tester og 50 e2e grønne. Sett ved 390 og 1280 px.

## Åpne punkter
- Ingen grafer eller valg av tidsrom.
- «Ganger laget» teller bare det som er krysset av med «Laget i dag».
