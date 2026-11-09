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

- source_spec: `spec-3-1-se-samlingen.md`
  summary: Sporing av «sist åpnet» i Samlingen (FR-16).
  evidence: Samlingen sorteres på «sist lagret først» og dekker FR-16 med «sist lagret». Å spore åpninger krever en ny kolonne og skriving ved visning av oppskriften; tas hvis rekkefølgen etter bruk viser seg å savne det.
- source_spec: `spec-3-1-se-samlingen.md`
  summary: Sidedeling og søk i Samlingen.
  evidence: Alle oppskrifter listes i én liste. Greit for en lokal enbrukerapp med få oppskrifter; vurderes når samlingen blir stor.
- source_spec: `spec-3-1-se-samlingen.md`
  summary: Antall oppskrifter under overskriften i Samlingen (UX-mockupen) og «sist brukt» som rekkefølge (EXPERIENCE.md).
  evidence: Ikke krevd av Story 3.1; sorteringen er «sist lagret først». Tas sammen med sporing av «sist åpnet».
- source_spec: `spec-3-1-se-samlingen.md`
  summary: Import (Epic 2) må lagre tom kilde-lenke som `null`, ikke som tom streng.
  evidence: Migrasjonen 0001 og regelen «uten kilde-lenke» bruker `source_url IS NULL`; en tom streng ville ikke blitt flyttet inn i samlingen.

- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Rydding av ulagrede oppskrifter gjentas bare mens appen kjører.
  evidence: `instrumentation.ts` rydder ved oppstart og deretter hver time med `setInterval`; en app som står lenge uten omstart rydder hver time, men ingenting rydder mens den er stoppet. Greit for en lokal app; vurder en annen planlegger hvis appen skal kjøre på en server.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Kanten øverst på lagre-linjen vises alltid, ikke bare når innholdet ruller under.
  evidence: DESIGN.md sier «når innholdet ruller under»; `position: sticky` gir ingen enkel måte å vite det på uten skrollobservasjon. Akseptert i Story 3.2.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Ny import (Epic 2) skal bruke samme `savedAt = null`-regel.
  evidence: Importerte oppskrifter lagres først uten `savedAt` og legges i samlingen med «Lagre»; uten det ryddes de bort etter et døgn. Import må også skrive `createdAt` med `new Date().toISOString()`; opprydding sammenligner ISO-tekst, og et annet format (for eksempel mellomrom i stedet for «T») kan gi feil sletting.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Valgt antall personer huskes ikke når det velges før oppskriften er lagret; etter «Lagre» åpnes den på opprinnelig antall ved neste besøk.
  evidence: Spesifikasjonen lagrer bare antall for oppskrifter i samlingen. Gjelder først importerte oppskrifter (Epic 2); løses der, for eksempel ved at «Lagre» tar med valgt antall.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: `env(safe-area-inset-bottom)` på lagre-linjen har ingen effekt fordi viewport mangler `viewportFit: "cover"`; dimmingen bak dialogen lysner siden i mørk palett.
  evidence: Funnet i gjennomgangen. Nettleseren holder selv innholdet unna hjemmeindikatoren, og dialogen skilles tydelig også i mørk palett; vurderes ved designgjennomgang av hele appen.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Et sent `rememberServings`-kall kan skrive et valgt antall rett etter at en redigering har nullstilt det.
  evidence: Bare mulig hvis «Rediger» og lagring skjer innen noen få millisekunder etter å ha endret antallet; ingen versjonssjekk finnes. Ikke tatt hånd om i v1.

- source_spec: `spec-3-3-mapper.md`
  summary: Mappevalg i redigeringsskjemaet (Story 3.5).
  evidence: Mappe velges bare fra lagre-linjen på oppskriftssiden; redigering beholder mappen (`updateRecipe` rører ikke `folder_id`). Utsatt som i Story 3.5.
- source_spec: `spec-3-3-mapper.md`
  summary: Ingen grense for antall mapper.
  evidence: Alle mapper listes og vises i dialogen «Lagre i mappe». Greit for en lokal enbrukerapp; vurder en grense eller søk hvis listen blir lang.
- source_spec: `spec-3-3-mapper.md`
  summary: Mapper sorteres bare alfabetisk på navn (norsk), uten annen sortering, søk eller sidedeling.
  evidence: Utenfor Story 3.3 (Never-listen); tas hvis behovet viser seg.
- source_spec: `spec-3-3-mapper.md`
  summary: Radiogruppen i «Lagre i mappe» har ingen maksimal høyde; «Lagre» og «Avbryt» havner under bretten med mange mapper.
  evidence: Funnet i gjennomgangen (12 mapper ved 360 × 700). Dialogen scroller og fokus følger med. Løses sammen med en eventuell grense eller søk i mapper.
- source_spec: `spec-3-3-mapper.md`
  summary: `FolderRow`, `FolderNameForm` og `FolderDialog` har ingen egne `forced-colors`-regler.
  evidence: De bruker kantlinje, outline og innebygde radioer og ventes å fungere i høykontrast, men det er ikke målt. Sjekkes sammen med forced-colors i 1.6.
- source_spec: `spec-3-3-mapper.md`
  summary: Gjentatt sletting eller flytting av en mappe som allerede er slettet (annen fane) revaliderer ikke, så raden eller valget står igjen til neste innlasting.
  evidence: Samme mønster som `removeRecipe` ved `not_found` i 3.2; brukeren får en melding. Tas hvis det oppstår.
