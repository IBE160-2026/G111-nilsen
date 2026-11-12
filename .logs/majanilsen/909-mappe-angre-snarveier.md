# 909 – Stor forbokstav overalt, angre på mappesletting, valgfrie snarveier

## Oppgave
Tre ønsker: samme forbokstavregel i kokemodus, handleliste og «Har hjemme»; angre på mappesletting; velge hvilke snarveier som vises på forsiden.

## Resultat
- 6.29b: `capitalizeName`; navnene ser like ut på alle sider.
- 6.30b: «Angre» etter mappesletting (mappe og oppskriftsliste gjenopprettes); dialogteksten oppdatert.
- 6.31b: «Tilpass» på forsidens snarveier, lagret lokalt i nettleseren.
- Tester: vitest grønn (3213), e2e utvidet med slett→angre og snarvei-valg.

## Åpne punkter
- Angre på mappe gjelder bare til siden lastes på nytt.
- Snarvalget følger ikke med til andre enheter.
