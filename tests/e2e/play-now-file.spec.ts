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

  for (let guard = 0; guard < 16 && !(await page.locator("img.word-image").count()); guard++) {
    const next = page.getByRole("button", { name: "NEXT" });
    if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(50); continue; }
    const state = await page.evaluate(async () => { const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("kimi-word-adventure"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); const tx = db.transaction("sessions", "readonly"); const request = tx.objectStore("sessions").getAll(); const sessions = await new Promise<any[]>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); db.close(); const session = sessions[0]; return session?.interactions?.[session?.currentInteractionIndex ?? 0]?.correctOptionIndex as number | undefined; });
    if (state === undefined) break;
    await page.locator(".image-answer, .word-answer").nth(state).click();
    await page.getByRole("button", { name: "CONTINUE" }).click(); await page.waitForTimeout(50);
  }
  const image = page.locator("img.word-image").first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /Play/ }).first()).toBeVisible();

  await page.reload();
  await expect(page.locator(".progress-track")).toBeVisible();
  expect(browserErrors).toEqual([]);
});
