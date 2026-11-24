"""Rodada de QA (skill ultimate-website-qa) - Playwright para Python.

Uso: python qa-reports/2026-11-23/qa.py   (com `python -m http.server 8000` ativo na raiz)
Gera screenshots/ (ignorado pelo Git) e results.json ao lado deste arquivo.
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
OUT = pathlib.Path(__file__).parent
SHOTS = OUT / "screenshots"
SHOTS.mkdir(exist_ok=True)

SIZES = [(375, 812), (430, 932), (768, 1024), (1366, 768), (1536, 864), (1920, 1080), (3840, 2160)]
PRODUCT_IDS = ["macbook-air-13", "macbook-air-15", "macbook-pro-14", "ipad", "ipad-air-11", "ipad-pro-11",
               "airpods-4", "airpods-pro-3", "airpods-max", "watch-series-11", "watch-ultra-3", "vision-pro"]
ROUTES = [("home", "/"), ("iphone-17", "/iphone-17.html"), ("iphone-air", "/iphone-air.html"),
          ("iphone-17-pro", "/iphone-17-pro.html"), ("iphone-17-pro-max", "/iphone-17-pro-max.html")]
ROUTES += [(i, f"/produto.html?id={i}") for i in PRODUCT_IDS]
ROUTES += [("watch-se-3-removido", "/produto.html?id=watch-se-3"), ("id-invalido", "/produto.html?id=nao-existe")]
FULL_MATRIX = {"home", "iphone-17-pro-max", "macbook-air-13", "ipad-air-11", "airpods-max", "watch-ultra-3", "vision-pro"}

results, issues = [], []


def visit(browser, name, path, w, h):
    ctx = browser.new_context(viewport={"width": w, "height": h})
    page = ctx.new_page()
    errors, failed = [], []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("requestfailed", lambda r: failed.append(r.url))
    page.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 else None)
    resp = page.goto(BASE + path, wait_until="load")
    page.wait_for_timeout(2500)
    # percorre a página para ativar lazy load
    total = page.evaluate("document.documentElement.scrollHeight")
    for y in range(0, min(total, 30000), max(h // 2, 300)):
        page.evaluate(f"window.scrollTo(0,{y})")
        page.wait_for_timeout(40)
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(300)
    info = page.evaluate("""() => ({
      fs: getComputedStyle(document.documentElement).fontSize,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.currentSrc).map(i => i.currentSrc)
    })""")
    page.screenshot(path=str(SHOTS / f"{name}__{w}x{h}__initial.png"))
    row = {"route": name, "viewport": f"{w}x{h}", "status": resp.status if resp else None, "fontSize": info["fs"],
           "overflowX": info["overflowX"], "brokenImages": info["broken"], "console": errors, "failed": failed}
    ctx.close()
    results.append(row)
    return row


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        version = browser.version
        for name, path in ROUTES:
            sizes = SIZES if name in FULL_MATRIX else [(1366, 768)]
            for w, h in sizes:
                r = visit(browser, name, path, w, h)
                flag = r["overflowX"] > 1 or r["brokenImages"] or r["console"] or r["failed"]
                print(("!! " if flag else "ok ") + f"{name:22} {w}x{h} fs={r['fontSize']} ov={r['overflowX']} "
                      f"console={len(r['console'])} failed={len(r['failed'])} broken={len(r['brokenImages'])}")
                sys.stdout.flush()
        results.append({"browser": version})
        browser.close()
    (OUT / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
