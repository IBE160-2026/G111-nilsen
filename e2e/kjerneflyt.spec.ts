import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Kjerneflyten fra PRD (UJ-1, UJ-2, UJ-3) gjennom ekte nettleser, mot den bygde appen med
 * lagrede oppskriftssider (`IMPORT_SOURCE=fixtures`), eksempelforslag og en tom midlertidig
 * database. Ingen nettverkskall (NFR-2, AD-11, SM-6).
 *
 * Alle prosjektene deler databasen, så hvert prosjekt bruker egne oppskrifter og mapper og sin
 * egen konto (Story 5.13). Hver test logger inn først, bortsett fra testen av innlogging.
 * `mobil-360` følger PRD-eksemplene nærmest (4 til 5 porsjoner).
 */
const DATA = {
  "mobil-360": {
    uj1: {
      url: "https://www.godt.no/oppskrifter/pannekaker-og-vafler/155/amerikanske-pannekaker",
      title: "Amerikanske pannekaker",
      original: 4,
    },
    uj2: {
      url: "https://www.godt.no/oppskrifter/pannekaker-og-vafler/8749/grove-middagspannekaker",
      title: "Grove pannekaker",
      original: 6,
    },
    folders: { uj1: "Hverdag mobil", uj2: "Helg mobil" },
  },
  "desktop-1280": {
    uj1: {
      url: "https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus",
      title: "Kjøttboller i tomatsaus",
      original: 16,
    },
    uj2: {
      url: "https://www.matprat.no/oppskrifter/familien/rundstykker/",
      title: "Rundstykker",
      original: 1,
    },
    folders: { uj1: "Hverdag desktop", uj2: "Helg desktop" },
  },
} as const;

const OVERVIEW_URL = "https://www.klikk.no/mat/spise/oppskrift-pa-farikal-2530170";

async function importRecipe(page: Page, url: string, title: string) {
  await page.goto("/importer");
  await page.getByLabel("Lenke til oppskriften").fill(url);
  await page.getByRole("button", { name: "Hent oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible({
    timeout: 20_000,
  });
}

async function setServings(page: Page, count: number) {
  const input = page.getByLabel("Antall porsjoner", { exact: true });
  await input.fill(String(count));
  await input.press("Enter");
  await expect(input).toHaveValue(String(count));
}

async function ingredientsText(page: Page): Promise<string> {
  const section = page.locator("section, div").filter({
    has: page.getByRole("heading", { name: "Ingredienser" }),
  });
  return (await section.last().innerText()).replace(/\s+/g, " ");
}

/** Lagrer oppskriften i en ny mappe via dialogen «Lagre i mappe». */
async function saveInNewFolder(page: Page, folder: string) {
  await page.getByRole("button", { name: "Lagre", exact: true }).click();
  await page.getByRole("button", { name: "Lagre i mappe" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ny mappe").check();
  await dialog.getByLabel("Navn på ny mappe").fill(folder);
  await dialog.getByRole("button", { name: "Lagre", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: `${folder}, bytt mappe` })).toBeVisible();
}

const PASSWORD = "e2e-passord-123";

/**
 * Feltet med denne etiketten på siden som vises. Forrige side kan ligge skjult i DOM-en (Next
 * beholder den med Activity), med et skjema med samme etiketter.
 */
function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

/** E-posten til prosjektets testkonto. */
function accountFor(project: string): string {
  return `${project}@e2e.recipemate.no`;
}

/**
 * Logger inn med prosjektets konto; finnes den ikke ennå, lages den (Story 5.13). Ender på
 * forsiden med «Logg ut» i toppmenyen.
 */
async function signIn(page: Page, project: string) {
  const email = accountFor(project);
  await page.goto("/ny-konto");
  await field(page, "E-post").fill(email);
  await field(page, "Passord").fill(PASSWORD);
  await page.getByRole("button", { name: "Lag konto" }).click();
  const taken = page.getByText("Det finnes allerede en konto med denne e-posten.", {
    exact: false,
  });
  const signedIn = page.getByRole("button", { name: "Logg ut" });
  await expect(taken.or(signedIn)).toBeVisible();
  if (await taken.isVisible()) {
    await page.goto("/logg-inn");
    await field(page, "E-post").fill(email);
    await field(page, "Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(signedIn).toBeVisible();
  }
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith("Versjon 2: innlogging")) return;
  await signIn(page, testInfo.project.name);
});

test("Versjon 2: innlogging – hent uten konto, logg inn for å lagre, andre ser den ikke", async ({
  page,
  browser,
}, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  // En egen oppskrift for denne testen, så de andre testene ikke påvirkes.
  const { uj2 } = data;

  // Uten konto: oppskrifter krever innlogging, men henting og visning virker.
  await page.goto("/oppskrifter");
  await expect(page.getByRole("heading", { name: "Logg inn for å se dette" })).toBeVisible();
  await importRecipe(page, uj2.url, uj2.title);
  await page.getByRole("link", { name: "Logg inn for å lagre" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Logg inn" })).toBeVisible();

  // Ny konto for testen; etterpå tilbake til oppskriften, og nå kan den lagres.
  const email = `innlogging-${testInfo.project.name}@e2e.recipemate.no`;
  await page.getByRole("link", { name: "Lag konto" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lag en konto" })).toBeVisible();
  // Vent til skjemaet er klart, ellers kan det som fylles ut før hydrering bli nullstilt.
  await page.waitForLoadState("networkidle");
  await field(page, "E-post").fill(email);
  await field(page, "Passord").fill("kort");
  await page.getByRole("button", { name: "Lag konto" }).click();
  await expect(page.getByText("Passordet må ha minst 8 tegn.")).toBeVisible();
  await field(page, "Passord").fill(PASSWORD);
  await page.getByRole("button", { name: "Lag konto" }).click();
  await expect(page.getByRole("heading", { level: 1, name: uj2.title })).toBeVisible();
  await page.getByRole("button", { name: "Lagre", exact: true }).click();
  await expect(page.getByRole("button", { name: `Slett ${uj2.title}` })).toBeVisible();
  const recipeUrl = page.url();

  // En annen bruker (ny nettleserkontekst uten cookie) finner ikke oppskriften.
  const other = await browser.newPage();
  await other.goto(recipeUrl);
  await expect(
    other.getByRole("heading", { level: 1, name: "Fant ikke oppskriften" }),
  ).toBeVisible();
  await other.close();

  // Logg ut: Oppskrifter krever innlogging igjen.
  await page.getByRole("button", { name: "Logg ut" }).click();
  await expect(page.getByRole("link", { name: "Logg inn" }).first()).toBeVisible();
  await page.goto("/oppskrifter");
  await expect(page.getByRole("heading", { name: "Logg inn for å se dette" })).toBeVisible();
});

test("UJ-1: importer, skaler til ett flere, lagre i mappe og gjør til favoritt", async ({
  page,
}, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  const { uj1 } = data;

  await importRecipe(page, uj1.url, uj1.title);
  await expect(page.getByLabel("Antall porsjoner", { exact: true })).toHaveValue(
    String(uj1.original),
  );
  // Tiden fra kilden vises under tittelen og ved lagre-linjen (Story 6.2).
  await expect(page.getByText(/^Tid: /)).toHaveCount(2);
  const before = await ingredientsText(page);

  await page.getByRole("button", { name: "Flere porsjoner" }).click();
  await expect(page.getByLabel("Antall porsjoner", { exact: true })).toHaveValue(
    String(uj1.original + 1),
  );
  expect(await ingredientsText(page)).not.toBe(before);

  await saveInNewFolder(page, data.folders.uj1);
  await page.getByRole("button", { name: `Favoritt: ${uj1.title}` }).click();
  await expect(page.getByRole("button", { name: `Favoritt: ${uj1.title}` })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Notater og «sist laget» (Story 6.3).
  await page.getByRole("button", { name: "Laget i dag" }).click();
  await expect(page.getByText(/laget 1 gang/)).toBeVisible();
  await field(page, "Passer til").fill("2 sultne");
  await field(page, "Dine notater").fill("Stek litt kortere.");
  await page.getByRole("button", { name: "Lagre notat" }).click();
  await expect(page.getByText("Notatet er lagret.")).toBeVisible();
  await page.reload();
  await expect(field(page, "Dine notater")).toHaveValue("Stek litt kortere.");
  await expect(field(page, "Passer til")).toHaveValue("2 sultne");
});

test("UJ-2: forslag tas i bruk og huskes; oversiktsside gir melding", async ({
  page,
}, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  const { uj2 } = data;

  await importRecipe(page, uj2.url, uj2.title);
  await setServings(page, 5);

  await page.getByRole("button", { name: "Få forslag" }).click();
  await expect(page.getByText("Enkle forslag", { exact: true })).toBeVisible();
  const group = page.getByRole("group");
  await expect(group.first()).toBeVisible();
  const count = await group.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);

  await page
    .getByRole("button", { name: /^Ta i bruk/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Dine valgte forslag" })).toBeVisible();
  await expect(page.getByText("Tatt i bruk", { exact: true })).toBeVisible();
  while ((await page.getByRole("button", { name: /^Hopp over/ }).count()) > 0) {
    await page
      .getByRole("button", { name: /^Hopp over/ })
      .first()
      .click();
  }
  await expect(page.getByText("Du har tatt stilling til alle forslagene.")).toBeVisible();
  // Forslaget vises i ingredienslisten og/eller flettet inn i stegteksten, merket som forslag
  // (Story 5.11, 5.12).
  const badges = page.locator("[data-suggested]");
  await expect(badges.first()).toBeVisible();
  expect(await ingredientsText(page)).not.toBe("");

  await saveInNewFolder(page, data.folders.uj2);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dine valgte forslag" })).toBeVisible();
  await expect(page.getByText("Tatt i bruk", { exact: true })).toBeVisible();
  await expect(badges.first()).toBeVisible();

  // «Fjern» tar forslaget ut av oppskriften igjen.
  await page
    .getByRole("button", { name: /^Fjern: / })
    .first()
    .click();
  await expect(badges).toHaveCount(0);

  // Kanttilfelle: lenken er en oversiktsside uten oppskrift.
  await page.goto("/importer");
  await page.getByLabel("Lenke til oppskriften").fill(OVERVIEW_URL);
  await page.getByRole("button", { name: "Hent oppskrift" }).click();
  await expect(page.getByText("Fant ingen oppskrift på siden.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Legg inn selv" }).first()).toBeVisible();
});

test("UJ-3: finn igjen favoritten under Favoritter og endre antallet", async ({
  page,
}, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  const { uj1 } = data;

  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Hovedmeny" })
    .getByRole("link", { name: "Favoritter" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Favoritter" })).toBeVisible();
  await page
    .getByRole("link", { name: new RegExp(uj1.title) })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: uj1.title })).toBeVisible();

  // Antallet fra forrige gang huskes: UJ-1 valgte ett flere enn det oppskriften er laget for,
  // før den ble lagret (issue 009).
  await expect(page.getByLabel("Antall porsjoner", { exact: true })).toHaveValue(
    String(uj1.original + 1),
  );
  await setServings(page, 3);
  await expect(page.getByLabel("Antall porsjoner", { exact: true })).toHaveValue("3");
});

test("Versjon 2: søk i Oppskrifter, halv porsjon og kokemodus", async ({ page }, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  const { uj1 } = data;

  await page.goto("/oppskrifter");
  const search = page.getByLabel("Søk i oppskrifter");
  await search.fill("zzzz finnes ikke");
  await expect(page.getByText("Ingen oppskrifter passer.")).toBeVisible();
  await page.getByRole("button", { name: "Nullstill søk" }).click();
  await search.fill(uj1.title.split(" ")[0]);
  await page
    .getByRole("link", { name: new RegExp(uj1.title) })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: uj1.title })).toBeVisible();

  await setServings(page, 4);
  await page.getByRole("button", { name: "Legg til en halv porsjon" }).click();
  await expect(page.getByLabel("Antall porsjoner", { exact: true })).toHaveValue("4,5");

  // Mål: gram og dl endrer mengdene, og «Som i oppskriften» gir tilbake originalen.
  const before = await ingredientsText(page);
  await page.getByRole("radio", { name: "Vekt (gram)" }).check();
  await expect(page.getByRole("radio", { name: "Vekt (gram)" })).toBeChecked();
  expect(await ingredientsText(page)).not.toBe(before);
  expect(await ingredientsText(page)).toContain("ca.");
  await page.getByRole("radio", { name: "Som i oppskriften" }).check();
  expect(await ingredientsText(page)).toBe(before);

  await page.getByRole("button", { name: /^Åpne kokemodus/ }).click();
  const cooking = page.getByRole("dialog", { name: /^Kokemodus/ });
  await expect(cooking.getByText(/^Steg 1 av \d+$/)).toBeVisible();
  await expect(cooking.getByText("Ingredienser for 4,5 porsjoner")).toBeVisible();
  await cooking.getByRole("button", { name: "Neste" }).click();
  await expect(cooking.getByText(/^Steg 2 av \d+$/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(cooking).toBeHidden();
});

test("Versjon 2: merkelapper settes på oppskriften og brukes i søk og filter", async ({
  page,
}, testInfo) => {
  const { uj1 } = DATA[testInfo.project.name as keyof typeof DATA];
  const label = `Hverdagsmat ${testInfo.project.name}`.slice(0, 30);

  await page.goto("/oppskrifter");
  await page
    .getByRole("link", { name: new RegExp(uj1.title) })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: uj1.title })).toBeVisible();

  const field = page.getByLabel("Ny merkelapp");
  await field.fill(label);
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  await expect(page.getByRole("button", { name: `Fjern merkelappen ${label}` })).toBeVisible();
  // En lik merkelapp med andre store og små bokstaver blir ikke lagt til to ganger.
  await field.fill(label.toUpperCase());
  await field.press("Enter");
  await expect(page.getByRole("button", { name: /^Fjern merkelappen/ })).toHaveCount(1);

  await page.goto("/oppskrifter");
  await expect(page.getByRole("list", { name: "Merkelapper" }).getByText(label)).toBeVisible();

  const search = page.getByLabel("Søk i oppskrifter");
  await search.fill(label.toLowerCase());
  await expect(page.getByRole("link", { name: new RegExp(uj1.title) })).toHaveCount(1);
  await search.fill("");
  await page.getByLabel("Merkelapp", { exact: true }).selectOption(label);
  await expect(page.getByRole("link", { name: new RegExp(uj1.title) })).toHaveCount(1);
  await page.getByLabel("Merkelapp", { exact: true }).selectOption("");

  await page
    .getByRole("link", { name: new RegExp(uj1.title) })
    .first()
    .click();
  await page.getByRole("button", { name: `Fjern merkelappen ${label}` }).click();
  await expect(page.getByText("Ingen merkelapper ennå.")).toBeVisible();
});

test("Versjon 2: stjernevurdering settes på oppskriften og vises på kortet", async ({
  page,
}, testInfo) => {
  const { uj1 } = DATA[testInfo.project.name as keyof typeof DATA];
  await page.goto("/oppskrifter");
  await page
    .getByRole("link", { name: new RegExp(uj1.title) })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: uj1.title })).toBeVisible();
  await expect(page.getByText("Ikke vurdert ennå.")).toBeVisible();

  await page.getByRole("button", { name: "4 av 5 stjerner" }).click();
  await expect(page.getByText("Vurderingen er satt til 4 av 5.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "4 av 5 stjerner" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto("/oppskrifter");
  await expect(page.getByRole("img", { name: "Vurdering: 4 av 5" })).toHaveCount(1);

  await page
    .getByRole("link", { name: new RegExp(uj1.title) })
    .first()
    .click();
  await page.getByRole("button", { name: "Fjern vurdering" }).click();
  await expect(page.getByText("Ikke vurdert ennå.")).toBeVisible();
});

test("Versjon 2: tidtaker i kokemodus fra tid i steget", async ({ page }, testInfo) => {
  // En egen oppskrift med en kort tid i steget, så testen ikke venter i minutter.
  const title = `Tidtaker ${testInfo.project.name}`;
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill("2 egg\n1 dl melk");
  await field(page, "Steg (valgfritt)").fill("Visp egg og melk.\nLa hvile i 2 sekunder.");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Utskrift (Story 6.6): uten meny og knapper, med tittel, ingredienser og steg.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Hovedmeny" })).toBeHidden();
  await expect(page.getByRole("button", { name: /^Skriv ut/ })).toBeHidden();
  await expect(page.getByRole("link", { name: /^Rediger/ })).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Slik gjør du" })).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await expect(page.getByRole("button", { name: /^Skriv ut/ })).toBeVisible();

  await page.getByRole("button", { name: /^Åpne kokemodus/ }).click();
  const cooking = page.getByRole("dialog", { name: /^Kokemodus/ });
  await expect(cooking.getByRole("button", { name: /^Start tidtaker/ })).toHaveCount(0);
  await expect(cooking.getByRole("button", { name: "Test lyden" })).toHaveCount(0);
  await cooking.getByRole("button", { name: "Neste" }).click();
  // «Test lyden» vises der steget har tid: lydkonteksten kommer i gang i en ekte nettleser.
  await cooking.getByRole("button", { name: "Test lyden" }).click();
  await expect(cooking.getByRole("status")).toHaveText("Spilte en lyd. Hørte du den?");
  await cooking.getByRole("button", { name: "Start tidtaker: 2 sek" }).click();
  await expect(cooking.getByRole("timer")).toBeVisible();

  // Tiden går ut: beskjeden kommer, og den kan lukkes.
  await expect(cooking.getByRole("alert")).toHaveText(/Tiden er ute for steg 2/, {
    timeout: 10_000,
  });
  // Mer tid: tidtakeren starter på nytt med ett minutt, og kan avbrytes.
  await cooking.getByRole("button", { name: /^Legg til 1 minutt/ }).click();
  await expect(cooking.getByRole("alert")).toHaveCount(0);
  await expect(cooking.getByRole("timer")).toHaveText(/^(1:00|0:5\d)$/);
  await cooking.getByRole("button", { name: /^Avbryt tidtaker for steg 2/ }).click();
  await expect(cooking.getByRole("timer")).toHaveCount(0);

  // Rydder: sletter oppskriften igjen.
  await page.keyboard.press("Escape");
  await expect(cooking).toBeHidden();
  await page.getByRole("button", { name: `Slett ${title}` }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Slett/ })
    .click();
});

test("Versjon 2: handleliste fra lagret oppskrift", async ({ page }, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  const { uj1 } = data;

  await page.goto("/oppskrifter");
  await page.getByRole("link", { name: "Lag handleliste" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Handleliste" })).toBeVisible();
  await expect(page.getByText("Velg minst én oppskrift for å lage en liste.")).toBeVisible();
  await page.getByRole("checkbox", { name: uj1.title }).check();
  const list = page
    .getByRole("heading", { name: "Du må kjøpe" })
    .locator("xpath=ancestor::section");
  await expect(list.getByRole("listitem").first()).toBeVisible();
  await expect(list.getByText(`Til ${uj1.title}`).first()).toBeVisible();

  // «Har hjemme»: varen forsvinner fra listen, og valget huskes etter at siden er lastet på nytt.
  const before = await list.getByRole("listitem").count();
  const homeButton = list.getByRole("button", { name: /^Har hjemme: / }).first();
  const label = (await homeButton.getAttribute("aria-label")) ?? "";
  const name = label.replace("Har hjemme: ", "");
  await homeButton.click();
  const pantry = page
    .getByRole("heading", { level: 2, name: "Har hjemme" })
    .locator("xpath=ancestor::section");
  await expect(pantry.getByText(name, { exact: true })).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(before - 1);
  await page.reload();
  await expect(pantry.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: uj1.title }).check();
  await expect(page.getByText(/skjult fordi du har/)).toBeVisible();

  // Legger tilbake, så andre tester starter med en tom «Har hjemme».
  await pantry.getByRole("button", { name: `Legg tilbake på listen: ${name}` }).click();
  await expect(pantry.getByText("Ingenting ennå.")).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(before);

  // «Tøm listen» etter handling: spør først, og varene kommer tilbake på handlelisten.
  await list
    .getByRole("button", { name: /^Har hjemme: / })
    .first()
    .click();
  await expect(list.getByRole("listitem")).toHaveCount(before - 1);
  await pantry.getByRole("button", { name: "Tøm listen" }).click();
  await page
    .getByRole("dialog", { name: "Tømme «Har hjemme»?" })
    .getByRole("button", { name: "Tøm" })
    .click();
  await expect(pantry.getByText("Ingenting ennå.")).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(before);

  // Søk: filtrerer oppskriftene, og valgte blir stående.
  const pickBox = page
    .getByRole("heading", { name: "Velg oppskrifter" })
    .locator("xpath=ancestor::section")
    .getByRole("checkbox", { name: uj1.title });
  const search = page.getByRole("searchbox", { name: "Søk etter oppskrift" });
  await search.fill("zzzz-finnes-ikke");
  await expect(
    page.getByText("Ingen lagrede oppskrifter passer «zzzz-finnes-ikke»."),
  ).toBeVisible();
  await search.fill(uj1.title.slice(0, 5));
  await expect(pickBox).toBeVisible();
  await search.fill("");

  // Ikke lagret: valgene er borte når man går til en annen side og kommer tilbake.
  await page
    .getByRole("navigation", { name: "Hovedmeny" })
    .getByRole("link", { name: "Ukemeny" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Ukemeny" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Hovedmeny" })
    .getByRole("link", { name: "Handleliste" })
    .click();
  await expect(page.getByText("Velg minst én oppskrift for å lage en liste.")).toBeVisible();
  await expect(pickBox).not.toBeChecked();

  // Lagre handlelisten: valgte oppskrifter og porsjoner lagres under et navn og kan åpnes igjen.
  await pickBox.check();
  await page.getByRole("textbox", { name: "Navn på listen" }).fill("E2E-liste");
  await page.getByRole("button", { name: "Lagre handlelisten" }).click();
  await expect(page.getByText("Handlelisten «E2E-liste» er lagret.")).toBeVisible();
  const saved = page
    .getByRole("heading", { name: "Lagrede handlelister" })
    .locator("xpath=ancestor::section");
  await expect(saved.getByRole("link", { name: "Åpne E2E-liste" })).toBeVisible();
  await page.goto("/handleliste");
  await saved.getByRole("link", { name: "Åpne E2E-liste" }).click();
  await expect(page.getByText("Lagret liste: E2E-liste.")).toBeVisible();
  await expect(pickBox).toBeChecked();
  await saved.getByRole("button", { name: "Slett E2E-liste" }).click();
  await page
    .getByRole("dialog", { name: "Slette handlelisten?" })
    .getByRole("button", { name: "Slett" })
    .click();
  await expect(page.getByText("Handlelisten «E2E-liste» er slettet.")).toBeVisible();
});

test("Versjon 2: ukemeny og handleliste for uka", async ({ page }) => {
  await page.goto("/oppskrifter");
  await page
    .getByRole("navigation", { name: "Hovedmeny" })
    .getByRole("link", { name: "Ukemeny" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Ukemeny" })).toBeVisible();
  await expect(page.getByText(/^Uke \d+ · /)).toBeVisible();

  // Første dag i uka: skriv antallet først, så legges oppskriften til med en gang den velges.
  const form = page.getByRole("form", { name: /^Legg til på mandag/ });
  await expect(form.getByRole("button", { name: "Legg til" })).toHaveCount(0);
  await form.getByLabel("Porsjoner").fill("3");
  // Søk: åpne listen og finn den første lagrede oppskriften (hvilke som er lagret avhenger av
  // tidligere tester), så skriv starten av tittelen og velg med tastaturet.
  const search = form.getByRole("combobox", { name: "Oppskrift" });
  await search.click();
  const first = form.getByRole("option").first();
  const title = ((await first.textContent()) ?? "").trim();
  expect(title).not.toBe("");
  await search.fill(title.slice(0, 6));
  await expect(form.getByRole("option", { name: title, exact: true })).toBeVisible();
  // Den første oppskriften er også først blant treffene, og er markert: Enter velger og legger til.
  await search.press("ArrowDown");
  await search.press("ArrowUp");
  await search.press("Enter");
  const monday = page.locator("li", {
    has: page.getByRole("heading", { level: 2, name: /^mandag/i }),
  });
  await expect(monday.getByRole("link", { name: title })).toBeVisible();
  await expect(monday.getByText("3 porsj.")).toBeVisible();

  // Ikke lagret før «Lagre uka»: handlelisten venter, og knappen lagrer hele uka.
  await expect(page.getByText("Ikke lagret ennå. Trykk «Lagre uka».")).toBeVisible();
  await page.getByRole("button", { name: "Lagre uka" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Uka er lagret." })).toBeVisible();
  await page.reload();
  await expect(monday.getByRole("link", { name: title })).toBeVisible();
  // «Se alle uker»: uka står i oversikten; en egen side viser menyen og veien til handlelisten.
  await page.getByRole("link", { name: "Se alle uker", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Alle uker" })).toBeVisible();
  await expect(page.getByRole("list").getByText(title, { exact: false }).first()).toBeVisible();
  await page
    .getByRole("link", { name: /^Uke \d+/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Ukemeny" })).toBeVisible();
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
  await page.getByRole("link", { name: "Se handlelisten for uka" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Handleliste" })).toBeVisible();
  // Avkrysninger huskes per uke, også etter ny innlasting.
  const firstItem = page
    .getByRole("heading", { name: "Du må kjøpe" })
    .locator("xpath=ancestor::section")
    .getByRole("checkbox")
    .first();
  await firstItem.check();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(firstItem).toBeChecked();
  await firstItem.uncheck();
  await page.waitForLoadState("networkidle");
  await page.goto("/ukemeny");

  await page.getByRole("link", { name: "Lag handleliste for uka" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Handleliste" })).toBeVisible();
  await expect(page.getByText(/^Valgt fra ukemenyen: Uke \d+/)).toBeVisible();
  await expect(page.getByRole("checkbox", { name: title, exact: true })).toBeChecked();
  await expect(page.getByLabel(`Antall porsjoner for ${title}`)).toHaveValue("3");

  // Rydder, så andre kjøringer starter med en tom uke.
  await page.getByRole("link", { name: "Ukemeny", exact: true }).first().click();
  await monday.getByRole("button", { name: new RegExp(`^Fjern ${title}`) }).click();
  await expect(monday.getByText("Ingenting planlagt.")).toBeVisible();
  await page.getByRole("button", { name: "Lagre uka" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Uka er lagret." })).toBeVisible();
});

test("Versjon 2: lag egen variant av en oppskrift og endre navnet", async ({ page }, testInfo) => {
  const { uj1 } = DATA[testInfo.project.name as keyof typeof DATA];
  await page.goto("/oppskrifter");
  await page
    .getByRole("link", { name: new RegExp(uj1.title) })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name: uj1.title })).toBeVisible();
  const originalUrl = page.url();

  await page.getByRole("button", { name: /^Lag egen variant/ }).click();
  await expect(page).toHaveURL(/\/oppskrift\/\d+\/rediger$/);
  await expect(field(page, "Tittel")).toHaveValue(new RegExp(`^Kopi av ${uj1.title}`));
  const variant = `Variant ${testInfo.project.name}`;
  await field(page, "Tittel").fill(variant);
  await page.getByRole("button", { name: "Lagre endringer" }).click();
  await expect(page.getByRole("heading", { level: 1, name: variant })).toBeVisible();

  // Originalen er uendret, og begge står i Oppskrifter.
  await page.goto(originalUrl);
  await expect(page.getByRole("heading", { level: 1, name: uj1.title })).toBeVisible();
  await page.goto("/oppskrifter");
  await expect(page.getByRole("heading", { level: 2, name: variant })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: uj1.title }).first()).toBeVisible();
});

test("Versjon 2: slettet oppskrift kan angres, hentes tilbake og slettes for godt", async ({
  page,
}, testInfo) => {
  const title = `Slettetest ${testInfo.project.name}`;
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill("2 egg\n1 dl melk");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await page.getByRole("button", { name: "4 av 5 stjerner" }).click();
  await expect(page.getByText("Vurderingen er satt til 4 av 5.")).toBeVisible();

  const remove = async () => {
    await page.getByRole("button", { name: `Slett ${title}` }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^Slett/ })
      .click();
  };

  // Slett og angre rett etterpå: oppskriften kommer tilbake med vurderingen.
  await remove();
  await expect(page).toHaveURL(/\/oppskrifter\?slettet=\d+$/);
  await expect(page.getByText(`Oppskriften «${title}» er slettet.`)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: title })).toHaveCount(0);
  await page.getByRole("button", { name: `Angre slettingen av ${title}` }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("button", { name: "4 av 5 stjerner" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Slett igjen og hent tilbake fra «Nylig slettet».
  await remove();
  await page.getByRole("link", { name: "Se nylig slettet" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nylig slettet" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
  await page.getByRole("button", { name: `Hent tilbake ${title}` }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Slett en tredje gang og slett for godt.
  await remove();
  await page.getByRole("link", { name: "Se nylig slettet" }).click();
  await page.getByRole("button", { name: `Slett ${title} for godt` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Slett for godt" }).click();
  await expect(page.getByText(`«${title}» er slettet for godt.`)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: title })).toHaveCount(0);
});

test("Versjon 2: appen kan installeres og viser en egen side uten nett", async ({
  page,
  context,
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({
    name: "RecipeMate",
    display: "standalone",
    start_url: "/oppskrifter",
  });
  for (const icon of ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png"]) {
    expect((await request.get(icon)).ok(), icon).toBe(true);
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

  await context.setOffline(true);
  await page.goto("/oppskrifter");
  await expect(page.getByRole("heading", { level: 1, name: "Du er frakoblet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Prøv igjen" })).toBeVisible();
  await context.setOffline(false);
});

test("Versjon 2: dele samlingen med en annen konto", async ({ page, browser }, testInfo) => {
  const project = testInfo.project.name;
  const title = `Delt ${project}`;
  const friend = `venn-${project}@e2e.recipemate.no`;

  // Ida lager en oppskrift og inviterer en annen konto, som ikke finnes ennå.
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill("2 dl rømme");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page.goto("/oppskrifter");
  await page.getByRole("link", { name: "Deling" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Deling" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-posten til den du vil dele med").fill(friend);
  await page.getByRole("button", { name: "Inviter" }).click();
  await expect(page.getByText("Fant ingen konto med denne e-posten.")).toBeVisible();

  // Vennen lager konto i sin egen nettleser.
  const context = await browser.newContext();
  const friendPage = await context.newPage();
  await friendPage.goto(`${page.url().split("/delt")[0]}/ny-konto`);
  await field(friendPage, "E-post").fill(friend);
  await field(friendPage, "Passord").fill(PASSWORD);
  await friendPage.getByRole("button", { name: "Lag konto" }).click();
  await expect(friendPage.getByRole("button", { name: "Logg ut" })).toBeVisible();

  // Nå virker invitasjonen, og vennen ser den under «Delt med deg».
  await page.getByRole("button", { name: "Inviter" }).click();
  await expect(page.getByText(`Invitasjonen er sendt til ${friend}.`)).toBeVisible();
  await expect(page.getByText("Venter på svar")).toBeVisible();

  await friendPage.goto("/delt");
  await friendPage.waitForLoadState("networkidle");
  const owner = accountFor(project);
  // Før invitasjonen er godtatt, er oppskriften ikke synlig.
  await expect(friendPage.getByRole("link", { name: `Se oppskriftene til ${owner}` })).toHaveCount(
    0,
  );
  await friendPage.getByRole("button", { name: `Godta invitasjonen fra ${owner}` }).click();
  await friendPage.getByRole("link", { name: `Se oppskriftene til ${owner}` }).click();
  await expect(friendPage.getByRole("heading", { name: `Oppskrifter fra ${owner}` })).toBeVisible();

  // Vennen kan se oppskriften, men ikke endre den, og kan kopiere den til sin egen samling.
  await friendPage.getByRole("link", { name: new RegExp(title) }).click();
  await expect(friendPage.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(friendPage.getByText(`Delt av ${owner}`, { exact: false })).toBeVisible();
  await expect(friendPage.getByRole("link", { name: `Rediger ${title}` })).toHaveCount(0);
  await friendPage.getByRole("button", { name: "Kopier til min samling" }).click();
  await expect(friendPage.getByText("Oppskriften er kopiert til samlingen din.")).toBeVisible();
  await friendPage.goto("/oppskrifter");
  await expect(
    friendPage.getByRole("link", { name: new RegExp(`Kopi av ${title}`) }),
  ).toBeVisible();

  // Ida avslutter delingen: oppskriften er ikke lenger synlig for vennen.
  await page.reload();
  await page.getByRole("button", { name: `Avslutt delingen med ${friend}` }).click();
  await expect(page.getByText(`Delingen med ${friend} er avsluttet.`)).toBeVisible();
  await friendPage.goto("/delt");
  await expect(friendPage.getByText("Ingen deler samlingen sin med deg ennå.")).toBeVisible();
  await context.close();
});

test("Versjon 2: handlelisten kan brukes uten nett", async ({ page, context }, testInfo) => {
  const title = `Butikk ${testInfo.project.name}`;
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill("2 dl fløte\n3 egg\n1 ss smør");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page.goto("/handleliste");
  await page.waitForLoadState("networkidle");
  await page.getByRole("checkbox", { name: title }).check();
  const list = page
    .getByRole("heading", { name: "Du må kjøpe" })
    .locator("xpath=ancestor::section");
  await expect(list.getByRole("listitem").first()).toBeVisible();
  const total = await list.getByRole("listitem").count();
  const firstItem = (await list.getByRole("listitem").first().locator("label").innerText())
    .split("\n")[0]!
    .trim();

  // Service workeren må være klar, og «Du er frakoblet»-siden lagret, før nettet går.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => caches.has("recipemate-offline-v2"))).toBe(true);

  await context.setOffline(true);
  await page.goto("/handleliste");
  await expect(page.getByRole("heading", { level: 1, name: "Du er frakoblet" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /^Handlelisten din/ })).toBeVisible();
  const offlineList = page.getByRole("region", { name: /^Handlelisten din/ });
  const offlineItems = offlineList.getByRole("listitem");
  await expect(offlineItems).toHaveCount(total);
  await expect(offlineList.getByRole("status")).toContainText(`${total} av ${total} igjen`);

  // Avkrysningen huskes, også etter at siden er lastet på nytt uten nett.
  await page.getByRole("checkbox", { name: new RegExp(`^${firstItem}`) }).check();
  await expect(offlineList.getByRole("status")).toContainText(`${total - 1} av ${total} igjen`);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: new RegExp(`^${firstItem}`) })).toBeChecked();
  await context.setOffline(false);
});

test("Versjon 2: eksport og import av oppskrifter som fil", async ({ page }, testInfo) => {
  const title = `Kopi ${testInfo.project.name}`;
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill("2 egg");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page.goto("/importer");
  await page.getByRole("link", { name: "Eksport og import" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Eksport og import" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Last ned oppskriftene" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^recipemate-oppskrifter-\d{4}-\d{2}-\d{2}\.json$/);
  const saved = testInfo.outputPath("eksport.json");
  await download.saveAs(saved);
  const backup = JSON.parse(readFileSync(saved, "utf8")) as {
    recipes: { title: string }[];
  };
  expect(backup.recipes.map((r) => r.title)).toContain(title);

  // Samme fil på nytt: alt finnes fra før.
  await page.getByLabel("Fil med oppskrifter").setInputFiles(saved);
  await page.getByRole("button", { name: "Importer oppskriftene" }).click();
  await expect(page.getByRole("status")).toContainText("0 oppskrifter ble lagt til");

  // En fil med en ny oppskrift legger den til.
  const renamed = `${title} importert`;
  backup.recipes = backup.recipes.map((r) => (r.title === title ? { ...r, title: renamed } : r));
  const edited = testInfo.outputPath("endret.json");
  writeFileSync(edited, JSON.stringify(backup));
  await page.getByLabel("Fil med oppskrifter").setInputFiles(edited);
  await page.getByRole("button", { name: "Importer oppskriftene" }).click();
  await expect(page.getByRole("status")).toContainText("1 oppskrift ble lagt til");

  // Ugyldig fil gir en melding.
  const broken = testInfo.outputPath("ugyldig.json");
  writeFileSync(broken, "ikke json");
  await page.getByLabel("Fil med oppskrifter").setInputFiles(broken);
  await page.getByRole("button", { name: "Importer oppskriftene" }).click();
  await expect(page.getByText("Filen kunne ikke leses.")).toBeVisible();

  await page.goto("/oppskrifter");
  await expect(page.getByRole("link", { name: new RegExp(renamed) })).toBeVisible();
});

test("Versjon 2: lim inn tekst blir et utkast som kan lagres", async ({ page }, testInfo) => {
  const title = `Limt ${testInfo.project.name}`;
  await page.goto("/importer");
  await page.getByRole("link", { name: "Lim inn tekst" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Lim inn oppskriften som tekst" }),
  ).toBeVisible();
  await page
    .getByLabel("Oppskriften som tekst")
    .fill(
      `${title}\n4 porsjoner\nTid: 20 min\nIngredienser\n3 dl hvetemel\n5 dl melk\nFremgangsmåte\n1. Visp alt.\n2. Stek.`,
    );
  await page.getByRole("button", { name: "Lag utkast" }).click();
  await expect(page.getByRole("heading", { name: "Sjekk utkastet" })).toBeVisible();
  await expect(field(page, "Tittel")).toHaveValue(title);
  await expect(field(page, "Antall porsjoner")).toHaveValue("4");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByText("3 dl hvetemel")).toBeVisible();
});

test("Versjon 2: statistikk viser hva som er laget oftest", async ({ page }, testInfo) => {
  const title = `Gryte ${testInfo.project.name}`;
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill("2 egg");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // «Laget i dag» tre ganger, så oppskriften havner øverst i «Laget oftest».
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Laget i dag" }).click();
    await expect(page.getByText(/laget \d+ gang/)).toBeVisible();
  }

  await page.goto("/oppskrifter");
  await page.getByRole("link", { name: "Statistikk", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Statistikk" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const mest = page.getByRole("region", { name: "Laget oftest" });
  await expect(mest.getByRole("link", { name: title })).toBeVisible();
  await expect(mest).toContainText("3 ganger");
  await expect(
    page.getByRole("region", { name: "Sist laget" }).getByRole("link", { name: title }),
  ).toBeVisible();

  await mest.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});

test("Versjon 2: tilfeldig middagsforslag", async ({ page }, testInfo) => {
  const title = `Middag ${testInfo.project.name}`;
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill("2 egg");
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Egen mappe, så mappefilteret har noe å trekke fra (Story 6.13b).
  const folder = `Middagsmappe ${testInfo.project.name}`;
  await page.getByRole("button", { name: "Lagre i mappe" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ny mappe").check();
  await dialog.getByLabel("Navn på ny mappe").fill(folder);
  await dialog.getByRole("button", { name: "Lagre", exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/oppskrifter");
  await page.getByRole("link", { name: "Middagsforslag" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Hva skal vi ha til middag?" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  // Pillene er etiketter til skjulte avkrysningsbokser; et klikk på etiketten skal slå dem på.
  await expect(page.getByRole("checkbox", { name: "Alle mapper" })).toBeChecked();
  await page
    .locator("label")
    .filter({ hasText: new RegExp(`^${folder}$`) })
    .click();
  await expect(page.getByRole("checkbox", { name: folder })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Alle mapper" })).not.toBeChecked();
  await expect(page.getByText("1 oppskrift å velge blant")).toBeVisible();

  await page.getByRole("button", { name: "Foreslå en middag" }).click();
  await expect(page.getByRole("region", { name: "Forslag" })).toContainText(title);

  // «Alle mapper» nullstiller valget.
  await page
    .locator("label")
    .filter({ hasText: /^Alle mapper$/ })
    .click();
  await expect(page.getByRole("checkbox", { name: folder })).not.toBeChecked();

  await page.getByRole("button", { name: /Foreslå en/ }).click();
  const result = page.getByRole("region", { name: "Forslag" });
  await expect(result).toBeVisible();
  await expect(page.getByRole("button", { name: "Foreslå en annen" })).toBeVisible();
  const picked = await result.getByRole("heading", { level: 2 }).innerText();
  await result.getByRole("link", { name: "Åpne oppskriften" }).click();
  await expect(page.getByRole("heading", { level: 1, name: picked })).toBeVisible();
});

test("Versjon 2: Hva kan jeg lage? ut fra det du har hjemme", async ({ page }, testInfo) => {
  const title = `Hjemme ${testInfo.project.name}`;
  const unique = `sjalottløk${testInfo.project.name.replace(/\W/g, "")}`;
  await page.goto("/ny");
  await page.waitForLoadState("networkidle");
  await field(page, "Tittel").fill(title);
  await field(page, "Antall porsjoner").fill("2");
  await field(page, "Ingredienser").fill(`2 ${unique}\n1 dl kremfløte`);
  await page.getByRole("button", { name: "Lagre oppskrift" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page.goto("/oppskrifter");
  await page.getByRole("link", { name: "Hva kan jeg lage?" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hva kan jeg lage?" })).toBeVisible();
  await expect(page.getByLabel("Legg til noe du har hjemme")).toBeVisible();

  // Ett treff: mangler én ting.
  await page.getByLabel("Legg til noe du har hjemme").fill(unique);
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  const few = page.getByRole("region", { name: "Mangler 1–2 ting" });
  await expect(few.getByRole("heading", { level: 3, name: title })).toBeVisible();
  await expect(few).toContainText("Mangler: kremfløte");

  // Begge hjemme: kan lages nå.
  await page.getByLabel("Legg til noe du har hjemme").fill("kremfløte");
  await page.getByRole("button", { name: "Legg til", exact: true }).click();
  const ready = page.getByRole("region", { name: "Kan lages nå" });
  await expect(ready.getByRole("heading", { level: 3, name: title })).toBeVisible();
  await ready.getByRole("link", { name: new RegExp(title) }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Listen er den samme som «Har hjemme» på handlelisten, og blir stående etter innlasting.
  await page.goto("/hva-kan-jeg-lage");
  await expect(page.getByRole("button", { name: `Fjern ${unique}` })).toBeVisible();
  await page.getByRole("button", { name: `Fjern ${unique}` }).click();
  await page.getByRole("button", { name: "Fjern kremfløte" }).click();
  await expect(page.getByRole("button", { name: /^Fjern / })).toHaveCount(0);
  await expect(
    page.getByText("Legg til noe du har hjemme, så dukker oppskriftene opp her."),
  ).toBeVisible();
});

test("Versjon 2: Oppskrifter kan sorteres alfabetisk og tilbake til sist lagret", async ({
  page,
}) => {
  // To egne oppskrifter, så det alltid er noe å sortere; den siste lagrede står først.
  for (const name of ["Sortering Zebra", "Sortering Ananas"]) {
    await page.goto("/ny");
    await page.waitForLoadState("networkidle");
    await field(page, "Tittel").fill(name);
    await field(page, "Antall porsjoner").fill("2");
    await field(page, "Ingredienser").fill("2 egg");
    await page.getByRole("button", { name: "Lagre oppskrift" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  }
  await page.goto("/oppskrifter");
  const titles = () => page.getByRole("heading", { level: 2 }).allTextContents();
  await expect(page.getByRole("heading", { level: 2, name: "Sortering Zebra" })).toBeVisible();
  const saved = await titles();
  expect(saved.indexOf("Sortering Ananas")).toBeLessThan(saved.indexOf("Sortering Zebra"));

  await page.getByLabel("Sorter etter").selectOption({ label: "Alfabetisk" });
  const collator = new Intl.Collator("nb", { sensitivity: "base" });
  const alpha = await titles();
  expect(alpha).toEqual([...saved].sort((a, b) => collator.compare(a, b)));
  expect(alpha.indexOf("Sortering Ananas")).toBeLessThan(alpha.indexOf("Sortering Zebra"));

  await page.getByLabel("Sorter etter").selectOption({ label: "Sist lagret" });
  expect(await titles()).toEqual(saved);
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`Tastatur i ${scheme === "light" ? "lys" : "mørk"} modus`, () => {
    test.use({ colorScheme: scheme });
    test("hele kjerneflyten kan nås med Tab, og fokus er synlig", async ({ page }, testInfo) => {
      const data = DATA[testInfo.project.name as keyof typeof DATA];
      await page.goto("/");
      await page
        .getByRole("navigation", { name: "Hovedmeny" })
        .getByRole("link", { name: "Oppskrifter" })
        .click();
      await page
        .getByRole("link", { name: new RegExp(data.uj2.title) })
        .first()
        .click();
      await expect(page.getByRole("heading", { level: 1, name: data.uj2.title })).toBeVisible();

      const reached = new Set<string>();
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const style = getComputedStyle(el);
          const outlined = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
          const shadow = style.boxShadow !== "none";
          const name = el.getAttribute("aria-label") ?? el.textContent?.trim() ?? el.tagName;
          return { name: name.slice(0, 60), visible: outlined || shadow };
        });
        if (!info) continue;
        expect(info.visible, `fokus synlig på «${info.name}»`).toBe(true);
        reached.add(info.name);
      }
      for (const name of ["Flere porsjoner", "Færre porsjoner", "Få forslag"]) {
        expect(
          [...reached].some((n) => n.includes(name)),
          `«${name}» nås med Tab`,
        ).toBe(true);
      }
    });
  });
}

test("Forsiden har snarveier, og «Hent en oppskrift» går til Importer", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Fra oppskrift på nettet til middag på bordet" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  // Innlogget: ingen innloggingsmelding. Uten konto står det øverst at man må lage konto eller logge inn.
  const guest = page.getByRole("heading", { name: "Du er ikke logget inn" });
  await expect(page.getByRole("button", { name: "Logg ut" })).toBeVisible();
  await expect(guest).toHaveCount(0);
  await page.context().clearCookies();
  await page.reload();
  await expect(guest).toBeVisible();
  await expect(page.getByRole("link", { name: "Logg inn", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Lag konto" }).first()).toBeVisible();
  const shortcuts = page.getByRole("region", { name: "Gå rett til" });
  // Seks kort pluss «Og dessuten»-raden med seks mindre sider (Story 6.18b, 6.20b).
  await expect(shortcuts.getByRole("link")).toHaveCount(12);
  await expect(page.getByRole("heading", { level: 3, name: "Og dessuten" })).toBeVisible();
  await shortcuts.getByRole("link", { name: "Middagsforslag" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Hva skal vi ha til middag?" }),
  ).toBeVisible();

  await page.goto("/");
  await shortcuts.getByRole("link", { name: /Hent en oppskrift/ }).click();
  await expect(page).toHaveURL(/\/importer$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hent en oppskrift" })).toBeVisible();
});

test("Den gamle adressen /samlingen sendes til /oppskrifter", async ({ page }) => {
  await page.goto("/samlingen");
  await expect(page).toHaveURL(/\/oppskrifter$/);
  await expect(page.getByRole("heading", { level: 1, name: "Oppskrifter" })).toBeVisible();
});
