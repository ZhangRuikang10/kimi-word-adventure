import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

test("play-now works when opened directly from the file system", async ({ page }) => {
  const htmlPath = resolve("play-now", "play-now.html");
  test.skip(!existsSync(htmlPath), "Run pnpm build:play-now first.");

  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto(pathToFileURL(htmlPath).href);
  await expect(page.getByRole("heading", { name: "Today’s Adventure" })).toBeVisible();
  await page.getByRole("button", { name: /START TODAY|PRACTICE AGAIN/ }).click();
  await expect(page.locator(".progress-track")).toBeVisible();

  const image = page.locator("img.word-image").first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /Play/ }).first()).toBeVisible();

  await page.reload();
  await expect(page.locator(".progress-track")).toBeVisible();
  expect(browserErrors).toEqual([]);
});
