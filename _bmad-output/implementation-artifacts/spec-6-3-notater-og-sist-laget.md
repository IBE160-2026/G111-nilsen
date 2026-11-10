# Spec 6.3: notater og sist laget

## Intent
Epic 6 (FR-30). Egne notater på en oppskrift («brukte halv sukker») og når den sist ble laget, så appen blir personlig og 6.9 kan sortere på «sist laget» og «mest laget».

## Frosset
- **Data** (migrasjon `0008_notes_and_cooked`): `recipes.notes` (tekst, `null` = ingen), `recipes.last_cooked_at` (ISO-tid) og `recipes.cooked_count` (heltall, standard 0). `Recipe.notes`, `lastCookedAt` og `cookedCount` er valgfrie i typen.
- **Notater:** maks 2000 tegn, trimmes, linjeskift normaliseres, tom tekst fjerner notatene. Lagres med «Lagre notat» (ikke ved hvert tastetrykk); knappen er inaktiv når teksten er uendret. `updatedAt` røres ikke, så avkrysning og valgt antall på siden består.
- **Sist laget:** «Laget i dag» setter tid og øker antallet med én. Visning: «Sist laget 10. november 2026 · laget 3 ganger» (norsk tid, også nær midnatt), eller «Ikke laget ennå.»
- **Plassering:** kortet «Notater» bare for lagrede oppskrifter; på mobil under stegene, fra 768 px til høyre under stegene.
- **Handlinger:** `saveNotes` og `markCookedToday` med samme tilgangssjekk som andre handlinger; ulagret eller andres oppskrift gir «fant ikke». Feil vises under feltet (`role="alert"`), suksess i `aria-live`.

## Verifisering
lint, typecheck, format:check og build grønne; 102 filer og 2708 tester (tjeneste, handlinger, `RecipeNotes`, `RecipeView`, migrasjon); 18 e2e grønne i skyen (UJ-1 merker som laget, lagrer notat og ser det etter omlasting). Skjermbilder ved 360 og 1280 px sett.

## Review Triage Log
Egen gjennomgang.
- Dato formateres med `timeZone: "Europe/Oslo"`, så server og nettleser gir samme tekst (ingen hydreringsforskjell) og en kveld i Norge ikke blir neste dag.
- «Laget i dag» kan trykkes flere ganger samme dag og teller da flere ganger; akseptert (en angreknapp kan komme med 6.11).
- Utsatt: vise «sist laget» på kortene (kommer med sortering i 6.9), knapp i kokemodus når siste steg er ferdig.
