import { expect, test, type Page } from "@playwright/test";

/**
 * Kjerneflyten fra PRD (UJ-1, UJ-2, UJ-3) gjennom ekte nettleser, mot den bygde appen med
 * lagrede oppskriftssider (`IMPORT_SOURCE=fixtures`), eksempelforslag og en tom midlertidig
 * database. Ingen nettverkskall (NFR-2, AD-11, SM-6).
 *
 * Alle prosjektene deler databasen, så hvert prosjekt bruker egne oppskrifter og mapper.
 * `mobil-360` følger PRD-eksemplene nærmest (4 til 5 personer).
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
  const input = page.getByLabel("Antall personer", { exact: true });
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

test.describe.configure({ mode: "serial" });

test("UJ-1: importer, skaler til ett flere, lagre i mappe og gjør til favoritt", async ({
  page,
}, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  const { uj1 } = data;

  await importRecipe(page, uj1.url, uj1.title);
  await expect(page.getByLabel("Antall personer", { exact: true })).toHaveValue(
    String(uj1.original),
  );
  const before = await ingredientsText(page);

  await page.getByRole("button", { name: "Flere personer" }).click();
  await expect(page.getByLabel("Antall personer", { exact: true })).toHaveValue(
    String(uj1.original + 1),
  );
  expect(await ingredientsText(page)).not.toBe(before);

  await saveInNewFolder(page, data.folders.uj1);
  await page.getByRole("button", { name: `Favoritt: ${uj1.title}` }).click();
  await expect(page.getByRole("button", { name: `Favoritt: ${uj1.title}` })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("UJ-2: forslag tas i bruk og huskes; oversiktsside gir melding", async ({
  page,
}, testInfo) => {
  const data = DATA[testInfo.project.name as keyof typeof DATA];
  const { uj2 } = data;

  await importRecipe(page, uj2.url, uj2.title);
  await setServings(page, 5);

  await page.getByRole("button", { name: "Få forslag" }).click();
  await expect(page.getByText("Eksempelforslag", { exact: true })).toBeVisible();
  const group = page.getByRole("group");
  await expect(group.first()).toBeVisible();
  const count = await group.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);

  const ingredientsBefore = await ingredientsText(page);
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
  expect(await ingredientsText(page)).toBe(ingredientsBefore);

  await saveInNewFolder(page, data.folders.uj2);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dine valgte forslag" })).toBeVisible();
  await expect(page.getByText("Tatt i bruk", { exact: true })).toBeVisible();

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
  await expect(page.getByLabel("Antall personer", { exact: true })).toHaveValue(
    String(uj1.original + 1),
  );
  await setServings(page, 3);
  await expect(page.getByLabel("Antall personer", { exact: true })).toHaveValue("3");
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
  await expect(page.getByLabel("Antall personer", { exact: true })).toHaveValue("4,5");

  await page.getByRole("button", { name: /^Åpne kokemodus/ }).click();
  const cooking = page.getByRole("dialog", { name: /^Kokemodus/ });
  await expect(cooking.getByText(/^Steg 1 av \d+$/)).toBeVisible();
  await expect(cooking.getByText("Ingredienser for 4,5 personer")).toBeVisible();
  await cooking.getByRole("button", { name: "Neste" }).click();
  await expect(cooking.getByText(/^Steg 2 av \d+$/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(cooking).toBeHidden();
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
      for (const name of ["Flere personer", "Færre personer", "Få forslag"]) {
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
