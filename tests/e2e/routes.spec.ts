import { expect, test } from "@playwright/test";
test("child routes are independently served",async({page})=>{for(const path of ["/","/study","/finish","/words","/mistakes","/badges","/teacher"]){await page.goto(path);await expect(page.getByRole("heading").first()).toBeVisible();const html=await page.content();expect(html).not.toContain("kimi-english-learning-publish_Copy");}});
test("start today creates a persistent child session", async ({ page }) => { await page.goto("/"); await page.waitForTimeout(150); await page.evaluate(async () => { const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("kimi-word-adventure"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); const tx = db.transaction(["progress", "attempts", "sessions", "analytics"], "readwrite"); for (const name of ["progress", "attempts", "sessions", "analytics"]) tx.objectStore(name).clear(); await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close(); }); await page.reload(); await page.getByRole("button", { name: "START TODAY" }).click(); await expect(page.locator(".progress-track")).toBeVisible(); await page.reload(); await expect(page.locator(".progress-track")).toBeVisible(); });
test("primary child controls remain tappable at target viewports", async ({ page }) => { for (const viewport of [{ width: 393, height: 852 }, { width: 375, height: 667 }, { width: 430, height: 932 }, { width: 320, height: 568 }, { width: 1440, height: 900 }]) { await page.setViewportSize(viewport); await page.goto("/"); const button = page.getByRole("button", { name: /START TODAY|PRACTICE AGAIN/ }); await expect(button).toBeVisible(); expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(60); } });
test("teacher data can be read from the hidden teacher route", async ({ page }) => { await page.goto("/teacher"); await expect(page.getByRole("heading", { name: "Teacher" })).toBeVisible(); await expect(page.getByRole("heading", { name: "Weak Words" })).toBeVisible(); await expect(page.getByRole("heading", { name: "Recent 7 Days" })).toBeVisible(); });
test("answer feedback stays visible until the child continues", async ({ page }) => {
  await page.goto("/"); await page.evaluate(async () => { const request = indexedDB.deleteDatabase("kimi-word-adventure"); await new Promise<void>((resolve, reject) => { request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => resolve(); }); });
  await page.reload(); await page.getByRole("button", { name: "START TODAY" }).click(); await page.waitForTimeout(250);
  for (let guard = 0; guard < 15; guard++) { const next = page.getByRole("button", { name: "NEXT" }); if (!(await next.isVisible().catch(() => false))) break; await next.click(); await page.waitForTimeout(40); }
  await expect(page.locator(".image-answer, .word-answer").first()).toBeVisible();
  const correctIndex = await page.evaluate(async () => { const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("kimi-word-adventure"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); const tx = db.transaction("sessions", "readonly"); const request = tx.objectStore("sessions").getAll(); const sessions = await new Promise<any[]>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); db.close(); const session = sessions[0]; return session.interactions[session.currentInteractionIndex].correctOptionIndex as number; });
  const answers = page.locator(".image-answer, .word-answer");
  const wrongIndex = (correctIndex + 1) % 4;
  await answers.nth(wrongIndex).click(); await page.waitForTimeout(180);
  await expect(page.getByRole("button", { name: "CONTINUE" })).toHaveCount(0);
  await answers.nth(wrongIndex).click();
  await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible();
  await expect(page.locator(".answer-correct")).toBeVisible();
  await page.reload(); await expect(page.getByRole("button", { name: "CONTINUE" })).toBeVisible();
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await expect(page.getByRole("button", { name: "CONTINUE" })).toHaveCount(0);
});
