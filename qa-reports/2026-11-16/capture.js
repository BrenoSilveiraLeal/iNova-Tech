async (page) => {
  const base = "http://127.0.0.1:8000";
  const sizes = [
    [375, 812], [430, 932], [768, 1024], [1366, 768],
    [1536, 864], [1920, 1080], [3840, 2160]
  ];
  const routes = [
    ["home", "/"],
    ["iphone-17", "/iphone-17.html"],
    ["iphone-air", "/iphone-air.html"],
    ["iphone-17-pro", "/iphone-17-pro.html"],
    ["iphone-17-pro-max", "/iphone-17-pro-max.html"],
    ["macbook-air-13", "/produto.html?id=macbook-air-13"],
    ["macbook-air-15", "/produto.html?id=macbook-air-15"],
    ["macbook-pro-14", "/produto.html?id=macbook-pro-14"],
    ["ipad", "/produto.html?id=ipad"],
    ["ipad-air-11", "/produto.html?id=ipad-air-11"],
    ["ipad-pro-11", "/produto.html?id=ipad-pro-11"],
    ["airpods-4", "/produto.html?id=airpods-4"],
    ["airpods-pro-3", "/produto.html?id=airpods-pro-3"],
    ["airpods-max", "/produto.html?id=airpods-max"],
    ["watch-se-3", "/produto.html?id=watch-se-3"],
    ["watch-series-11", "/produto.html?id=watch-series-11"],
    ["watch-ultra-3", "/produto.html?id=watch-ultra-3"],
    ["vision-pro", "/produto.html?id=vision-pro"],
    ["invalid-product", "/produto.html?id=not-a-product"]
  ];
  const responsive = new Set([
    "home", "iphone-17-pro-max", "macbook-air-13", "ipad-air-11",
    "airpods-max", "watch-ultra-3", "vision-pro"
  ]);
  const errors = [];
  const failed = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", request => failed.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || "failed"}`));

  const results = [];
  for (const [name, route] of routes) {
    const viewports = responsive.has(name) ? sizes : [sizes[3]];
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      try {
        await page.locator(".site-loader").waitFor({ state: "detached", timeout: 8000 });
      } catch (_) {}
      await page.evaluate(() => { for (const image of document.images) image.loading = "eager"; });
      if (name === "home") {
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < pageHeight; y += Math.max(420, height * 0.75)) {
          await page.evaluate(position => window.scrollTo(0, position), y);
          await page.waitForTimeout(80);
        }
      }
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(image => image.decode().catch(() => null)));
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(180);
      const metrics = await page.evaluate(() => ({
        title: document.title,
        viewport: `${innerWidth}x${innerHeight}`,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        loaderVisible: !!document.querySelector(".site-loader"),
        heading: document.querySelector("h1")?.innerText?.replace(/\s+/g, " ").trim() || "",
        brokenImages: [...document.images].filter(image => image.currentSrc && image.complete && image.naturalWidth === 0).map(image => image.currentSrc)
      }));
      const suffix = `${width}x${height}`;
      const file = `qa-reports/2026-11-16/screenshots/${name}__${suffix}${width === 1366 ? "__full" : ""}.png`;
      await page.screenshot({ path: file, fullPage: width === 1366, animations: "disabled" });
      if (responsive.has(name) && name !== "home" && width === 1366) {
        const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        for (const [label, ratio] of [["mid", 0.5], ["end", 0.9]]) {
          await page.evaluate(position => window.scrollTo(0, position), Math.round(maxScroll * ratio));
          await page.waitForTimeout(180);
          await page.screenshot({
            path: `qa-reports/2026-11-16/screenshots/${name}__1366x768__scroll-${label}.png`,
            animations: "disabled"
          });
        }
      }
      results.push({ route: name, path: route, status: response?.status() ?? null, ...metrics, screenshot: file });
    }
  }
  return { results, consoleErrors: errors, failedRequests: failed };
}
