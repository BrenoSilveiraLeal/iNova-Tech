/* Product page: writes the story from the catalogue, then runs the scroll-driven 3D teardown. */
(function(){
"use strict";
const S = window.STORE, brl = S.brl, P = S.get(document.body.dataset.product);
if (!P) return;
const N = P.parts.length, words = { 5: "Cinco", 6: "Seis", 7: "Sete", 8: "Oito" };
const mmTxt = v => v.toLocaleString("pt-BR");
document.title = `${P.name} · ${S.name}`;

/* ---------- stage + story markup ---------- */
document.body.insertAdjacentHTML("afterbegin", `
<div class="sheet" aria-hidden="true"></div>
<div class="dots" id="dots" aria-hidden="true"></div>
<div class="halo" id="halo" aria-hidden="true"></div>
<svg class="dial" id="dial" viewBox="-100 -100 200 200" aria-hidden="true"></svg>
<div class="giant" id="giant" aria-hidden="true"><small>${P.name}</small><span>${P.giant[0]}</span><span>${P.giant[1]}</span></div>
<canvas id="gl" aria-hidden="true"></canvas>
<div class="wash" aria-hidden="true"></div>
<svg id="leaders" aria-hidden="true"></svg>
<div class="callouts" id="callouts" aria-hidden="true"></div>
<div class="progress" id="progress"></div>
<div class="readout" id="readout" aria-hidden="true"></div>
<div class="rail" aria-hidden="true"><span id="railText"></span><span class="segs" id="railSegs"></span></div>`);

const stats = list => `<dl class="stats">${list.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join("")}</dl>`;
const main = document.getElementById("story");
main.innerHTML = `
  <section class="sec hero" id="topo" data-key="hero" data-side="left">
    <div class="card">
      <p class="eyebrow">${P.isNew ? "Lançamento · " : ""}Pronta entrega</p>
      <h1>${P.name}</h1>
      <p>${P.hero}</p>
      <p class="price-tag">A partir de<b>${brl(P.from)}</b></p>
      <div class="actions"><a class="btn" href="#comprar">Comprar</a><a class="btn ghost" href="#por-dentro">Ver por dentro</a></div>
    </div>
    <ul class="hero-specs" aria-label="Destaques">${P.highlights.map(([a, b]) => `<li>${a} <b>${b}</b></li>`).join("")}</ul>
    <div class="hint" aria-hidden="true"><i></i>Role para abrir</div>
  </section>
  <section class="sec" id="design" data-key="design" data-side="right">
    <div class="card"><p class="eyebrow">Design</p><h2>${P.design.h}</h2><p>${P.design.p}</p>
      ${stats(P.designStats)}</div>
  </section>
  <section class="sec" id="por-dentro" data-key="open" data-side="left">
    <div class="card"><p class="eyebrow">Por dentro</p><h2>Agora, vamos abrir.</h2>
      <p>${words[N] || N} camadas, de fora para dentro. Continue rolando para ver cada uma de perto.</p></div>
  </section>
  ${P.parts.map((pt, j) => `
  <section class="sec" data-key="${pt.id}" data-side="left">
    <div class="card"><p class="eyebrow">${String(j + 1).padStart(2, "0")} <span>/ ${String(N).padStart(2, "0")} · ${pt.eyebrow}</span></p>
      <h2>${pt.h}</h2><p>${pt.p}</p>${stats(pt.stats)}</div>
  </section>`).join("")}
  <section class="sec" data-key="assemble" data-side="left">
    <div class="card"><p class="eyebrow">Montado</p><h2>${P.assembleH}</h2>
      <p>${P.parts.map(x => x.eyebrow.toLowerCase()).join(", ").replace(/^./, c => c.toUpperCase())}. Lacrado de novo e pronto para entrega.</p></div>
  </section>
  <section class="sec wide" id="ficha" data-key="specs" data-side="left">
    <div class="card"><p class="eyebrow">Ficha técnica</p><h2>${P.name} em números.</h2>
      <dl class="spec-grid">${P.specs.map(([t, a, b]) => `<div><dt>${t}</dt><dd>${a}${b ? `<small>${b}</small>` : ""}</dd></div>`).join("")}</dl></div>
  </section>
  <section class="sec" id="comprar" data-key="buy" data-side="left">
    <form class="card" id="buyForm">
      <p class="eyebrow">Comprar</p>
      <h2>Escolha o seu ${P.name}.</h2>
      <div class="opt-label">Cor <b id="colorName"></b></div>
      <div class="swatches" id="swatches"></div>
      <div class="opt-label">Armazenamento</div>
      <div class="chips n${P.storage.length}" id="chips"></div>
      <div class="price"><strong id="price"></strong><span id="installments"></span></div>
      <button class="btn" type="submit">Adicionar à sacola</button>
      <ul class="perks"><li>Novo e lacrado</li><li>Nota fiscal</li><li>Garantia de 1 ano</li></ul>
      <p class="others">Outros modelos: ${S.products.filter(x => x.cat === P.cat && x.id !== P.id).map(x => `<a href="${x.url}">${x.name}</a>`).join("")}</p>
    </form>
  </section>`;

/* ---------- buy box ---------- */
let colorIdx = 0, storageIdx = 0;
const sw = document.getElementById("swatches"), ch = document.getElementById("chips");
P.colors.forEach((c, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "swatch"; b.id = "cor-" + c.id;
  b.style.setProperty("--c", c.swatch); b.setAttribute("aria-label", c.name);
  b.addEventListener("click", () => setColor(i, true)); sw.appendChild(b);
});
P.storage.forEach(([label, price], i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.id = "gb-" + i;
  b.innerHTML = `${label}<small>${brl(price)}</small>`;
  b.addEventListener("click", () => setStorage(i)); ch.appendChild(b);
});
const rgb = hex => hex.slice(1).match(/../g).map(h => parseInt(h, 16));
function setColor(i, fromUser){
  const changed = i !== colorIdx; colorIdx = i;
  [...sw.children].forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
  document.getElementById("colorName").textContent = P.colors[i].name;
  const [r, g, b] = rgb(P.colors[i].swatch), lum = (r + g + b) / 3;
  document.documentElement.style.setProperty("--halo", lum > 200 ? "200,210,230" : `${r},${g},${b}`);
  document.documentElement.style.setProperty("--accent", lum > 225 || lum < 60 ? "255,106,26" : `${r},${g},${b}`);
  if (window.__phoneColor) window.__phoneColor(P.colors[i].body);
  if (fromUser && changed){ if (window.__burst) window.__burst(sw.children[i], P.colors[i].swatch); if (window.__phoneSpin) window.__phoneSpin(); }
}
function setStorage(i){
  storageIdx = i;
  [...ch.children].forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
  const p = P.storage[i][1];
  document.getElementById("price").textContent = brl(p);
  document.getElementById("installments").textContent = "ou 12× de " + brl(Math.round(p / 12 * 100) / 100) + " sem juros";
}
setColor(0); setStorage(0);
document.getElementById("buyForm").addEventListener("submit", e => {
  e.preventDefault();
  window.Loja.add(P.id, P.colors[colorIdx].id, storageIdx);
});

/* giant words: leave a gap the width of the phone, then shrink the type until each word fits its side */
function fitGiant(){
  const gEl = document.getElementById("giant"), [w0, w1] = [...gEl.querySelectorAll(":scope > span")];
  const stacked = matchMedia("(max-width:900px) and (min-height:561px), (max-aspect-ratio:1/1)").matches;
  gEl.style.fontSize = ""; gEl.style.gridTemplateColumns = "";
  const base = parseFloat(getComputedStyle(gEl).fontSize);
  if (stacked){
    // both words on one line above the phone, shrunk to the screen width
    const total = w0.scrollWidth + w1.scrollWidth + base * .25, avail = innerWidth - 32;
    if (total > avail) gEl.style.fontSize = (base * avail / total).toFixed(1) + "px";
    return;
  }
  // both words sit left of the product (its centre and width come from the 3D layout) and above the hero copy
  const prodW = (window.__heroWpx || innerHeight * .34) * 1.1;
  const pad = innerWidth * .03, centre = window.__heroPx || innerWidth / 2;
  const availW = Math.max(0, centre - prodW / 2 - pad - innerWidth * .02);
  const card = document.querySelector(".hero .card");
  const availH = card ? card.getBoundingClientRect().top + scrollY - gEl.getBoundingClientRect().top - 24 : innerHeight * .4;
  const k = Math.min(1, availW / Math.max(w0.scrollWidth, w1.scrollWidth), availH / (base * 1.9));
  if (k < 1) gEl.style.fontSize = Math.max(28, base * k).toFixed(1) + "px";
}
window.__fitGiant = fitGiant;
document.fonts.ready.then(fitGiant);
addEventListener("resize", fitGiant);

/* dial */
(() => {
  let s = '<circle r="92" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width=".25"/><circle r="72" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width=".25"/>';
  for (let i = 0; i < 120; i++){
    const a = i / 120 * Math.PI * 2, l = i % 10 === 0 ? 6 : 2.5;
    s += `<line x1="${(Math.cos(a) * 92).toFixed(2)}" y1="${(Math.sin(a) * 92).toFixed(2)}" x2="${(Math.cos(a) * (92 - l)).toFixed(2)}" y2="${(Math.sin(a) * (92 - l)).toFixed(2)}" stroke="currentColor" stroke-opacity="${i % 10 ? .3 : .6}" stroke-width=".3"/>`;
  }
  s += '<path d="M 0 -92 A 92 92 0 0 1 92 0" fill="none" stroke="#ff6a1a" stroke-width=".7"/>';
  document.getElementById("dial").innerHTML = s;
})();

/* reveal: split headings, stagger the rest; only cards below the fold start hidden */
(() => {
  const cards = [...document.querySelectorAll(".sec .card")];
  cards.forEach(card => {
    const h = card.querySelector("h1,h2");
    if (h){
      const text = h.textContent.trim().replace(/\s+/g, " ");
      h.setAttribute("aria-label", text);
      let i = 0;
      h.innerHTML = text.split(" ").map(word => `<span class="w" aria-hidden="true">${[...word].map(c => `<span class="c" style="--i:${i++}">${c}</span>`).join("")}</span>`).join(" ");
      h.classList.add("split");
    }
    [...card.children].filter(el => el !== h).forEach((el, k) => { el.classList.add("r"); el.style.setProperty("--k", k); });
    if (card.getBoundingClientRect().top > innerHeight * .92) card.classList.add("pre");
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ e.target.classList.remove("pre"); if (window.__count) window.__count(e.target); }
    else if (e.boundingClientRect.top > innerHeight) e.target.classList.add("pre");
  }), { rootMargin: "0px 0px -10% 0px" });
  cards.forEach(c => io.observe(c));
})();

/* ---------- anime.js layer ---------- */
(() => {
  const A = window.anime;
  if (!A || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.__count = card => card.querySelectorAll(".stats dd, .price-tag b").forEach(dd => {
    if (dd.dataset.done) return; dd.dataset.done = "1";
    const txt = dd.textContent, m = txt.match(/\d[\d.]*(,\d+)?/); if (!m) return;
    const str = m[0], dec = (str.split(",")[1] || "").length, val = parseFloat(str.replace(/\./g, "").replace(",", "."));
    const o = { v: 0 };
    A({ targets: o, v: val, duration: 1600, easing: "easeOutExpo", delay: 250, update: () => { dd.textContent = txt.replace(str, o.v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec })); } });
  });
  window.__burst = (btn, color) => {
    const r = btn.getBoundingClientRect(), d = document.createElement("div");
    d.className = "burst"; d.style.left = (r.left + r.width / 2) + "px"; d.style.top = (r.top + r.height / 2) + "px"; d.style.background = color;
    document.body.appendChild(d);
    A({ targets: d, scale: [0, Math.hypot(innerWidth, innerHeight) / 9], opacity: [.4, 0], duration: 1300, easing: "easeOutExpo", complete: () => d.remove() });
  };
  const dotsEl = document.getElementById("dots"); let dots = [], cols = 0, rows = 0;
  function buildDots(){
    const gap = innerWidth < 760 ? 32 : 44;
    cols = Math.ceil(innerWidth / gap); rows = Math.ceil(innerHeight / gap);
    dotsEl.style.gridTemplateColumns = `repeat(${cols},1fr)`; dotsEl.style.gridTemplateRows = `repeat(${rows},1fr)`;
    dotsEl.innerHTML = "<i></i>".repeat(cols * rows); dots = [...dotsEl.children];
  }
  buildDots();
  A({ targets: dots, scale: [0, 1], opacity: [0, 1], delay: A.stagger(12, { grid: [cols, rows], from: "center" }), duration: 500, easing: "easeOutQuad" });
  const ripple = from => {
    A.remove(dots);
    A({ targets: dots, keyframes: [{ scale: 2.8, backgroundColor: "#ff6a1a", duration: 240 }, { scale: 1, backgroundColor: "rgba(242,239,233,.2)", duration: 1000 }],
        delay: A.stagger(28, { grid: [cols, rows], from }), easing: "easeOutSine" });
  };
  setTimeout(() => ripple("center"), 1700);
  setInterval(() => { if (scrollY < innerHeight * .6 && !document.hidden && !document.documentElement.classList.contains("lock")) ripple(Math.floor(Math.random() * dots.length)); }, 5600);
  addEventListener("pointerdown", e => {
    if (e.target.closest("a,button,input,label,select,.checkout")) return;
    const c = Math.min(cols - 1, Math.floor(e.clientX / (innerWidth / cols))), r = Math.min(rows - 1, Math.floor(e.clientY / (innerHeight / rows)));
    ripple(r * cols + c);
  });
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { A.remove(dots); buildDots(); }, 250); });
  addEventListener("scroll", () => { dotsEl.style.opacity = scrollY > innerHeight * 1.2 ? .45 : 1; }, { passive: true });
  document.querySelectorAll("#giant > span").forEach(s => { s.innerHTML = [...s.textContent].map(c => `<b class="l">${c}</b>`).join(""); });
  A.timeline({ easing: "easeOutExpo" })
    .add({ targets: "#giant .l", translateY: ["110%", "0%"], rotate: [12, 0], duration: 1500, delay: A.stagger(70), easing: "easeOutElastic(1, .65)" })
    .add({ targets: ".hero .card > *", translateY: [36, 0], opacity: [0, 1], duration: 1100, delay: A.stagger(90) }, "-=1250")
    .add({ targets: ".hero-specs li", translateX: [48, 0], opacity: [0, 1], duration: 1000, delay: A.stagger(80) }, "-=1000")
    .add({ targets: ".nav > *, .readout, .hint", opacity: [0, 1], duration: 900, delay: A.stagger(70) }, "-=900");
  window.__count(document.querySelector(".hero .card"));
  document.querySelectorAll(".btn, .swatch, .bag").forEach(b => {
    b.addEventListener("pointermove", e => {
      const r = b.getBoundingClientRect(); A.remove(b);
      A({ targets: b, translateX: (e.clientX - r.left - r.width / 2) * .3, translateY: (e.clientY - r.top - r.height / 2) * .4, duration: 300, easing: "easeOutQuad" });
    });
    b.addEventListener("pointerleave", () => { A.remove(b); A({ targets: b, translateX: 0, translateY: 0, duration: 1000, easing: "spring(1, 90, 8, 0)" }); });
  });
})();

function scramble(el, text, delay){
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%";
  const tok = el._tok = {}, t0 = performance.now() + delay, dur = 520 + text.length * 12;
  el.textContent = "";
  (function step(now){
    if (el._tok !== tok) return;
    const p = Math.min(1, Math.max(0, (now - t0) / dur)), n = Math.floor(p * text.length);
    let s = text.slice(0, n);
    for (let k = n; k < Math.min(text.length, n + 5); k++) s += text[k] === " " ? " " : glyphs[Math.floor(Math.random() * glyphs.length)];
    el.textContent = p <= 0 ? "" : s;
    if (p < 1) requestAnimationFrame(step); else el.textContent = text;
  })(performance.now());
}

/* ---------------- 3D ---------------- */
if (!window.THREE || !window.Fone3D) return;
const MODEL_URL = P.id + ".glb";        // optional real model next to the page, e.g. iphone-air.glb
const MODEL_ROT = [0, 0, 0];
const canvas = document.getElementById("gl");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, .1, 120);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

Promise.race([
  Promise.all(['600 40px "Archivo"', '500 40px "Archivo"', '500 20px "IBM Plex Mono"'].map(f => document.fonts.load(f))),
  new Promise(r => setTimeout(r, 1800))
]).then(build);

function build(){
const TAU = Math.PI * 2, { C } = Fone3D;
/* each kind of product brings its own model, layers and camera keys; iPhones use Fone3D, the rest Aparelhos3D */
let A3;
if (P.cat === "iphone"){
  const o = Fone3D.layout(P), FIT = 6.2 / o.H, F = TAU - 1.0;
  A3 = { W: o.W, H: o.H, kz: o.kz, fit: FIT, baseRx: 0, F, B: F + Math.PI, realRot: [0, 0, 0],
    keys: {
      hero:    { x: 0,    y: -.05, rx: .06, ry: -.32, rz: .04, s: FIT },
      design:  { x: -2.4, rx: .1,  ry: Math.PI - .5, rz: -.05, s: FIT },
      open:    { x: 1.7,  rx: .3,  ry: F, s: .58 * FIT, e: 1 },
      assemble:{ x: 2.3,  rx: .05, ry: 2 * TAU - .35, rz: .04, s: FIT },
      specs:   { x: 3.5,  rx: .1,  ry: 2 * TAU + .6, s: .9 * FIT, ma: .12 },
      buy:     { x: 2.7,  rx: .06, ry: 2 * TAU + Math.PI - .5, rz: -.04, s: .84 * FIT }
    },
    // same layers and callouts as the drawing, each one built as a solid part
    realParts: true,
    parts: r => { const R = Fone3D.realParts(r, P), list = Fone3D.buildParts(r, P).map(d => ({ ...d, build: g => R.builds[d.id](g) })); list.tinted = R.tinted; return list; },
    real: (r, c) => Fone3D.buildReal(r, P, c) };
} else {
  A3 = { ...Aparelhos3D.adapter(P), kz: 1, fit: 1, real: (r, c) => Aparelhos3D.realFor(r, P, c) };
}
scene.environment = Fone3D.environment(renderer);
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2724, .5));
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-5, 7, 9); scene.add(key);

const root = new THREE.Group(); scene.add(root);
// devices that sit flat (Mac, AirPods case) turn around their own upright axis (layer-space z), then tilt toward the camera
if (A3.yawZ) root.rotation.order = "XZY";
const phone = new THREE.Group(); root.add(phone);
const PAPER = C("#141416"), INK = C("#f2efe9");

/* teardown parts */
const parts = [];
const partDefs = A3.parts(renderer), sharedTinted = partDefs.tinted || [], partTinted = [];
partDefs.forEach(def => {
  const g = new THREE.Group(), inner = new THREE.Group();
  inner.scale.z = A3.kz; g.add(inner); def.build(inner);
  g.position.z = def.z0 * A3.kz; phone.add(g);
  const center = new THREE.Object3D(); center.position.set(...def.center); inner.add(center);
  const lineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 1, toneMapped: false });
  const meshes = [], lines = [], fills = [];
  inner.traverse(x => { if (x.isMesh) meshes.push(x); else if (x.isLine) lines.push(x); });
  lines.forEach(l => { l.material = lineMat; l.renderOrder = 2; });
  if (A3.realParts){
    // realistic layers: keep their own materials, cloned per layer so each can fade on its own
    const own = new Map();
    const mine = mt => {
      if (!own.has(mt)){
        const c = mt.clone(); c.userData.base = mt.opacity; c.userData.alwaysT = !!mt.userData.alwaysT; c.transparent = true;
        if (sharedTinted.includes(mt)) partTinted.push(c);
        own.set(mt, c); fills.push(c);
      }
      return own.get(mt);
    };
    meshes.forEach(m => { m.material = Array.isArray(m.material) ? m.material.map(mine) : mine(m.material); });
  } else
  meshes.forEach(m => {
    const lp = m.userData.loops;
    if (lp){
      lp.shapes.forEach((sh, si) => {
        const pts = sh.getPoints(12);
        (si === 0 ? lp.zs : [lp.zs[0], lp.zs[lp.zs.length - 1]]).forEach(z => {
          const ln = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat); ln.position.z = z; ln.renderOrder = 2; m.add(ln); lines.push(ln);
        });
      });
    } else if (!m.userData.flat){
      const ln = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), lineMat); ln.renderOrder = 2; m.add(ln); lines.push(ln);
    }
    const make = src => {
      const role = src.userData.role;
      if (role === "none"){ const n = src.clone(); n.visible = false; return n; }
      const mt = role === "flat" ? src.clone() : new THREE.MeshBasicMaterial({ color: PAPER.clone(), toneMapped: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      mt.transparent = true; fills.push(mt); return mt;
    };
    m.material = Array.isArray(m.material) ? m.material.map(make) : make(m.material);
    m.renderOrder = 1;
  });
  lines.forEach(l => l.userData.n = l.geometry.attributes.position.count);
  const callouts = def.callouts.map(c => { const x = new THREE.Object3D(); x.position.set(...c.p); inner.add(x); return { ...c, o: x }; });
  parts.push({ ...def, g, center, lineMat, fills, lines, callouts, draw: -.2 - Math.abs(parts.length - (N - 1) / 2) * .1, lastDraw: -9, wasFocus: false });
});

/* realistic closed phone (or a .glb if present) */
const bodyColor = C(P.colors[0].body);
window.__phoneColor = hex => bodyColor.copy(C(hex));
window.__phoneColor(P.colors[colorIdx].body);
let built = A3.real(renderer, P.colors[colorIdx].body);
let real = built.group, realMats = built.mats, realTinted = built.tinted, realOpaque = true;
real.rotation.set(...A3.realRot);
phone.add(real);
if (P.cat === "iphone" && THREE.GLTFLoader && location.protocol !== "file:"){
  new THREE.GLTFLoader().load(MODEL_URL, gltf => {
    const m = gltf.scene, wrap = new THREE.Group(); m.rotation.set(...MODEL_ROT); wrap.add(m);
    const bb = new THREE.Box3().setFromObject(wrap), size = bb.getSize(new THREE.Vector3()), mid = bb.getCenter(new THREE.Vector3());
    m.position.sub(mid); wrap.scale.setScalar(A3.H / Math.max(size.x, size.y, size.z));
    phone.remove(real); real = wrap; realTinted = []; realOpaque = true; realMats = [];
    wrap.traverse(x => { if (x.isMesh) (Array.isArray(x.material) ? x.material : [x.material]).forEach(mt => { mt.userData.base = mt.opacity; realMats.push(mt); }); });
    phone.add(wrap);
  }, undefined, () => {});
}

/* mobile callout lists */
parts.forEach(p => {
  const card = document.querySelector(`.sec[data-key="${p.id}"] .card`); if (!card) return;
  const ol = document.createElement("ol"); ol.className = "mlist r";
  ol.innerHTML = p.callouts.map(c => `<li><b>${c.t}</b> · ${c.d}</li>`).join("");
  card.appendChild(ol);
});

/* ---------- choreography ---------- */
const KEYS = JSON.parse(JSON.stringify(A3.keys));
KEYS.hero.g = 1;
parts.forEach((p, j) => { const v = p.view; KEYS[p.id] = { x: 1.5, rx: A3.baseRx + v.rx, ry: (v.side === "B" ? A3.B : A3.F) + v.ry, s: v.s * A3.fit, e: 1, f: j }; });
const sections = [...document.querySelectorAll("main .sec")];
let anchors = [], resolved = [], mobile = false, short = false, maxScroll = 1;
const mobileStageY = () => {
  const halfH = Math.tan(THREE.MathUtils.degToRad(15)) * camera.position.z;
  const navBottom = document.querySelector(".nav").getBoundingClientRect().bottom;
  return (1 - (navBottom + innerHeight * .52) / innerHeight) * halfH;
};
const FOCUS = () => mobile ? { x: 0, y: mobileStageY() } : { x: 1.2, y: 0 };

/* screen edges (px) of the closed product if the stage were posed at key k: [left, right, top, bottom] */
const _box = new THREE.Box3(), _v = new THREE.Vector3();
function heroExtent(k){
  const p = root.position.clone(), r = root.rotation.clone(), s = root.scale.clone();
  root.position.set(k.x, k.y, 0);
  if (A3.yawZ) root.rotation.set(k.rx, k.rz, k.ry); else root.rotation.set(k.rx, k.ry, k.rz);
  root.scale.setScalar(k.s); root.updateMatrixWorld(true); camera.updateMatrixWorld();
  _box.setFromObject(real);
  let lo = Infinity, hi = -Infinity, top = Infinity, bot = -Infinity;
  for (let c = 0; c < 8; c++){
    _v.set(c & 1 ? _box.max.x : _box.min.x, c & 2 ? _box.max.y : _box.min.y, c & 4 ? _box.max.z : _box.min.z).project(camera);
    const px = (_v.x + 1) / 2 * innerWidth, py = (1 - _v.y) / 2 * innerHeight;
    lo = Math.min(lo, px); hi = Math.max(hi, px); top = Math.min(top, py); bot = Math.max(bot, py);
  }
  root.position.copy(p); root.rotation.copy(r); root.scale.copy(s); root.updateMatrixWorld(true);
  return [lo, hi, top, bot];
}
function resolveKey(i){
  const k = Object.assign({ x: 0, y: 0, rx: 0, ry: 0, rz: 0, s: 1, e: 0, f: -1, a: 1, g: 0, tint: 1 }, KEYS[sections[i].dataset.key]);
  if (k.e) k.tint = 0;
  if (mobile){
    k.x = 0; k.y += mobileStageY(); k.s *= k.f >= 0 ? .62 : .60; if (k.ma != null) k.a = k.ma;
    if (P.cat === "iphone" && sections[i].dataset.key === "hero"){
      // Align the visible phone with the dial's centre, including its rotation.
      const halfH = Math.tan(THREE.MathUtils.degToRad(15)) * camera.position.z;
      const dialRect = document.getElementById("dial").getBoundingClientRect();
      const centreY = dialRect.top + dialRect.height / 2;
      for (let pass = 0; pass < 2; pass++){
        const [, , top, bottom] = heroExtent(k);
        k.y -= (centreY - (top + bottom) / 2) / innerHeight * 2 * halfH;
      }
    }
  }
  else if (sections[i].dataset.key === "hero"){
    const halfW = Math.tan(THREE.MathUtils.degToRad(15)) * camera.position.z * camera.aspect;
    // where the card's words actually end (its box is wider than its lines of text)
    const card = sections[i].querySelector(".card"), tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT), rg = document.createRange();
    let cardRight = card.getBoundingClientRect().left;
    while (tw.nextNode()){ if (!tw.currentNode.textContent.trim()) continue; rg.selectNodeContents(tw.currentNode); for (const r of rg.getClientRects()) cardRight = Math.max(cardRight, r.right); }
    cardRight += 32;
    // the product goes in the gap between the card's text and the spec list on the right: measured on screen, it shrinks
    // if the gap is too narrow and is pushed off the text if it overlaps; only the Mac slides left to sit right after the text
    const specs = sections[i].querySelector(".hero-specs");
    const sr = specs && specs.getClientRects().length ? specs.getBoundingClientRect() : null; // null when the list is hidden
    const L = cardRight, R = sr && sr.width ? sr.left - 28 : innerWidth - 32;
    for (let pass = 0; pass < 3; pass++){
      const [lo, hi] = heroExtent(k);
      if (hi - lo > R - L) k.s *= (R - L) / (hi - lo);
      else if (lo < L || P.type === "mac") k.x += (L - lo) / innerWidth * 2 * halfW;
    }
    const [lo, hi] = heroExtent(k);
    if (hi > R) k.x -= (hi - R) / innerWidth * 2 * halfW;
  }
  else if (sections[i].dataset.key === "buy"){
    // centre the product vertically on screen, below the menu bar
    const halfH = Math.tan(THREE.MathUtils.degToRad(15)) * camera.position.z, navH = 72;
    for (let pass = 0; pass < 2; pass++){
      const [, , top, bot] = heroExtent(k), want = (navH + innerHeight) / 2;
      k.y -= (want - (top + bot) / 2) / innerHeight * 2 * halfH;
    }
  }
  k.w = []; k.p = [];
  for (let j = 0; j < N; j++){ k.w.push(k.f < 0 || k.f === j ? 1 : 0); k.p.push(k.f === j ? 1 : 0); }
  return k;
}
function layout(){
  const w = innerWidth, h = innerHeight;
  short = h <= 560 && w >= h;
  mobile = !short && (w <= 900 || w < h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.75));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.set(0, 0, Math.max(17, 6.6 / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect)));
  camera.updateProjectionMatrix();
  maxScroll = Math.max(1, document.documentElement.scrollHeight - h);
  anchors = sections.map(s => Math.min(maxScroll, Math.max(0, s.offsetTop + s.offsetHeight / 2 - h / 2)));
  resolved = sections.map((_, i) => resolveKey(i));
  const halfW = Math.tan(THREE.MathUtils.degToRad(15)) * camera.position.z * camera.aspect;
  window.__heroPx = w / 2 * (1 + resolved[0].x / halfW);
  window.__heroWpx = A3.W * resolved[0].s / (2 * halfW) * w;
  if (window.__fitGiant) window.__fitGiant();
}
layout();
let lastW = innerWidth;
addEventListener("resize", () => { if (!mobile || innerWidth !== lastW){ lastW = innerWidth; layout(); } });

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = v => v * v * (3 - 2 * v);
const ease = v => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
const hold = v => ease(clamp01((v - .1) / .8));
const NUM = ["x", "y", "rx", "ry", "rz", "s", "e", "a", "g", "tint"], ARR = ["w", "p"];
function target(){
  const sy = scrollY; let i = 0;
  while (i < anchors.length - 1 && sy >= anchors[i + 1]) i++;
  const a = resolved[i], b = resolved[Math.min(i + 1, resolved.length - 1)];
  const span = (i + 1 < anchors.length ? anchors[i + 1] : anchors[i]) - anchors[i];
  const raw = span > 0 ? clamp01((sy - anchors[i]) / span) : 0, t = hold(raw);
  const out = { near: raw < .5 ? i : Math.min(i + 1, resolved.length - 1) };
  NUM.forEach(k => out[k] = lerp(a[k], b[k], t));
  ARR.forEach(k => out[k] = a[k].map((v, j) => lerp(v, b[k][j], t)));
  return out;
}
const state = target(); state.ry -= .9; state.rx += .25;

/* callouts */
const MAXC = 5, svgNS = "http://www.w3.org/2000/svg";
const leaders = document.getElementById("leaders"), calloutsEl = document.getElementById("callouts");
const paths = [], dots = [], labels = [], labelY = [];
for (let i = 0; i < MAXC; i++){
  const p = document.createElementNS(svgNS, "path"); p.setAttribute("pathLength", "1"); p.style.transitionDelay = (i * 90) + "ms"; leaders.appendChild(p); paths.push(p);
  const d = document.createElement("div"); d.className = "cdot"; d.innerHTML = "<span>" + (i + 1) + "</span>"; calloutsEl.appendChild(d); dots.push(d);
  const l = document.createElement("div"); l.className = "clabel"; l.style.transitionDelay = (200 + i * 90) + "ms"; calloutsEl.appendChild(l); labels.push(l);
  labelY.push(null);
}
let shownPart = -1;
function showCallouts(idx){
  shownPart = idx;
  leaders.classList.remove("on"); calloutsEl.classList.remove("on"); labelY.fill(null);
  if (idx < 0) return;
  parts[idx].callouts.forEach((c, i) => {
    labels[i].innerHTML = `<b><i>${String(i + 1).padStart(2, "0")}</i><em></em></b><span>${c.d}</span>`;
    scramble(labels[i].querySelector("em"), c.t, 220 + i * 110);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { leaders.classList.add("on"); calloutsEl.classList.add("on"); }));
}
const v3 = new THREE.Vector3();
function placeCallouts(best, strength){
  const want = best >= 0 && (strength > .7 || (shownPart === best && strength > .35)) ? best : -1;
  if (want !== shownPart) showCallouts(want);
  const vis = want >= 0 ? clamp01((strength - .35) / .4) : 0;
  leaders.style.opacity = calloutsEl.style.opacity = vis.toFixed(3);
  if (want < 0) return;
  const W2 = innerWidth, H2 = innerHeight, list = parts[want].callouts;
  const pts = list.map((c, i) => { c.o.getWorldPosition(v3).project(camera); return { i, x: (v3.x + 1) / 2 * W2, y: (1 - v3.y) / 2 * H2 }; });
  const lw = mobile ? Math.min(132, W2 * .34) : short ? 180 : 220;
  const top = mobile ? 100 : short ? 64 : 110;
  const bottom = mobile ? H2 * .49 : short ? 40 : 96;
  const colX = W2 - (mobile ? 12 : Math.max(20, W2 * .025)) - lw;
  const gap = Math.min(mobile ? 56 : 66, (H2 - top - bottom) / Math.max(1, pts.length - 1));
  const order = [...pts].sort((a, b) => a.y - b.y);
  order.forEach((p, k) => p.ly = Math.max(Math.min(Math.max(p.y, top), H2 - bottom), k ? order[k - 1].ly + gap : 0));
  for (let k = order.length - 2; k >= 0; k--) order[k].ly = Math.min(order[k].ly, order[k + 1].ly - gap);
  for (let i = 0; i < MAXC; i++){
    const p = pts[i];
    if (!p){ paths[i].setAttribute("d", ""); dots[i].style.display = labels[i].style.display = "none"; continue; }
    dots[i].style.display = labels[i].style.display = "";
    labelY[i] = labelY[i] == null ? p.ly : lerp(labelY[i], p.ly, .18);
    const ly = labelY[i];
    dots[i].style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
    labels[i].style.transform = `translate(${colX.toFixed(1)}px,${ly.toFixed(1)}px) translateY(-50%)`;
    const ex = mobile ? colX - 14 : Math.max(p.x + 30, colX - 70);
    paths[i].setAttribute("d", `M${p.x.toFixed(1)} ${p.y.toFixed(1)} L${ex.toFixed(1)} ${ly.toFixed(1)} L${(colX - 10).toFixed(1)} ${ly.toFixed(1)}`);
  }
}

/* loop */
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });
const halo = document.getElementById("halo"), footerEl = document.querySelector("footer");
const giant = document.getElementById("giant"), dial = document.getElementById("dial"), readout = document.getElementById("readout");
const railText = document.getElementById("railText"), railSegs = document.getElementById("railSegs"), progress = document.getElementById("progress");
railSegs.innerHTML = "<i></i>".repeat(N);
const segEls = [...railSegs.children];
const wc = new THREE.Vector3(), tmp = new THREE.Vector3();
const spin = { x: 0, v: 0, to: 0 };
window.__phoneSpin = () => { spin.to += TAU; };
let last = performance.now(), lastNear = -1, lastRead = "";

function frame(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const tg = target();
  const k = reduced ? 1 : 1 - Math.exp(-dt * (mobile ? 10 : 5));
  NUM.forEach(key => state[key] += (tg[key] - state[key]) * k);
  ARR.forEach(key => state[key] = state[key].map((v, j) => v + (tg[key][j] - v) * k));
  if (!reduced && !mobile){ mouse.sx += (mouse.x - mouse.sx) * .05; mouse.sy += (mouse.y - mouse.sy) * .05; }
  const t = now / 1000;
  spin.v += (spin.to - spin.x) * 38 * dt; spin.v *= Math.exp(-7.5 * dt); spin.x += spin.v * dt;
  root.position.set(state.x, state.y + (reduced ? 0 : Math.sin(t * .8) * .04), 0);
  const yaw = state.ry + mouse.sx * .09 + spin.x;
  if (A3.yawZ) root.rotation.set(state.rx + mouse.sy * .05, state.rz, yaw);
  else root.rotation.set(state.rx + mouse.sy * .05, yaw, state.rz);
  root.scale.setScalar(state.s);

  const procVis = smooth(clamp01((state.e - .04) * 2.6));
  parts.forEach((p, j) => {
    const lead = (1 - Math.abs(j - (N - 1) / 2) / ((N - 1) / 2)) * .35;
    p.g.position.z = lerp(p.z0 * A3.kz, p.zE, smooth(clamp01((state.e - lead) / .65)));
    const focusNow = tg.p[j] > .5;
    if (focusNow && !p.wasFocus) p.draw = 0;
    p.wasFocus = focusNow;
    p.draw = Math.min(1, p.draw + dt * (reduced ? 9 : mobile ? 1.2 : .6));
    if (p.draw !== p.lastDraw){ const d = ease(clamp01(p.draw)); p.lines.forEach(l => l.geometry.setDrawRange(0, Math.ceil(l.userData.n * d))); p.lastDraw = p.draw; }
    const a = state.a * procVis;
    if (A3.realParts){
      // realistic layers: the focused one solid, the rest a faint ghost so you still see where they sit
      const op = lerp(.07, 1, state.w[j]) * a;
      p.fills.forEach(m => { m.opacity = m.userData.base * op; m.depthWrite = !m.userData.alwaysT && op > .5; m.visible = op > .004; });
      return;
    }
    const fillOp = state.w[j] * a * smooth(clamp01((p.draw - .55) / .45));
    p.fills.forEach(m => { m.opacity = fillOp; m.depthWrite = fillOp > .5; m.visible = fillOp > .004; });
    p.lineMat.opacity = lerp(.1, .85, state.w[j]) * a;
    p.lineMat.visible = p.lineMat.opacity > .004;
  });
  const ra = (1 - smooth(clamp01(state.e * 2.2))) * state.a;
  const opaque = ra > .995;
  if (opaque !== realOpaque){ realOpaque = opaque; realMats.forEach(m => { if (!m.userData.alwaysT){ m.transparent = !opaque; m.needsUpdate = true; } }); }
  realMats.forEach(m => { m.opacity = m.userData.base * ra; if (!m.userData.alwaysT) m.depthWrite = ra > .5; });
  real.visible = ra > .004;
  realTinted.forEach(m => m.color.lerp(bodyColor, .08));
  partTinted.forEach(m => m.color.lerp(bodyColor, .08));

  root.updateMatrixWorld(true);
  let sum = 0; wc.set(0, 0, 0);
  parts.forEach((p, j) => { if (state.p[j] > .001){ p.center.getWorldPosition(tmp); wc.addScaledVector(tmp, state.p[j]); sum += state.p[j]; } });
  if (sum > .001){ wc.multiplyScalar(1 / sum); const f = FOCUS(), wgt = Math.min(1, sum); root.position.x += (f.x - wc.x) * wgt; root.position.y += (f.y - wc.y) * wgt; }
  const footTop = footerEl.getBoundingClientRect().top;
  if (!mobile && footTop < innerHeight) root.position.y += (innerHeight - footTop) * 2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.position.z / innerHeight;

  // Text scrolls in the lower reading area; it cannot cover the teardown stage.
  const readingTop = innerHeight * .54;
  sections.forEach(section => {
    const card = section.querySelector(".card");
    if (mobile && section.dataset.key !== "buy" && section.dataset.key !== "specs"){
      const top = card.getBoundingClientRect().top;
      card.style.clipPath = `inset(${Math.max(0, readingTop - top).toFixed(1)}px 0 0 0)`;
    } else if (card.style.clipPath) card.style.clipPath = "";
  });
  renderer.render(scene, camera);

  tmp.copy(root.position).project(camera);
  halo.style.transform = `translate(${((tmp.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - tmp.y) / 2 * innerHeight).toFixed(1)}px) scale(${(.7 + state.s * .35).toFixed(3)})`;
  halo.style.opacity = ((1 - state.e) * state.a * (.4 + .6 * state.tint)).toFixed(3);
  giant.style.opacity = (state.g * clamp01(1 - scrollY / (innerHeight * .28))).toFixed(3);
  giant.style.transform = `translateY(${(-scrollY * .55).toFixed(1)}px)`;
  dial.style.opacity = (state.g * .9).toFixed(3);
  dial.style.transform = `rotate(${(scrollY * .04 + t * 2).toFixed(2)}deg)`;

  let best = -1, bp = 0;
  state.p.forEach((v, j) => { if (v > bp){ bp = v; best = j; } });
  placeCallouts(best, bp);

  const deg = v => ((v * 180 / Math.PI) % 360 + 360) % 360;
  const read = `ROT ${deg(state.ry).toFixed(1).padStart(5, "0")}° · INCL ${deg(state.rx).toFixed(1).padStart(4, "0")}° · ZOOM ${state.s.toFixed(2)}× · ABERTURA ${Math.round(state.e * 100)}%`;
  if (read !== lastRead){ readout.textContent = read; lastRead = read; }
  if (tg.near !== lastNear){
    lastNear = tg.near;
    const kk = resolved[tg.near];
    document.body.classList.toggle("parts", kk.f >= 0);
    segEls.forEach((s, j) => { s.classList.toggle("on", j < kk.f); s.classList.toggle("now", j === kk.f); });
    if (kk.f >= 0) railText.textContent = String(kk.f + 1).padStart(2, "0") + " / " + String(N).padStart(2, "0") + " · " + parts[kk.f].callouts[0].t;
  }
  progress.style.transform = `scaleX(${clamp01(scrollY / maxScroll)})`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(t => { last = t; frame(t); });
}
})();
