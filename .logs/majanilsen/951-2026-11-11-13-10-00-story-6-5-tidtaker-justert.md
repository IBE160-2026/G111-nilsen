# Story 6.5: tidtaker justert etter test

## 2026-11-11 kl. 13:10 — majanilsen

### Oppgave
Maja testet tidtakeren: knappen og nedtellingen var for små, det manglet en måte å legge til mer tid, og det kom ingen lyd eller signal fra Mac-en da tiden var ute.

### Plan
- Oppfølging av [story-6-5](952-2026-11-11-12-30-00-story-6-5-tidtaker.md); [spec-6-5](../../_bmad-output/implementation-artifacts/spec-6-5-tidtaker-i-kokemodus.md) oppdatert.
- Større knapper og tall; «−1 min», «+1 min» og «+5 min»; signal i flere ledd (egen modul `src/lib/alarm.ts`).

### Resultat
- «Start tidtaker» er en stor fylt knapp, og nedtellingen står i stor skrift.
- Tid kan legges til eller trekkes fra, også etter at den er ute (da starter den på nytt).
- Når tiden er ute: gjentatte pip til beskjeden lukkes, `<audio>` som reserve for Web Audio, varsel fra systemet (spør om lov første gang), blinkende fanetittel og vibrasjon.
- lint, typecheck, format og build grønne; 2783 tester; 22 e2e grønne i skyen; skjermbilder ved 360 og 1280 px.

### Åpne punkter
- Maja: push, og prøv på Mac og telefon. Svar «Tillat» når nettleseren spør om varsler. Hvis det fortsatt er helt stille, si hvilken nettleser du bruker (Safari, Chrome …), og sjekk at fanen ikke er satt til lydløs. Lyden kan jeg ikke teste i skyen.
- Neste: Story 6.6, utskriftsvennlig oppskrift.
