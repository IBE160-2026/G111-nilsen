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
- source_spec: `spec-1-5-se-oppskrift-og-velg-antall.md`
  summary: Vis enheten slik den står i oppskriften («bokser», «SS.») og behold «ca.» fra originalteksten; krever nye felt i `ParsedLine` og i `ingredient_lines`.
  evidence: Utsatt fra 1.3 til 1.5, men holdt utenfor 1.5 fordi det endrer tolkekontrakten og alle tolketester. Hører til «hvis tid» eller en egen liten story etter Epic 3.
- source_spec: `spec-1-5-se-oppskrift-og-velg-antall.md`
  summary: Ekte HTTP 404 for ukjent oppskrift (i dag 200 med norsk 404-innhold).
  evidence: Med Cache Components må `params` leses inne i Suspense, så strømmen starter før `notFound()`. Krever annen sidestruktur; lav brukerverdi i en lokal app.
- source_spec: `spec-1-5-se-oppskrift-og-velg-antall.md`
  summary: Vis seksjonsoverskrifter i stegene (`Step.section`) slik ingrediensseksjoner vises.
  evidence: Story 2.1 beholder seksjonsnavn fra `HowToSection`, men oppskriftssiden viser stegene som én liste. Funn E5.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Redigering av kilde, mappe, favoritt og seksjoner (ingredienser og steg) i redigeringsskjemaet.
  evidence: Skjemaet har bare tittel, antall personer, ingredienser og steg. Ingredienser og steg lagres uten seksjon, så seksjoner fra import forsvinner når oppskriften redigeres. Tas når seksjoner, kilde og mapper kan redigeres.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Rad-id for ingredienser og steg er ikke stabil mellom redigeringer.
  evidence: Redigering sletter og setter inn linjer og steg på nytt. Ingen funksjon bruker rad-id ennå (avkrysning er klienttilstand); vurder oppdatering på plass hvis noe begynner å lagre mot rad-id.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Oppskrift med verdier utenfor `LIMITS` (mulig etter import) kan ikke lagres uendret i redigeringsskjemaet.
  evidence: Redigering bruker samme grenser som «Legg inn selv». Håndteres når import kan gi lengre tekster.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Tegn med nullbredde (U+200B m.fl.) passerer `trim()` i tittel og linjer.
  evidence: Gjelder også «Legg inn selv» og er ikke en regresjon.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Ved `not_found` under lagring peker «Avbryt» til en side som gir 404.
  evidence: Sjeldent i en enbrukerapp; tas hvis det oppstår.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Fokusflytt til første feil kan gjentas når en side gjenopprettes av Cache Components.
  evidence: Sjekkes i nettleseren sammen med at skjemaet ikke viser gamle verdier ved ny åpning.

- source_spec: `spec-1-6-kryss-av-under-matlaging.md`
  summary: Klikk på −/+ rett etter ugyldig kladd i porsjonsfeltet ved grensen: blur-commit av kladden gjør at klikket likevel virker (verdi 1, kladd «5», klikk − gir 4).
  evidence: Funn E1; følge av `aria-disabled` i stedet for `disabled`. Resultatet er et gyldig tall; kan løses ved å lese grensen ved `pointerdown`.
