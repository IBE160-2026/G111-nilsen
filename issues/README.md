# Issues – feil og endringer underveis

Her dokumenterer vi feil og problemer som oppstår underveis i prosjektet, og hva vi gjorde eller bør gjøre med dem. Mappen er en del av prosessdokumentasjonen som sensor vurderer (KI-styring, kvalitetssikring og beslutninger).

## Regler

- Én fil per sak: `NNN-kort-tittel.md` (f.eks. `002-skalering-av-egg.md`). Nummeret øker oppover.
- Bruk malen i [`_mal.md`](_mal.md).
- Gjelder særlig: feil i KI-generert kode, importfeil på oppskriftssider, bugs funnet i testing, og avvik fra PRD/arkitektur.
- Lukkede saker slettes ikke. Sett `Status: Løst` og legg inn commit-hash.
- Hemmeligheter (API-nøkler osv.) skal aldri limes inn her.

## Oversikt

| # | Tittel | Status | Funnet | Løst |
|---|--------|--------|--------|------|
| 001 | [BMAD lå utenfor repoet](001-bmad-utenfor-repo.md) | Løst | 2026-11-04 | 2026-11-04 |
| 002 | [npm-registeret er blokkert i KI-miljøet](002-npm-blokkert-i-ki-miljo.md) | Løst | 2026-11-04 | 2026-11-04 |
| 003 | [iCloud ødela git og node_modules](003-icloud-odela-git-og-node-modules.md) | Løst | 2026-11-04 | 2026-11-09 |
| 004 | [better-sqlite3 bygges fra kildekode ved `npm ci`](004-better-sqlite3-bygges-fra-kildekode.md) | Løst | 2026-11-09 | 2026-11-09 |
| 005 | [Enhet klistret på navnet ved innliming](005-enhet-klistret-pa-navn-ved-innliming.md) | Løst | 2026-11-09 | 2026-11-09 |
