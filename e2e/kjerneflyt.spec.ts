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
  await page.goto("/");
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
  await page.goto("/");
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
});

test("Versjon 2: ukemeny og handleliste for uka", async ({ page }) => {
  await page.goto("/oppskrifter");
  await page
    .getByRole("navigation", { name: "Hovedmeny" })
    .getByRole("link", { name: "Ukemeny" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Ukemeny" })).toBeVisible();
  await expect(page.getByText(/^Uke \d+ · /)).toBeVisible();

  // Første dag i uka: velg oppskriften med 3 porsjoner.
  const form = page.getByRole("form", { name: /^Legg til på mandag/ });
  // Søk: åpne listen og finn den første lagrede oppskriften (hvilke som er lagret avhenger av
  // tidligere tester), så skriv starten av tittelen og velg med tastaturet.
  const search = form.getByRole("combobox", { name: "Oppskrift" });
  await search.click();
  const first = form.getByRole("option").first();
  const title = ((await first.textContent()) ?? "").trim();
  expect(title).not.toBe("");
  await search.fill(title.slice(0, 6));
  await expect(form.getByRole("option", { name: title, exact: true })).toBeVisible();
  // Den første oppskriften er også først blant treffene, og er markert: Enter velger den.
  await search.press("ArrowDown");
  await search.press("ArrowUp");
  await search.press("Enter");
  await expect(search).toHaveValue(title);
  await form.getByLabel("Porsjoner").fill("3");
  await form.getByRole("button", { name: "Legg til" }).click();
  const monday = page.locator("li", {
    has: page.getByRole("heading", { level: 2, name: /^mandag/i }),
  });
  await expect(monday.getByRole("link", { name: title })).toBeVisible();
  await expect(monday.getByText("3 porsj.")).toBeVisible();

  // Lagret: står der etter ny innlasting.
  await page.reload();
  await expect(monday.getByRole("link", { name: title })).toBeVisible();
  // «Alle uker»: uka står i oversikten med retten og en lenke til handlelisten.
  await page.getByRole("link", { name: "Alle uker", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Alle uker" })).toBeVisible();
  await expect(page.getByRole("list").getByText(title, { exact: false }).first()).toBeVisible();
  await page
    .getByRole("link", { name: /^Handleliste for Uke/ })
    .first()
    .click();
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

test("Den gamle adressen /samlingen sendes til /oppskrifter", async ({ page }) => {
  await page.goto("/samlingen");
  await expect(page).toHaveURL(/\/oppskrifter$/);
  await expect(page.getByRole("heading", { level: 1, name: "Oppskrifter" })).toBeVisible();
});
