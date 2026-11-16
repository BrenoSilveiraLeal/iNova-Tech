async (page) => {
  const base = "http://127.0.0.1:8000";
  const results = [];
  const ready = async () => {
    try { await page.locator(".site-loader").waitFor({ state: "detached", timeout: 8000 }); } catch (_) {}
  };

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.locator("#q").fill("AirPods Pro");
  await page.waitForTimeout(250);
  const suggestionCount = await page.locator("#suggest [role=option]").count();
  const searchCount = await page.locator("#grid article").count();
  const searchNames = await page.locator("#grid article h3").allTextContents();
  await page.screenshot({ path: "qa-reports/2026-11-16/screenshots/flow__search.png", animations: "disabled" });
  if (suggestionCount < 1 || searchCount !== 1 || !searchNames[0].includes("AirPods Pro 3")) throw new Error("Search flow returned unexpected results.");
  results.push({ flow: "search", suggestions: suggestionCount, resultCount: searchCount, result: searchNames[0] });

  await page.locator("#q").fill("");
  await page.waitForTimeout(220);
  await page.locator("#fCat input[value=mac]").check();
  const categoryCount = await page.locator("#grid article").count();
  await page.locator(".sort-trigger").click();
  await page.locator('.sort-option[data-value="asc"]').click();
  const sortedNames = await page.locator("#grid article h3").allTextContents();
  await page.screenshot({ path: "qa-reports/2026-11-16/screenshots/flow__category-sort.png", animations: "disabled" });
  if (categoryCount !== 3 || sortedNames[0] !== 'MacBook Air 13"') throw new Error("Category or price sort flow returned unexpected results.");
  results.push({ flow: "category-and-sort", categoryCount, firstByAscendingPrice: sortedNames[0] });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.locator("#filtOpen").click();
  await page.waitForTimeout(500);
  const filtersOpen = await page.locator("#filters").evaluate(element => element.classList.contains("open"));
  await page.screenshot({ path: "qa-reports/2026-11-16/screenshots/flow__mobile-filters-open.png", animations: "disabled" });
  await page.locator("#filtClose").click();
  const filtersClosed = !(await page.locator("#filters").evaluate(element => element.classList.contains("open")));
  if (!filtersOpen || !filtersClosed) throw new Error("Mobile filter drawer did not open and close.");
  results.push({ flow: "mobile-filter-drawer", filtersOpen, filtersClosed });

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await ready();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const beforeReload = await page.evaluate(() => window.scrollY);
  await page.reload({ waitUntil: "domcontentloaded" });
  await ready();
  await page.waitForTimeout(60);
  const afterReload = await page.evaluate(() => window.scrollY);
  if (beforeReload <= 0 || afterReload !== 0) throw new Error(`Reload scroll position was ${afterReload}, expected 0 (before: ${beforeReload}).`);
  await page.screenshot({ path: "qa-reports/2026-11-16/screenshots/flow__reload-top.png", animations: "disabled" });
  results.push({ flow: "reload-returns-to-top", beforeReload, afterReload });

  return { results, horizontalOverflowAt375: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
}
