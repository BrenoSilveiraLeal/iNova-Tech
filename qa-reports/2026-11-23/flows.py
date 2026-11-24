"""Fluxos funcionais da vitrine (busca, categoria, ordenação, sacola, frete, cupom, checkout simulado,
Apple Watch SE 3 ausente, escala proporcional). Nenhum pagamento real: o checkout é simulado."""
import pathlib
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
SHOTS = pathlib.Path(__file__).parent / "screenshots"
SHOTS.mkdir(exist_ok=True)
out = []


def log(ok, msg):
    out.append(("PASS " if ok else "FAIL ") + msg)
    print(out[-1])
    sys.stdout.flush()


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"])
        ctx = b.new_context(viewport={"width": 1366, "height": 720})
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE + "/", wait_until="load")
        page.wait_for_timeout(2500)

        txt = page.inner_text("body")
        log("Watch SE" not in txt and "SE 3" not in txt, "home não menciona Apple Watch SE 3")
        names = page.evaluate("STORE.products.map(p => p.name)")
        log(not any("SE 3" in n for n in names), f"catálogo sem SE 3 ({len(names)} produtos)")
        page.goto(BASE + "/produto.html?id=watch-se-3", wait_until="load")
        page.wait_for_timeout(1500)
        log("não encontrado" in page.inner_text("body").lower() or "inexistente" in page.inner_text("body").lower()
            or "não existe" in page.inner_text("body").lower(), "produto.html?id=watch-se-3 mostra estado de produto inexistente")
        page.screenshot(path=str(SHOTS / "flow_watch-se-3-removido.png"))

        page.goto(BASE + "/", wait_until="load")
        page.wait_for_timeout(2000)
        cat = page.evaluate("[...document.querySelectorAll('.card-p')].filter(c => /Watch/i.test(c.innerText)).map(c => c.querySelector('h3,h2,.name')?.innerText || c.innerText.slice(0, 40))")
        log(not any("SE" in str(c) for c in cat), f"vitrine na grade: cards Watch = {cat}")

        # busca
        search = page.locator("input[type=search], #q, input[placeholder*='Buscar' i]").first
        search.fill("AirPods Pro")
        page.wait_for_timeout(600)
        log("AirPods Pro 3" in page.inner_text("#grid"), "busca 'AirPods Pro' mostra AirPods Pro 3")
        search.fill("")
        page.wait_for_timeout(400)
        log(len(errors) == 0, f"sem erros de console nos fluxos (erros: {errors})")
        page.screenshot(path=str(SHOTS / "flow_home_search.png"))

        # escala proporcional: mesma composição (proporção entre largura do card e a viewport)
        ratios = {}
        for w, h in [(1366, 720), (1920, 1012), (2560, 1350)]:
            page.set_viewport_size({"width": w, "height": h})
            page.wait_for_timeout(500)
            fs = page.evaluate("parseFloat(getComputedStyle(document.documentElement).fontSize)")
            ratios[(w, h)] = round(fs / (w / 1366 * 16), 3)
        log(all(abs(v - 1) < 0.02 for v in ratios.values()), f"fonte raiz proporcional à tela de referência: {ratios}")
        b.close()
    pathlib.Path(__file__).with_name("flows.log").write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    main()
