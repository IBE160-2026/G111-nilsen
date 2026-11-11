# Spec 6.15: eksport og import av oppskrifter som fil

## Intent
Epic 6. Ida vil ta sikkerhetskopi av oppskriftene sine og kunne flytte dem mellom kontoer.

## Frosset
- **Format:** JSON `{format: "recipemate-backup", version: 1, exportedAt, recipes[]}` uten id-er. Hver oppskrift: tittel, kilde (adresse og navn), antall, tid, favoritt, notater, «passer til», vurdering, laget-telling og sist laget, mappe (navn), merkelapper, ingredienser (`section`, original tekst) og steg (`section`, tekst).
- **Ikke med:** plass i ukemeny og handlelister, tatt i bruk forslag, valgt antall og slettede oppskrifter (de hører til kontoen, ikke oppskriften).
- **Eksport:** `GET /sikkerhetskopi/eksport` (rutehåndterer) gir filen som nedlasting (`Content-Disposition: attachment`, `Cache-Control: no-store`); krever innlogging (401 ellers); bare brukerens egne lagrede oppskrifter.
- **Import:** Server Action `importBackupFile` leser filen (maks 5 MB), `JSON.parse`, og `importBackup` validerer med zod (maks 1000 oppskrifter; samme grenser som «Legg inn selv», notater, merkelapper, vurdering 1–5 m.m.). Ingrediensene tolkes på nytt med `parseLine`, så mengder og enheter følger dagens regler. Alt skjer i én transaksjon: ved ugyldig innhold lagres ingenting.
- **Dubletter:** samme tittel og samme kilde-adresse som en lagret oppskrift brukeren har fra før (også innen filen) hoppes over. Mapper finnes på navn (uavhengig av store/små bokstaver) eller opprettes. Alt settes inn som lagret med dagens tidspunkt.
- **Visning:** side `/sikkerhetskopi` med overskrift utenfor Suspense, to kort (Eksporter, Importer), lenke fra Importer. All tekst i `backupMessages`. Ingen migrasjon.

## Verifisering
lint, typecheck, format:check og build grønne; 138 filer og 3055 tester (tjeneste, handling, rute, side, skjema); 42 e2e grønne, med nedlasting, import to ganger, ny oppskrift og ugyldig fil. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: e2e traff to elementer med rolle «alert» (Next sin rute-annonsering); testen bruker tekst-spørring.
- Valgt: eget portabelt format uten id-er fremfor å gjenbruke «Nylig slettet»-bildet, så filen kan flyttes mellom kontoer.
- Valgt: dublettsjekk på tittel og kilde i stedet for å spørre brukeren; filen kan importeres trygt flere ganger.
- Akseptert: en oppskrift med endret tittel regnes som ny. En ødelagt fil gir én felles feilmelding uten å si hvilken oppskrift som feilet.
- Utsatt: eksport av ukemeny og handlelister, import av andre apper sine formater, velge hvilke oppskrifter som eksporteres.
