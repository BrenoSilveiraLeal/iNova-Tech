async (page) => {
  const routes = [
    ["home", "/"],
    ["iphone", "/iphone-17-pro-max.html"],
    ["mac", "/produto.html?id=macbook-air-13"],
    ["ipad", "/produto.html?id=ipad-air-11"],
    ["airpods", "/produto.html?id=airpods-max"],
    ["watch", "/produto.html?id=watch-ultra-3"],
    ["vision", "/produto.html?id=vision-pro"]
  ];
  const badResponses = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on("response", response => {
    if (response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() });
  });
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => pageErrors.push(error.message));
  const pages = [];
  for (const [name, path] of routes) {
    const start = badResponses.length;
    await page.goto(`http://127.0.0.1:8000${path}`, { waitUntil: "domcontentloaded" });
    try { await page.locator(".site-loader").waitFor({ state: "detached", timeout: 8000 }); } catch (_) {}
    pages.push({ name, path, bad: badResponses.slice(start) });
  }
  return { pages, badResponses, consoleErrors: [...new Set(consoleErrors)], pageErrors: [...new Set(pageErrors)] };
}
