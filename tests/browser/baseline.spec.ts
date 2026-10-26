import { expect, test } from "./test";

test("loads the TypeScript canvas without browser errors", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("vim-flow");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");

  const colors = await page.locator("#world").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d")!;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const colors = new Set<string>();
    for (let offset = 0; offset < data.length; offset += 4) {
      colors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]}`);
    }
    return colors.size;
  });
  expect(colors).toBeGreaterThan(1);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("baseline.png"), fullPage: true });
});
