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
- source_spec: `spec-1-3-skaler-og-formater-mengder.md`
  summary: Vis enheten slik den står i oppskriften (bøyning og skrivemåte), behold «ca.» fra originalteksten og vis originallinjen uendret ved faktor 1.
  evidence: `formatLine` skriver enhetsnøkkelen («bokser» → «boks», «kilo» → «kg») og mister «ca.»-prefikset; krever at `ParsedLine` bevarer originalt enhetsord. Funn B6/E5/E6/E7, hører hjemme i Story 1.5 (visning).
- source_spec: `spec-1-4-legg-inn-oppskrift-manuelt.md`
  summary: Rydd bort oppskrifter med `savedAt = null` (importert eller lagt inn, men aldri lagret i samlingen), f.eks. eldre enn et døgn.
  evidence: Uten opprydding samler ulagrede oppskrifter seg i databasen. Funn 9 i gjennomgangen av spesifikasjonen; hører til Epic 3 (lagring).
- source_spec: `spec-1-4-legg-inn-oppskrift-manuelt.md`
  summary: Oppskriftssiden: sidetittel fra oppskriftens tittel (`generateMetadata`) og ekte HTTP 404 for ukjent oppskrift.
  evidence: Sidetittelen er alltid «Oppskrift», og `/oppskrift/999999` svarer 200 fordi `notFound()` kalles inne i Suspense etter at strømmingen har startet. Funn B7 og implementasjonsnotat; hører til Story 1.5.
