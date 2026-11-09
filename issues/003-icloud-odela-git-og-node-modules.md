# 003 – iCloud ødela git og node_modules

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-04 |
| **Løst** | 2026-11-09 |
| **Område** | prosess |
| **Alvorlighet** | høy |

## Hva skjedde
Prosjektet lå i `Dokumenter`, som synkroniseres med iCloud. iCloud flyttet filer ut i skyen («optimaliser lagring»), slik at de bare fantes som plassholdere lokalt:
- git-filer (`.git/refs/remotes/origin/main` og objekter) kunne ikke leses («Resource deadlock avoided»), og `git log` krasjet med «Bus error»;
- etter `npm install` var Next.js-kompilatoren `next-swc.darwin-arm64.node` avkuttet, så `npm run dev` feilet («load command content extends beyond end of file»).

## Hvordan gjenskape
Legg et git-repo med `node_modules` i en iCloud-synkronisert mappe med «Optimaliser Mac-lagring» på, og vent til iCloud frigjør plass.

## Årsak
iCloud er ikke laget for mapper med mange små, ofte endrede filer som `.git/` og `node_modules/`.

## Løsning / hva kan endres
Alt var pushet til GitHub. Repoet ble klonet på nytt til `~/Developer/G111-nilsen`, utenfor iCloud, og `npm install` kjørt der. Den gamle mappen brukes ikke lenger.

## Lærdom / prompt
Hold kode-repoer utenfor iCloud/OneDrive/Dropbox. Bruk GitHub som backup.
