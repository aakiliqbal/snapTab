import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

test("new tab shell renders core surfaces", async ({ page }) => {
  await page.goto("/newtab.html");

  await expect(page.getByRole("button", { name: "Open settings menu" })).toBeVisible();
  await expect(page.getByLabel(/Search .* with/i)).toBeVisible();
  await expect(page.getByLabel("Quick links")).toBeVisible();
});

test("shortcut click launches destination without navigating extension document", async ({ page }) => {
  await page.addInitScript(() => {
    const openedTabs: Array<{ url?: string; active?: boolean }> = [];
    const removedTabs: number[] = [];
    Object.assign(window, { __openedTabs: openedTabs, __removedTabs: removedTabs });
    Object.assign(window, {
      chrome: {
        runtime: {},
        tabs: {
          create: (properties: { url?: string; active?: boolean }, callback?: (tab: { id: number }) => void) => {
            openedTabs.push(properties);
            callback?.({ id: 100 });
          },
          getCurrent: (callback: (tab: { id: number }) => void) => callback({ id: 42 }),
          remove: (tabId: number) => {
            removedTabs.push(tabId);
          }
        }
      }
    });
  });

  await page.goto("/newtab.html");
  await page.locator('[data-tile-key="shortcut:docs"]').click();

  const launch = await page.evaluate(() => ({
    openedTabs: (window as unknown as { __openedTabs: Array<{ url?: string; active?: boolean }> }).__openedTabs,
    removedTabs: (window as unknown as { __removedTabs: number[] }).__removedTabs,
    location: window.location.href
  }));

  expect(launch.openedTabs).toEqual([{ url: "https://docs.google.com", active: true }]);
  expect(launch.removedTabs).toEqual([42]);
  expect(launch.location).toContain("/newtab.html");
});

test("shortcut edit opens modal without launching shortcut", async ({ page }) => {
  await page.addInitScript(() => {
    const openedTabs: Array<{ url?: string; active?: boolean }> = [];
    Object.assign(window, { __openedTabs: openedTabs });
    Object.assign(window, {
      chrome: {
        runtime: {},
        tabs: {
          create: (properties: { url?: string; active?: boolean }) => {
            openedTabs.push(properties);
          },
          getCurrent: (callback: (tab: { id: number }) => void) => callback({ id: 42 }),
          remove: () => {}
        }
      }
    });
  });

  await page.goto("/newtab.html");
  await page.getByRole("button", { name: "Edit Docs" }).click();

  await expect(page.getByRole("dialog", { name: "Edit shortcut" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __openedTabs: Array<{ url?: string; active?: boolean }> }).__openedTabs)).toEqual([]);
});

test("shortcut edit can persist a manual fallback icon", async ({ page }) => {
  await page.goto("/newtab.html");
  await page.getByRole("button", { name: "Edit Docs" }).click();
  await page.getByLabel("Icon label").fill("DX");
  await page.getByLabel("Icon color").fill("#123456");
  await page.getByRole("button", { name: "Save" }).click();

  const docsIcon = page.locator('[data-tile-key="shortcut:docs"] .quick-link-icon');
  await expect(docsIcon).toHaveText("DX");
  await expect(docsIcon).toHaveCSS("background-color", "rgb(18, 52, 86)");
});

test("folder name can be edited by double-clicking its opened title", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "snapTabState",
      JSON.stringify({ state: { schemaVersion: 2, pages: [{ id: "page-1", tileIds: ["work-folder"] }] }, version: 2 })
    );
  });
  await page.goto("/newtab.html");
  await page.locator('[data-tile-key="folder:work-folder"]').click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("heading", { name: "Work" }).dblclick();
  await page.getByLabel("Folder name").fill("Projects");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
});

test("dev root renders the New Tab Surface", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");

  await expect(page.getByRole("button", { name: "Open settings menu" })).toBeVisible();
  await expect(page.getByLabel(/Search .* with/i)).toBeVisible();
  await expect(page.getByLabel("Quick links")).toBeVisible();
  expect(pageErrors.map((error) => error.message)).toEqual([]);
});

test("root normalizes an invalid persisted search vertical", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "snapTabState",
      JSON.stringify({
        state: {
          schemaVersion: 2,
          canvas: {
            targetCellSize: 56,
            widgets: {
              search: {
                enabled: true,
                placement: { x: 10, y: 2, width: 11, height: 1, zIndex: 10 },
                settings: {
                  searchProvider: "google",
                  searchVertical: "all",
                  showProviderTabs: true,
                  showSearchMark: true,
                  opacity: 96,
                  radius: 100,
                  visual: {
                    showBackground: false,
                    backgroundColor: "#0f172a",
                    backgroundOpacity: 34,
                    showBorder: false,
                    borderColor: "#ffffff",
                    borderOpacity: 18,
                    radius: 18,
                    shadow: 18,
                    padding: 0
                  }
                }
              },
              shortcutGrid: {
                enabled: true,
                placement: { x: 10, y: 5, width: 13, height: 7, zIndex: 5 },
                settings: {
                  iconSize: 100,
                  columnSpacing: 100,
                  lineSpacing: 100,
                  showLabels: true,
                  showPageDots: true,
                  visual: {
                    showBackground: false,
                    backgroundColor: "#0f172a",
                    backgroundOpacity: 34,
                    showBorder: false,
                    borderColor: "#ffffff",
                    borderOpacity: 18,
                    radius: 18,
                    shadow: 18,
                    padding: 0
                  }
                }
              }
            }
          }
        },
        version: 2
      })
    );
  });

  await page.goto("/");

  await expect(page.getByLabel("Search Web with Google")).toBeVisible();
  expect(pageErrors.map((error) => error.message)).toEqual([]);
});

test("toolbar popup shell renders add shortcut form", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.addInitScript(() => {
    window.localStorage.setItem("snapTabState", JSON.stringify({ state: { schemaVersion: 2, themeId: "neon" }, version: 2 }));
  });

  await page.goto("/popup.html");
  await page.waitForLoadState("networkidle");

  expect(pageErrors.map((error) => error.message)).toEqual([]);

  await expect(page.locator(".popup-root")).toHaveAttribute("data-theme", "neon");
  await expect(page.getByRole("heading", { name: "Add current site" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add" })).toBeVisible();
});

test("toolbar popup dark and light themes use distinct surfaces", async ({ page }) => {
  async function getPopupSurfaceColor(themeId: "dark" | "light") {
    await page.goto("/popup.html");
    await page.evaluate((nextThemeId) => {
      window.localStorage.setItem("snapTabState", JSON.stringify({ state: { schemaVersion: 2, themeId: nextThemeId }, version: 2 }));
    }, themeId);

    await page.reload();
    await expect(page.locator(".popup-root")).toHaveAttribute("data-theme", themeId);
    return page.locator(".popup-panel").evaluate((element) => window.getComputedStyle(element).backgroundColor);
  }

  const darkSurface = await getPopupSurfaceColor("dark");
  const lightSurface = await getPopupSurfaceColor("light");

  expect(darkSurface).not.toBe(lightSurface);
  expect(darkSurface).not.toContain("255, 255, 255");
  expect(lightSurface).toContain("255, 255, 255");
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

test("Weather and Date & Time typography scale with widget size", async ({ page }) => {
  await page.route("https://api.open-meteo.com/**", (route) =>
    route.fulfill({
      json: {
        current: {
          apparent_temperature: 22,
          is_day: 1,
          precipitation: 0,
          relative_humidity_2m: 50,
          temperature_2m: 21,
          weather_code: 0,
          wind_direction_10m: 90,
          wind_speed_10m: 5
        },
        current_units: {
          precipitation: "mm",
          temperature_2m: "°C",
          wind_speed_10m: "km/h"
        }
      }
    })
  );
  await page.goto("/newtab.html");

  async function measureWidgets(size: { weatherWidth: number; weatherHeight: number; clockWidth: number; clockHeight: number }) {
    await page.evaluate((nextState) => {
      window.localStorage.setItem("snapTabState", JSON.stringify({ state: nextState, version: 2 }));
    }, buildResponsiveWidgetState(size));
    await page.goto("/newtab.html");
    await page.waitForSelector(".weather-temp-group strong");
    await page.waitForSelector(".date-time-vertical strong");

    return page.evaluate(() => {
      const weatherTemperature = document.querySelector(".weather-temp-group strong");
      const weatherIcon = document.querySelector(".weather-icon");
      const clockDigit = document.querySelector(".date-time-vertical strong");
      if (!weatherTemperature || !weatherIcon || !clockDigit) {
        throw new Error("Responsive widgets did not render.");
      }

      return {
        clockFont: parseFloat(window.getComputedStyle(clockDigit).fontSize),
        clockDigitHeadroom: clockDigit.clientWidth - clockDigit.scrollWidth,
        weatherFont: parseFloat(window.getComputedStyle(weatherTemperature).fontSize),
        weatherIconWidth: weatherIcon.getBoundingClientRect().width
      };
    });
  }

  const small = await measureWidgets({ weatherWidth: 4, weatherHeight: 3, clockWidth: 4, clockHeight: 2 });
  const large = await measureWidgets({ weatherWidth: 10, weatherHeight: 7, clockWidth: 12, clockHeight: 5 });

  expect(small.weatherIconWidth).toBeGreaterThanOrEqual(40);
  expect(large.weatherIconWidth).toBeGreaterThan(small.weatherIconWidth + 30);
  expect(large.weatherFont).toBeGreaterThan(small.weatherFont + 20);
  expect(large.clockFont).toBeGreaterThan(small.clockFont + 20);
  expect(large.clockDigitHeadroom).toBeGreaterThanOrEqual(0);
});

test("Shortcut Page transitions keep icon size stable", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "snapTabState",
      JSON.stringify({
        state: {
          schemaVersion: 2,
          canvas: {
            targetCellSize: 56,
            widgets: {
              shortcutGrid: {
                enabled: true,
                placement: { x: 9, y: 4, width: 10, height: 5, zIndex: 5 },
                settings: {
                  columnSpacing: 70,
                  iconSize: 150,
                  lineSpacing: 70,
                  showLabels: true,
                  showPageDots: true
                }
              }
            }
          },
          layout: {
            gridLayout: {
              columnSpacing: 100,
              columns: 6,
              iconSize: 100,
              lineSpacing: 100,
              mode: "custom",
              presetId: "2x6",
              rows: 2
            }
          }
        },
        version: 2
      })
    );
  });

  await page.goto("/newtab.html");
  await page.waitForSelector(".quick-link-icon");
  await page.waitForTimeout(350);

  const before = await page.locator(".quick-link-icon").first().boundingBox();
  expect(before).not.toBeNull();

  await page.locator(".shortcut-page-dots button").nth(1).click();
  const widths: number[] = [];
  for (let index = 0; index < 8; index += 1) {
    await page.waitForTimeout(30);
    const box = await page.locator(".quick-link-icon").first().boundingBox();
    if (box) {
      widths.push(box.width);
    }
  }

  expect(widths.length).toBeGreaterThan(0);
  expect(Math.max(...widths.map((width) => Math.abs(width - before!.width)))).toBeLessThanOrEqual(1);
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

function buildResponsiveWidgetState(size: { weatherWidth: number; weatherHeight: number; clockWidth: number; clockHeight: number }) {
  return {
    schemaVersion: 2,
    canvas: {
      targetCellSize: 56,
      widgets: {
        search: {
          enabled: false,
          placement: { x: 0, y: 0, width: 1, height: 1, zIndex: 1 }
        },
        shortcutGrid: {
          enabled: false,
          placement: { x: 0, y: 0, width: 1, height: 1, zIndex: 1 }
        },
        weather: {
          enabled: true,
          placement: { x: 1, y: 1, width: size.weatherWidth, height: size.weatherHeight, zIndex: 5 },
          settings: {
            displayMode: "expanded",
            latitude: 51.5072,
            locationName: "London",
            longitude: -0.1276,
            refreshMinutes: 10,
            showFeelsLike: true,
            showHumidity: true,
            showPrecipitation: true,
            showWind: true,
            units: "celsius"
          }
        },
        dateTime: {
          enabled: true,
          placement: { x: 14, y: 1, width: size.clockWidth, height: size.clockHeight, zIndex: 6 },
          settings: {
            clockMode: "verticalClock",
            dateMode: "long",
            dateOrder: "DMY",
            hourColor: "#f8fafc",
            minuteColor: "#7dd3fc",
            padDate: true,
            padHour: true,
            secondColor: "#fde68a",
            shortSeparator: "dots",
            showOrdinalDay: true,
            showSeconds: true,
            showWeekNumber: false,
            showWeekday: true,
            timeFormat: "twentyFourHour",
            timezone: "auto"
          }
        }
      }
    },
    layout: {
      gridLayout: {
        columnSpacing: 100,
        columns: 6,
        iconSize: 100,
        lineSpacing: 100,
        mode: "preset",
        presetId: "2x6",
        rows: 2
      }
    },
    pages: [{ id: "page-1", tileIds: [] }],
    tiles: {},
    wallpaper: { type: "none", value: null, mediaId: null, dim: 40, blur: 0 }
  };
}
