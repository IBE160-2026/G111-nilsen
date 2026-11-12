# Spec 6.19: dele samlingen med en annen konto

## Intent
Epic 6. Ida vil dele oppskriftene sine med noen hun lager mat sammen med.

## Frosset
- **Datamodell:** ny tabell `shares` (migrasjon `0016_shares`): `owner_id`, `member_id`, `status` («pending»/«accepted»), `created_at`; unik per par, og radene slettes med kontoen. Ingen invitasjon til e-post uten konto: mottakeren må ha en RecipeMate-konto først (tydelig melding ellers). Maks 20 delinger per konto.
- **Tjeneste (`share-service.ts`):** `inviteToCollection` (ugyldig e-post → `validation/email`, egen e-post → `validation/self`, over grensen → `validation/limit`, ukjent konto → `not_found`, invitert før → `duplicate`), `acceptInvitation` (bare mottakeren, bare én gang), `endShare` (begge parter), `listSharesIShare`, `listSharesWithMe`, `listSharedCollection`, `mayViewShared`.
- **Tilgang:** deling gir **bare lesing**. `canAccessRecipe` (som styrer alle endringer via `mayChange`) er uendret; ny `canViewRecipe` åpner for delte oppskrifter og brukes av `getRecipeFor`, som setter `sharedBy` (eierens e-post) når oppskriften er en annens. `RecipeView` med `sharedBy` skjuler rediger, variant, vurdering, merkelapper, notater, forslag og lagre/slett-linja, og viser `SharedRecipeBanner` i stedet.
- **Kopiering:** `copySharedRecipe` → `copyRecipeToUser`: innhold, kilde, antall og tid følger med; mappe, notater, merkelapper, vurdering, favoritt og valgt antall gjør det ikke (de hører til eierens egen samling). Tittelen får «Kopi av » foran.
- **Sider:** `/delt` (invitere, «Du deler med», «Delt med deg») og `/delt/<eier>` (eierens oppskrifter, bare lesing; uten godtatt deling ser siden ut som om den ikke finnes). Lenke «Deling» ved overskriften i Oppskrifter. All tekst i `shareMessages`.
- **Utenfor denne storyen:** felles redigering av hverandres oppskrifter, felles handleliste og ukemeny, invitasjon på e-post til noen uten konto, varsler.

## Verifisering
lint, typecheck, format:check og build grønne; 150 filer og 3113 tester (tjeneste, handlinger, begge sidene, begge komponentene); 48 e2e grønne to ganger, med to kontoer i hver sin nettleser: invitasjon til ukjent e-post, konto lages, invitasjon godtas, delt oppskrift leses og kopieres, og delingen avsluttes. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Valgt: lesetilgang i denne storyen. Full felles redigering ville krevd eierskapssjekk i alle tjenester og endret betydningen av favoritt, notater og mapper; det tas som egen story.
- Valgt: `canViewRecipe` ved siden av `canAccessRecipe`, så deling ikke ved et uhell åpner for endringer via Server Actions.
- Valgt: invitasjon bare til eksisterende kontoer, så det ikke lages «invitasjoner» som aldri kan godtas.
- Akseptert: eieren ser ikke når mottakeren åpner oppskriftene, og det finnes ingen varsling; invitasjonen oppdages ved å åpne «Deling».
- Utsatt: felles handleliste og ukemeny, invitasjon til e-post uten konto, redigering fra begge sider.
