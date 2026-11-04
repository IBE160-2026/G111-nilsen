# 001 – BMAD lå utenfor repoet

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-04 |
| **Løst** | 2026-11-04 |
| **Område** | prosess |
| **Alvorlighet** | middels |

## Hva skjedde
BMAD (`_bmad/`, BMAD-skills i `.claude/skills/` og `_bmad-output/`) var installert i den overordnede kursmappen og ikke i selve repoet `G111-nilsen`. Planleggingsdokumentene ville dermed aldri blitt en del av historikken sensor ser.

## Årsak
BMAD ble satt opp i mappen over repoet.

## Løsning
BMAD-filene er flyttet inn i repoet. `_bmad-output/` har `.gitkeep`, og `.gitignore` holder lokale konfigfiler utenfor.

## Lærdom
Sjekk at verktøy installeres inne i repoet før planleggingen starter, slik at plan, prompts og kode følger samme historikk.
