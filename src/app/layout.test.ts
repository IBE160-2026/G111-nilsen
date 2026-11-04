import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

describe("rotlayout", () => {
  it('setter språket til norsk bokmål (<html lang="nb">)', () => {
    expect(layout).toContain('<html lang="nb">');
  });
});
