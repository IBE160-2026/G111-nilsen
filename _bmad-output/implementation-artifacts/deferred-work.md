# Utsatt arbeid

- source_spec: `spec-1-1-oppsett-toppmeny-visuell-profil.md`
  summary: Legg til CI (GitHub Actions) som kjører npm ci, lint, typecheck, test og format:check på push.
  evidence: Kvalitetsporten i README håndheves ikke automatisk; funnet B2 i gjennomgangen av Story 1.1.
- source_spec: `spec-1-1-oppsett-toppmeny-visuell-profil.md`
  summary: Legg til `messageFor(kind)` med norsk reservemelding og stram inn `errorMessages` til full `Record<ErrorKind, …>` når første feiltype tas i bruk.
  evidence: `errorMessages` er tom og `Partial`; en feiltype uten melding gir tom tekst. Funn B7/E5, blir reelt i Story 1.4.
- source_spec: `spec-1-1-oppsett-toppmeny-visuell-profil.md`
  summary: Vurder `server-only`-vakt i `src/server/config.ts` når første serverkode som importerer den kommer.
  evidence: Uten vakt kan en klientkomponent importere config og få tomme verdier. Funn E3; ingen klientimport finnes ennå.
