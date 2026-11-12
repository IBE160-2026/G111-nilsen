# Spec 6.17: handlelisten uten nett

## Intent
Epic 6. Ida vil se og krysse av i handlelisten i butikken selv om nettet faller ut.

## Frosset
- **Lagring i nettleseren, ikke i service workeren:** sider og brukerdata lagres fortsatt aldri av `public/sw.js` (Story 6.16). I stedet skriver `ShoppingList` et lite utdrag til `localStorage` (`recipemate-offline-list`, `src/lib/offline-list.ts`): tittel, tidspunkt, varene som skal kjøpes (nøkkel, tekst, oppskriftene de er til) og nøklene til de avkryssede. Varer som er hjemme er ikke med. En tom liste (ingenting valgt) overskriver ikke utdraget.
- **Visning:** `OfflineShoppingList` på `/frakoblet` leser utdraget med `useSyncExternalStore` (følger også med på endringer i andre faner), viser «Handlelisten din · tittel», tidspunkt, antall igjen og `CheckRow`-rader. Avkrysning skrives tilbake til utdraget. Uten utdrag står det hvordan man får det. Tekst i `offlineListMessages`.
- **Personvern:** utdraget slettes når toppmenyen vises uten innlogging og med nett (`ClearOfflineListOnLogout` i `AccountLink`). Uten nett slettes det aldri: den lagrede frakoblet-siden bærer menyen fra da den ble hentet (kan være utlogget) og må ikke slette listen den skal vise. Lagring som feiler (privat modus, full plass) ignoreres.
- **Service worker:** `VERSION` v2, og frakoblet-siden hentes på nytt etter første vellykkede sidenavigasjon i hver økt, så en ny utgave av appen ikke blir stående med en gammel frakoblet-side.
- **Utenfor denne storyen:** avkrysninger gjort uten nett synkroniseres ikke tilbake til ukelisten når nettet kommer (står som hint i grensesnittet), redigering av listen uten nett, «Har hjemme» uten nett.

## Verifisering
lint, typecheck, format:check og build grønne; 144 filer og 3081 tester; 46 e2e grønne to ganger (lager egen oppskrift, åpner handlelisten, nettet av, listen vises og avkrysning huskes etter omlasting). Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: den lagrede frakoblet-siden kunne ha menyen fra en utlogget tilstand, og slettet da listen den selv skulle vise; slettingen gjøres nå bare med nett.
- Funnet og rettet: en tom liste (for eksempel ved åpning av en uke uten måltider) ville slettet utdraget; skriving hoppes over når listen er tom.
- Funnet og rettet: e2e telte menyens listepunkter med; testen avgrenses til handlelisten og lager sin egen oppskrift.
- Akseptert: på en delt telefon ligger listen i nettleseren til utlogging; den inneholder bare varetekster og oppskriftstitler.
- Utsatt: synkronisering av avkrysninger tilbake, redigering uten nett.
