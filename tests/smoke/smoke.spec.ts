import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

test("new tab shell renders core surfaces", async ({ page }) => {
  await page.goto("/newtab.html");

  await expect(page.getByRole("button", { name: "Open settings menu" })).toBeVisible();
  await expect(page.getByLabel(/Search .* with/i)).toBeVisible();
  await expect(page.getByLabel("Quick links")).toBeVisible();
});

test("Search Widget edit frame wraps tabs and search bar", async ({ page }) => {
  await page.goto("/newtab.html");
  await page.getByRole("button", { name: "Turn on canvas edit mode" }).click();

  const frame = page.locator('[data-widget-id="search"]');
  const tabs = page.locator(".search-tabs");
  const searchBox = page.locator(".search-box");

  await expect(frame).toBeVisible();
  await expect(tabs).toBeVisible();
  await expect(searchBox).toBeVisible();

  const frameBox = await frame.boundingBox();
  const tabsBox = await tabs.boundingBox();
  const searchBoxBox = await searchBox.boundingBox();

  expect(frameBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  expect(searchBoxBox).not.toBeNull();
  expect(frameBox!.y).toBeLessThanOrEqual(tabsBox!.y + 1);
  expect(frameBox!.y + frameBox!.height).toBeGreaterThanOrEqual(searchBoxBox!.y + searchBoxBox!.height - 1);
});

test("settings drawer renders backup controls", async ({ page }) => {
  await page.goto("/newtab.html");
  await page.getByRole("button", { name: "Open settings menu" }).click();

  await expect(page.getByRole("heading", { name: "Theme" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Neon/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Backup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export JSON backup" })).toBeVisible();
  await expect(page.getByLabel("Import JSON backup")).toBeVisible();
});

test("wallpaper upload accepts a GIF and renders it", async ({ page }) => {
  await page.goto("/newtab.html");
  await page.getByRole("button", { name: "Open settings menu" }).click();

  const gifBase64 = "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
  await page.locator('label[aria-label="Upload wallpaper"] input[type="file"]').setInputFiles({
    name: "wallpaper.gif",
    mimeType: "image/gif",
    buffer: Buffer.from(gifBase64, "base64")
  });

  await expect(page.getByText("Wallpaper saved.")).toBeVisible();
  await expect(page.locator(".wallpaper-media")).toBeVisible();
});
