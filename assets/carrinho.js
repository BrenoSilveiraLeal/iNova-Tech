/* Shared shell for every page: menu, bag, toast and the simulated checkout. The bag lives in this browser (localStorage). */
(function(){
const S = window.STORE, brl = S.brl;
const current = document.body.dataset.product || new URLSearchParams(location.search).get("id") || "";
const currentCat = (S.get(current) || {}).cat || document.body.dataset.cat || "";
const KEY = "sualoja.sacola";

/* ---------- store name in the tab title (the name comes from STORE.name in catalogo.js) ---------- */
document.title = document.title.replace(/Sua Loja|Prisma Tech/, S.name);

/* ---------- menu, search, toast, drawer markup ---------- */
const nav = document.createElement("nav");
nav.className = "nav"; nav.setAttribute("aria-label", "Principal");
// logo: the store name, first word bold
const [w1, ...wRest] = S.name.split(/\s+/);
nav.innerHTML = `<a class="store" href="index.html" aria-label="${S.name}, página inicial"><img class="mark" src="assets/favicon.svg" alt="" width="24" height="24"><span class="word"><b>${w1}</b>${wRest.length ? `<i>${wRest.join(" ")}</i>` : ""}</span></a>
  <ul>${S.categories.map(c => `<li><a href="index.html#${c.id}"${c.id === currentCat ? ' aria-current="page"' : ""}>${c.name}</a></li>`).join("")}</ul>
  <button type="button" class="bag find" id="findBtn" aria-label="Buscar produtos"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Buscar</span></button>
  <button type="button" class="bag" id="bagBtn" aria-label="Abrir sacola">Sacola <b id="bagCount" data-n="0"></b></button>`;
document.body.prepend(nav);
document.body.insertAdjacentHTML("beforeend", `
<div class="finder" id="finder" role="dialog" aria-modal="true" aria-label="Buscar produtos" hidden>
  <div class="finder-box">
    <div class="finder-field">
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <input id="findInput" type="search" placeholder="Buscar iPhone, MacBook, AirPods…" autocomplete="off" aria-label="Buscar">
      <button type="button" class="ck-close" id="findClose" aria-label="Fechar busca">×</button>
    </div>
    <p class="finder-hint" id="findHint">Sugestões</p>
    <ul class="finder-list" id="findList"></ul>
  </div>
</div>`);
document.body.insertAdjacentHTML("beforeend", `
<div class="ck-backdrop" id="ckBackdrop" hidden></div>
<aside class="checkout" id="checkout" role="dialog" aria-modal="true" aria-labelledby="ckTitle" hidden>
  <div class="ck-head">
    <div><p class="eyebrow">${S.name} · Checkout</p><h2 id="ckTitle">Sua sacola</h2></div>
    <button type="button" class="ck-close" id="ckClose" aria-label="Fechar">×</button>
  </div>
  <ol class="ck-steps" id="ckSteps"><li>Sacola</li><li>Entrega</li><li>Pagamento</li><li>Pronto</li></ol>
  <div class="ck-body" id="ckBody"></div>
  <div class="ck-foot">
    <div class="ck-total"><span>Total <small id="ckTotalNote">frete grátis</small></span><strong id="ckTotal">R$ 0</strong></div>
    <div class="ck-actions"><button type="button" class="btn ghost" id="ckPrev" hidden>Voltar</button><button type="button" class="btn" id="ckNext">Continuar</button></div>
  </div>
</aside>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`);

const toast = document.getElementById("toast"); let toastT;
const say = msg => { toast.textContent = msg; toast.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("show"), 3200); };

/* ---------- bag storage ---------- */
let bag = [];
try { bag = JSON.parse(localStorage.getItem(KEY) || "[]").filter(i => S.get(i.pid)); } catch (e) { bag = []; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) {} updateCount(); };
const countEl = document.getElementById("bagCount");
function updateCount(){
  const n = bag.reduce((a, i) => a + i.qty, 0);
  countEl.textContent = n || ""; countEl.dataset.n = n;
  if (n && window.anime) anime({ targets: countEl, scale: [1.6, 1], duration: 700, easing: "easeOutElastic(1, .5)" });
}
updateCount();
const itemInfo = i => { const p = S.get(i.pid), c = p.colors.find(x => x.id === i.color) || p.colors[0], st = p.storage[i.storage] || p.storage[0]; return { p, c, label: st[0], price: st[1] }; };

/* ---------- checkout ---------- */
const ck = { step: 0, pay: "pix", parcelas: 12, data: {}, order: "", ship: "normal", coupon: "" };
/* demo coupons and a shipping table by CEP region (first digit) — tune both freely */
const COUPONS = {
  BEMVINDO10: { label: "10% na primeira compra", off: s => Math.min(Math.round(s * .10), 500) },
  ESTUDANTE:  { label: "R$ 300 de desconto acima de R$ 5.000", off: s => s >= 5000 ? 300 : 0, min: 5000 },
  FRETEGRATIS:{ label: "Entrega expressa grátis", off: () => 0, freeExpress: true }
};
const REGIONS = [
  ["Grande São Paulo", 0, 2, 1, 24.9], ["Interior de SP", 1, 3, 1, 29.9], ["RJ e ES", 2, 4, 2, 34.9], ["Minas Gerais", 3, 4, 2, 34.9],
  ["Bahia e Sergipe", 4, 6, 3, 49.9], ["Nordeste", 5, 7, 3, 54.9], ["Norte e Centro-Oeste", 6, 8, 3, 64.9],
  ["Centro-Oeste", 7, 6, 2, 44.9], ["Paraná e SC", 8, 5, 2, 39.9], ["Rio Grande do Sul", 9, 5, 2, 39.9]
];
const cepDigits = () => (ck.data.cep || "").replace(/\D/g, "");
const region = () => { const d = cepDigits(); return d.length === 8 ? REGIONS[+d[0]] : null; };
const shipOptions = () => {
  const r = region(); if (!r) return [];
  const free = COUPONS[ck.coupon] && COUPONS[ck.coupon].freeExpress;
  return [{ id: "normal", name: "Normal", days: r[2], price: 0 }, { id: "express", name: "Expressa", days: r[3], price: free ? 0 : r[4] }];
};
const shipChoice = () => shipOptions().find(o => o.id === ck.ship) || null;
const el = id => document.getElementById(id);
const ckEl = el("checkout"), ckBack = el("ckBackdrop"), ckBody = el("ckBody"), ckNext = el("ckNext"), ckPrev = el("ckPrev");
const ckTotal = el("ckTotal"), ckTotalNote = el("ckTotalNote"), ckTitle = el("ckTitle");
const ckSteps = [...document.querySelectorAll("#ckSteps li")];
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const totals = () => {
  const sub = bag.reduce((a, i) => a + itemInfo(i).price * i.qty, 0);
  const cp = COUPONS[ck.coupon], coupon = cp ? cp.off(sub) : 0;
  const disc = ck.pay === "pix" && ck.step >= 2 ? Math.round((sub - coupon) * .05) : 0;
  const s = shipChoice(), ship = s ? s.price : 0;
  return { sub, coupon, disc, ship, shipKnown: !!s, total: Math.round((sub - coupon - disc + ship) * 100) / 100 };
};
function deliveryDate(days){
  if (days == null){ const s = shipChoice(); days = s ? s.days : 2; }
  const d = new Date(); let added = 0;
  while (added < days){ d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) added++; }
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
const shipBox = () => {
  const opts = shipOptions(), r = region();
  return `<div class="extra">
    <div class="extra-row"><div class="field" data-f="cepq"><label for="ck-cepq">Calcular frete</label><input id="ck-cepq" name="cep" value="${esc(ck.data.cep)}" inputmode="numeric" autocomplete="postal-code" placeholder="CEP 00000-000" maxlength="9"><span class="err" aria-live="polite"></span></div>
      <button type="button" class="btn ghost small" id="ckShipGo">Calcular</button></div>
    ${opts.length ? `<p class="ck-hint">Entrega para <b>${r[0]}</b></p><div class="ship-opts" role="radiogroup" aria-label="Forma de entrega">${opts.map(o => `
      <button type="button" class="ship" role="radio" aria-checked="${ck.ship === o.id}" data-ship="${o.id}">
        <span><b>${o.name}</b><small>até ${deliveryDate(o.days)}</small></span><em class="${o.price ? "" : "ok"}">${o.price ? brl(o.price) : "Grátis"}</em></button>`).join("")}</div>` : ""}
  </div>`;
};
const couponBox = () => {
  const cp = COUPONS[ck.coupon];
  return `<div class="extra">${cp
    ? `<div class="coupon-on"><span><b>${ck.coupon}</b><small>${cp.label}</small></span><button type="button" class="rm" id="ckCouponOff">Remover</button></div>`
    : `<div class="extra-row"><div class="field" data-f="cupom"><label for="ck-cupom">Cupom de desconto</label><input id="ck-cupom" name="cupom" value="${esc(ck.data.cupom)}" autocomplete="off" autocapitalize="characters" placeholder="Digite o código"><span class="err" aria-live="polite"></span></div>
      <button type="button" class="btn ghost small" id="ckCouponGo">Aplicar</button></div>
      <p class="ck-hint">Cupons de teste: BEMVINDO10, ESTUDANTE, FRETEGRATIS</p>`}</div>`;
};
const field = (id, label, attrs = "") => `
  <div class="field" data-f="${id}"><label for="ck-${id}">${label}</label>
    <input id="ck-${id}" name="${id}" value="${esc(ck.data[id])}" ${attrs}><span class="err" aria-live="polite"></span></div>`;
const lines = t => `<div class="lines">
    <div><span>Subtotal</span><b>${brl(t.sub)}</b></div>
    ${t.coupon ? `<div><span>Cupom ${ck.coupon}</span><b class="ok">− ${brl(t.coupon)}</b></div>` : ""}
    ${t.disc ? `<div><span>Desconto Pix (5%)</span><b class="ok">− ${brl(t.disc)}</b></div>` : ""}
    <div><span>Frete${t.shipKnown ? ` (${shipChoice().name.toLowerCase()})` : ""}</span>${t.shipKnown ? (t.ship ? `<b>${brl(t.ship)}</b>` : `<b class="ok">Grátis</b>`) : `<b>informe o CEP</b>`}</div></div>`;
const NOTE = `<p class="demo-note">Checkout de demonstração: nada é enviado nem cobrado. Não digite dados reais.</p>`;

const VIEWS = [
  () => {
    if (!bag.length) return `<div class="empty"><p>Sua sacola está vazia.</p><a class="btn ghost small" href="index.html">Ver os modelos</a></div>`;
    return `${NOTE}<div class="items">${bag.map((i, k) => { const f = itemInfo(i); return `
      <div class="item">
        <div class="thumb" style="--c:${f.c.swatch}" data-id="${f.p.id}" data-ci="${Math.max(0, f.p.colors.indexOf(f.c))}"><i></i></div>
        <div><b>${f.p.name}</b><small>${f.c.name} · ${f.label} · ${brl(f.price)}</small><button type="button" class="rm" data-rm="${k}">Remover</button></div>
        <div class="qty" aria-label="Quantidade"><button type="button" data-dec="${k}" aria-label="Diminuir">−</button><span>${i.qty}</span><button type="button" data-inc="${k}" aria-label="Aumentar">+</button></div>
      </div>`; }).join("")}</div>
      ${shipBox()}${couponBox()}${lines(totals())}`;
  },
  () => `${NOTE}
      ${field("nome", "Nome completo", 'autocomplete="name"')}
      ${field("email", "E-mail", 'type="email" autocomplete="email" inputmode="email"')}
      <div class="row">${field("cep", "CEP", 'inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9"')}${field("numero", "Número", 'inputmode="numeric"')}</div>
      ${field("rua", "Endereço", 'autocomplete="address-line1"')}
      <div class="row">${field("compl", "Complemento (opcional)")}${field("cidade", "Cidade / UF", 'placeholder="São Paulo / SP"')}</div>`,
  () => {
    const t = totals();
    const tabs = [["pix", "Pix", "5% off"], ["card", "Cartão", "até 12×"], ["boleto", "Boleto", "1 dia útil"]]
      .map(([id, n, s]) => `<button type="button" class="chip" data-pay="${id}" aria-pressed="${ck.pay === id}">${n}<small>${s}</small></button>`).join("");
    let panel;
    if (ck.pay === "pix") panel = `<div class="pix"><canvas id="ckQr" width="132" height="132" aria-label="QR Code de exemplo"></canvas>
        <div><p>Pague <b>${brl(t.total)}</b> pelo app do seu banco. O código expira em 30 minutos.</p><button type="button" class="btn ghost small" id="ckCopy">Copiar código Pix</button></div></div>`;
    else if (ck.pay === "card") panel = `
      ${field("cartao", "Número do cartão", 'inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" maxlength="23"')}
      ${field("titular", "Nome impresso no cartão", 'autocomplete="off"')}
      <div class="row">${field("validade", "Validade", 'inputmode="numeric" placeholder="MM/AA" maxlength="5" autocomplete="off"')}${field("cvv", "CVV", 'inputmode="numeric" maxlength="4" autocomplete="off"')}</div>
      <div class="field"><label for="ck-parcelas">Parcelas</label><select id="ck-parcelas">${
        Array.from({ length: 12 }, (_, k) => `<option value="${k + 1}"${k + 1 === ck.parcelas ? " selected" : ""}>${k + 1}× de ${brl(Math.round(t.total / (k + 1) * 100) / 100)} sem juros</option>`).join("")}</select></div>`;
    else panel = `<p>O boleto de <b>${brl(t.total)}</b> é gerado na próxima tela e vence em 1 dia útil. O pedido é liberado após a compensação.</p>`;
    return `${NOTE}<div class="pay-tabs" role="group" aria-label="Forma de pagamento">${tabs}</div>${panel}${lines(t)}`;
  },
  () => {
    const t = ck.final;
    return `<div class="done">
        <svg class="check" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="36"/><path d="M24 41 l11 11 l21 -24"/></svg>
        <h3>Pedido confirmado</h3>
        <p>Pedido <b>${ck.order}</b>. Numa loja de verdade, a confirmação iria para <b>${esc(ck.data.email)}</b>.</p></div>
      <div class="lines">${t.items.map(x => `<div><span>${x.qty}× ${x.name}</span><b>${x.desc}</b></div>`).join("")}
        ${t.coupon ? `<div><span>Cupom</span><b>${t.coupon}</b></div>` : ""}
        <div><span>Pagamento</span><b>${t.how}</b></div><div><span>Entrega ${t.shipName}</span><b>até ${t.when}</b></div><div><span>Total</span><b>${brl(t.total)}</b></div></div>`;
  }
];
const TITLES = ["Sua sacola", "Entrega", "Pagamento", "Obrigado"];

function render(dir = 1){
  const t = ck.step === 3 ? ck.final : totals();
  ckBody.innerHTML = VIEWS[ck.step]();
  ckTitle.textContent = TITLES[ck.step];
  ckSteps.forEach((li, i) => li.classList.toggle("on", i <= ck.step));
  ckTotal.textContent = brl(t.total);
  ckTotalNote.textContent = ck.pay === "card" && ck.step === 2 ? `ou ${ck.parcelas}× de ${brl(Math.round(t.total / ck.parcelas * 100) / 100)}` : ck.pay === "pix" && ck.step === 2 ? "com desconto Pix"
    : ck.step === 3 ? "" : t.shipKnown ? (t.ship ? "com frete" : "frete grátis") : "sem frete";
  ckNext.textContent = [bag.length ? "Continuar para entrega" : "Ver os modelos", "Ir para o pagamento",
    ck.pay === "pix" ? "Já fiz o Pix" : ck.pay === "boleto" ? "Gerar boleto" : `Pagar ${brl(t.total)}`, "Continuar comprando"][ck.step];
  ckPrev.hidden = ck.step === 0 || ck.step === 3;
  wire();
  if (window.anime) anime({ targets: ckBody.children, translateX: [28 * dir, 0], opacity: [0, 1], duration: 650, delay: anime.stagger(55), easing: "easeOutExpo" });
  if (ck.step === 3 && window.anime){
    const c = ckBody.querySelector(".check");
    anime.timeline({ easing: "easeOutExpo" })
      .add({ targets: c.querySelector("circle"), strokeDashoffset: [anime.setDashoffset, 0], duration: 900 })
      .add({ targets: c.querySelector("path"), strokeDashoffset: [anime.setDashoffset, 0], duration: 600 }, "-=350")
      .add({ targets: c, scale: [.85, 1], duration: 900, easing: "easeOutElastic(1, .5)" }, "-=600");
  }
}
const masks = {
  cep: v => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"),
  cartao: v => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "),
  validade: v => v.replace(/\D/g, "").slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2"),
  cvv: v => v.replace(/\D/g, "").slice(0, 4),
  numero: v => v.replace(/[^\dA-Za-z]/g, "").slice(0, 8)
};
function wire(){
  ckBody.querySelectorAll("input").forEach(inp => inp.addEventListener("input", () => {
    if (masks[inp.name]) inp.value = masks[inp.name](inp.value);
    ck.data[inp.name] = inp.value; inp.closest(".field").classList.remove("bad");
  }));
  ckBody.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => { const i = bag[+b.dataset.inc]; if (i.qty >= 3) return say("Limite de 3 unidades por modelo."); i.qty++; save(); render(0); });
  ckBody.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => { const i = bag[+b.dataset.dec]; if (i.qty > 1){ i.qty--; save(); render(0); } });
  ckBody.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { bag.splice(+b.dataset.rm, 1); save(); render(0); });
  ckBody.querySelectorAll("[data-pay]").forEach(b => b.onclick = () => { ck.pay = b.dataset.pay; render(0); });
  ckBody.querySelectorAll("[data-ship]").forEach(b => b.onclick = () => { ck.ship = b.dataset.ship; render(0); });
  const fieldErr = (k, msg) => { const f = ckBody.querySelector(`[data-f="${k}"]`); f.classList.add("bad"); f.querySelector(".err").textContent = msg; if (window.anime) anime({ targets: f, translateX: [0, -8, 8, -5, 5, 0], duration: 420, easing: "easeInOutSine" }); };
  const shipGo = el("ckShipGo"), cepq = el("ck-cepq");
  if (shipGo){
    const go = () => { if (cepDigits().length !== 8) return fieldErr("cepq", "O CEP tem 8 números."); render(0); };
    shipGo.onclick = go; cepq.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  }
  const cGo = el("ckCouponGo"), cIn = el("ck-cupom");
  if (cGo){
    const go = () => {
      const code = (cIn.value || "").trim().toUpperCase(), cp = COUPONS[code];
      if (!code) return fieldErr("cupom", "Digite um código.");
      if (!cp) return fieldErr("cupom", "Cupom inválido ou expirado.");
      if (cp.min && totals().sub < cp.min) return fieldErr("cupom", `Vale para compras acima de ${brl(cp.min)}.`);
      ck.coupon = code; if (cp.freeExpress && region()) ck.ship = "express"; say(`Cupom ${code} aplicado.`); render(0);
    };
    cGo.onclick = go; cIn.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  }
  const cOff = el("ckCouponOff"); if (cOff) cOff.onclick = () => { ck.coupon = ""; ck.data.cupom = ""; render(0); };
  const sel = el("ck-parcelas");
  if (sel) sel.onchange = () => { ck.parcelas = +sel.value; ckTotalNote.textContent = `ou ${ck.parcelas}× de ${brl(Math.round(totals().total / ck.parcelas * 100) / 100)}`; };
  ckBody.querySelectorAll(".thumb[data-id]").forEach(t => pic(S.get(t.dataset.id), +t.dataset.ci).then(r => { if (r.url){ t.style.backgroundImage = `url(${r.url})`; t.classList.add("img"); } }));
  const qr = el("ckQr"); if (qr) drawQr(qr);
  const copy = el("ckCopy");
  if (copy) copy.onclick = () => {
    const code = "00020126580014BR.GOV.BCB.PIX-DEMONSTRACAO-" + totals().total;
    try { navigator.clipboard.writeText(code).then(() => say("Código Pix de exemplo copiado."), () => say(code)); } catch (e) { say(code); }
  };
}
function drawQr(c){
  const g = c.getContext("2d"), n = 29, s = c.width / n;
  let seed = totals().total || 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = "#f2efe9"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#0c0c0d";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (r() < .48) g.fillRect(x * s, y * s, s, s);
  [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([x, y]) => {
    g.fillStyle = "#f2efe9"; g.fillRect((x - .5) * s, (y - .5) * s, 8 * s, 8 * s);
    g.fillStyle = "#0c0c0d"; g.fillRect(x * s, y * s, 7 * s, 7 * s);
    g.fillStyle = "#f2efe9"; g.fillRect((x + 1) * s, (y + 1) * s, 5 * s, 5 * s);
    g.fillStyle = "#0c0c0d"; g.fillRect((x + 2) * s, (y + 2) * s, 3 * s, 3 * s);
  });
}
const luhn = num => { let sum = 0, alt = false; for (let i = num.length - 1; i >= 0; i--){ let d = +num[i]; if (alt){ d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; } return sum % 10 === 0; };
function validate(){
  const d = ck.data, bad = [], need = (k, ok, msg) => { if (!ok) bad.push([k, msg]); };
  if (ck.step === 1){
    need("nome", (d.nome || "").trim().split(/\s+/).length >= 2, "Escreva nome e sobrenome.");
    need("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || ""), "Confira o e-mail, ex.: voce@email.com.");
    need("cep", (d.cep || "").replace(/\D/g, "").length === 8, "O CEP tem 8 números.");
    need("numero", !!(d.numero || "").trim(), "Informe o número.");
    need("rua", (d.rua || "").trim().length > 3, "Informe rua ou avenida.");
    need("cidade", (d.cidade || "").trim().length > 2, "Informe cidade e estado.");
  }
  if (ck.step === 2 && ck.pay === "card"){
    const num = (d.cartao || "").replace(/\D/g, "");
    need("cartao", num.length >= 13 && luhn(num), "Número inválido. Para testar, use 4111 1111 1111 1111.");
    need("titular", (d.titular || "").trim().length > 3, "Escreva o nome como está no cartão.");
    const [mm, aa] = (d.validade || "").split("/").map(Number);
    need("validade", mm >= 1 && mm <= 12 && aa >= 0 && new Date(2000 + aa, mm) > new Date(), "Use MM/AA com data futura.");
    need("cvv", /^\d{3,4}$/.test(d.cvv || ""), "3 ou 4 números no verso.");
  }
  ckBody.querySelectorAll(".field").forEach(f => f.classList.remove("bad"));
  bad.forEach(([k, msg]) => { const f = ckBody.querySelector(`[data-f="${k}"]`); if (f){ f.classList.add("bad"); f.querySelector(".err").textContent = msg; } });
  if (bad.length){
    const first = ckBody.querySelector(".field.bad input"); if (first) first.focus();
    if (window.anime) anime({ targets: ckBody.querySelectorAll(".field.bad"), translateX: [0, -8, 8, -5, 5, 0], duration: 420, easing: "easeInOutSine" });
  }
  return !bad.length;
}
ckNext.addEventListener("click", () => {
  if (ck.step === 3) return close();
  if (ck.step === 0 && !bag.length){ location.href = "index.html"; return; }
  if (!validate()) return;
  if (ck.step === 2){
    ckNext.disabled = true; ckNext.textContent = "Processando…";
    setTimeout(() => {
      ckNext.disabled = false;
      const t = totals();
      const s = shipChoice();
      ck.final = { total: t.total, coupon: ck.coupon, shipName: s ? s.name.toLowerCase() : "", when: deliveryDate(), how: ck.pay === "pix" ? "Pix" : ck.pay === "boleto" ? "Boleto" : `Cartão em ${ck.parcelas}×`,
        items: bag.map(i => { const f = itemInfo(i); return { qty: i.qty, name: f.p.name, desc: `${f.c.name} · ${f.label}` }; }) };
      ck.order = S.name.split(/\s+/).map(w => w[0]).join("").toUpperCase() + "-" + String(Date.now()).slice(-6);
      bag = []; save();
      ck.step = 3; render(1);
    }, 1400);
    return;
  }
  ck.step++; render(1);
});
ckPrev.addEventListener("click", () => { ck.step = Math.max(0, ck.step - 1); render(-1); });

let lastFocus = null;
function open(){
  lastFocus = document.activeElement;
  ck.step = 0;
  ckEl.hidden = ckBack.hidden = false;
  document.documentElement.classList.add("lock");
  render(1);
  if (window.anime){
    anime({ targets: ckEl, translateX: ["100%", "0%"], duration: 750, easing: "easeOutExpo" });
    anime({ targets: ckBack, opacity: [0, 1], duration: 500, easing: "linear" });
  } else { ckEl.style.transform = "none"; ckBack.style.opacity = 1; }
  el("ckClose").focus();
}
function close(){
  const done = () => { ckEl.hidden = ckBack.hidden = true; document.documentElement.classList.remove("lock"); if (lastFocus) lastFocus.focus(); };
  if (window.anime){
    anime({ targets: ckEl, translateX: ["0%", "100%"], duration: 500, easing: "easeInExpo", complete: done });
    anime({ targets: ckBack, opacity: 0, duration: 450, easing: "linear" });
  } else done();
}
el("ckClose").addEventListener("click", close);
ckBack.addEventListener("click", close);
addEventListener("keydown", e => { if (e.key === "Escape" && !ckEl.hidden) close(); });
el("bagBtn").addEventListener("click", open);

/* ---------- product pictures: a real photo from fotos/ when there is one, the 3D render otherwise ----------
   Names: fotos/<produto>-<cor>.png (or .jpg), falling back to fotos/<produto>.png. Missing files are remembered for the visit. */
const MISS = "sualoja.semfoto";
let misses = {};
try { misses = JSON.parse(sessionStorage.getItem(MISS) || "{}"); } catch (e) {}
const probe = src => new Promise(res => {
  if (misses[src]) return res("");
  const im = new Image();
  im.onload = () => res(src);
  im.onerror = () => { misses[src] = 1; try { sessionStorage.setItem(MISS, JSON.stringify(misses)); } catch (e) {} res(""); };
  im.src = src;
});
async function photo(p, ci){
  const c = p.colors[ci] || p.colors[0];
  for (const base of [`fotos/${p.id}-${c.id}`, `fotos/${p.id}`]) for (const ext of ["png", "jpg"]){ const u = await probe(`${base}.${ext}`); if (u) return u; }
  return "";
}
async function pic(p, ci = 0){
  const u = await photo(p, ci);
  if (u) return { url: u, photo: true };
  if (window.Aparelhos3D) return { url: await Aparelhos3D.thumb(p, ci), photo: false };
  return { url: "", photo: false };
}

/* ---------- search (every page) ---------- */
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const catName = id => (S.categories.find(c => c.id === id) || {}).name || "";
const catKw = id => (S.categories.find(c => c.id === id) || {}).kw || "";
const haystack = p => norm([p.name, catName(p.cat), catKw(p.cat), p.tagline, (p.highlights || []).map(h => h.join(" ")).join(" "), p.colors.map(c => c.name).join(" ")].join(" "));
function search(q){
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return S.products.filter(p => p.isNew).slice(0, 6);
  return S.products.map(p => {
    const toks = haystack(p).split(/[^a-z0-9]+/), name = norm(p.name);
    // match the start of words, so "fone" finds "fones" but not "telefone"
    if (!words.every(w => toks.some(t => t.startsWith(w)))) return null;
    return { p, score: words.reduce((a, w) => a + (name.includes(w) ? 3 : 1), 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.p);
}
const finder = el("finder"), findInput = el("findInput"), findList = el("findList"), findHint = el("findHint");
function renderFind(){
  const q = findInput.value.trim(), res = search(q);
  findHint.textContent = !q ? "Lançamentos" : res.length ? `${res.length} resultado${res.length > 1 ? "s" : ""}` : `Nada encontrado para “${q}”. Tente “iPhone”, “Mac” ou “fone”.`;
  findList.innerHTML = res.map(p => `<li><a href="${p.url}"><span class="fthumb" data-id="${p.id}" style="--c:${p.colors[0].swatch}"></span>
    <span><b>${p.name}</b><small>${catName(p.cat)} · a partir de ${brl(p.from)}</small></span></a></li>`).join("");
  findList.querySelectorAll(".fthumb").forEach(s => pic(S.get(s.dataset.id), 0).then(r => { if (r.url) s.style.backgroundImage = `url(${r.url})`; }));
  if (window.anime) anime({ targets: findList.children, opacity: [0, 1], translateY: [10, 0], duration: 500, delay: anime.stagger(35), easing: "easeOutExpo" });
}
findInput.addEventListener("input", renderFind);
findInput.addEventListener("keydown", e => { if (e.key === "Enter"){ const a = findList.querySelector("a"); if (a) location.href = a.href; } });
function openFind(){
  finder.hidden = false; document.documentElement.classList.add("lock"); findInput.value = ""; renderFind();
  if (window.anime) anime({ targets: ".finder-box", translateY: [-24, 0], opacity: [0, 1], duration: 600, easing: "easeOutExpo" });
  setTimeout(() => findInput.focus(), 30);
}
function closeFind(){ finder.hidden = true; if (ckEl.hidden) document.documentElement.classList.remove("lock"); el("findBtn").focus(); }
el("findBtn").addEventListener("click", openFind);
el("findClose").addEventListener("click", closeFind);
finder.addEventListener("click", e => { if (e.target === finder) closeFind(); });
addEventListener("keydown", e => {
  if (e.key === "Escape" && !finder.hidden) closeFind();
  if (e.key === "/" && finder.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)){ e.preventDefault(); openFind(); }
});

/* safety net: on slow phones the entrance animations can lag; after 2.5 s, jump every one to its end so nothing stays hidden */
setTimeout(() => { if (window.anime) anime.running.slice().forEach(a => { if (a.loop !== true && a.loop <= 1 && a.duration < 6000) a.seek(a.duration); }); }, 2500);

window.Loja = {
  say, open, search, openFind, pic, photo,
  add(pid, color, storage, quiet){
    const hit = bag.find(i => i.pid === pid && i.color === color && i.storage === storage);
    if (hit){ if (hit.qty < 3) hit.qty++; } else bag.push({ pid, color, storage, qty: 1 });
    save();
    if (quiet) say(`${S.get(pid).name} foi para a sacola.`); else open();
  }
};
})();
