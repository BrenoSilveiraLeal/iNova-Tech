/* Fone3D: builds each iPhone model in three.js — the realistic closed phone and the teardown drawing.
   Units: 163.4 mm (Pro Max height) = 6.2 units. Depth is modelled at Pro thickness and scaled by kz. */
(function(){
const TAU = Math.PI * 2, MM = 6.2 / 163.4;
const C = hex => new THREE.Color(hex).convertSRGBToLinear();
const FILL_CSS = "#141416", INK_CSS = "#f2efe9";

/* ---------- layout per model ---------- */
function layout(p){
  const H = p.mm[0] * MM, W = p.mm[1] * MM, s = W / 2.96, TOP = H / 2;
  const o = { kind: p.kind, H, W, s, TOP, R: .56 * s, kz: (p.mm[2] * MM) / .332 };
  if (p.kind === "pro"){
    o.PH = 1.9 * s;
    o.lenses = [[W/2 - .6*s, TOP - .55*s], [W/2 - .6*s, TOP - 1.35*s], [W/2 - 1.28*s, TOP - .95*s]];
    o.lr = .335 * s;
    o.flash = [-W/2 + .53*s, TOP - .55*s]; o.lidar = [-W/2 + .53*s, TOP - 1.35*s]; o.mic = [-W/2 + .53*s, TOP - .95*s];
    o.win = { w: W - .5*s, top: TOP - o.PH - .25*s, bot: -TOP + .3*s };
    o.win.h = o.win.top - o.win.bot; o.win.cy = (o.win.top + o.win.bot) / 2;
  } else if (p.kind === "air"){
    o.PH = 1.12 * s;
    o.lenses = [[W/2 - .62*s, TOP - o.PH/2]]; o.lr = .37 * s;
    o.flash = [W/2 - 1.32*s, TOP - o.PH/2 + .2*s]; o.mic = [W/2 - 1.32*s, TOP - o.PH/2 - .2*s];
  } else {
    const bw = 1.32*s, bh = 1.74*s;
    o.bump = { w: bw, h: bh, cx: W/2 - .18*s - bw/2, cy: TOP - .18*s - bh/2, r: .42*s };
    o.lenses = [[o.bump.cx + .2*s, o.bump.cy + .42*s], [o.bump.cx + .2*s, o.bump.cy - .42*s]]; o.lr = .3 * s;
    o.flash = [o.bump.cx - .36*s, o.bump.cy + .5*s]; o.mic = [o.bump.cx - .36*s, o.bump.cy];
    o.PH = bh + .36*s;
  }
  o.board = p.kind === "air" ? { w: W - .42*s, h: o.PH - .25*s, cy: TOP - o.PH/2 } : { w: W - .34*s, h: 1.8*s, cy: TOP - 1.0*s };
  const bTop = p.kind === "air" ? TOP - o.PH - .1*s : o.board.cy - o.board.h/2 - .12*s, bBot = -TOP + .55*s;
  o.batt = { w: W - .38*s, top: bTop, bot: bBot, h: bTop - bBot, cy: (bTop + bBot) / 2 };
  o.SW = W - .26*s; o.SH = H - .26*s;
  return o;
}

/* ---------- geometry helpers ---------- */
function rr(w, h, rt, rb = rt, cx = 0, cy = 0, path){
  const sh = path || new THREE.Shape(), x = cx - w/2, y = cy - h/2;
  sh.moveTo(x + rb, y); sh.lineTo(x + w - rb, y); sh.quadraticCurveTo(x + w, y, x + w, y + rb);
  sh.lineTo(x + w, y + h - rt); sh.quadraticCurveTo(x + w, y + h, x + w - rt, y + h);
  sh.lineTo(x + rt, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - rt);
  sh.lineTo(x, y + rb); sh.quadraticCurveTo(x, y, x + rb, y);
  return sh;
}
const hole = (w, h, r, cx, cy) => rr(w, h, r, r, cx, cy, new THREE.Path());
function shapeMesh(shape, d, bevel, mat, z = 0, bevelSize = bevel, zs){
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize, bevelSegments: 5, curveSegments: 24 });
  geo.translate(0, 0, -d/2);
  const m = new THREE.Mesh(geo, mat); m.position.z = z;
  m.userData.loops = { shapes: [shape, ...shape.holes], zs: zs || [-d/2 - bevel, d/2 + bevel] };
  return m;
}
function box(w, h, d, mat, x, y, z){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function cyl(r, len, mat, x, y, z, seg = 48){ const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI/2), mat); m.position.set(x, y, z); return m; }
function flat(geo, mat, x, y, z, back){ const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (back) m.rotation.y = Math.PI; m.userData.flat = true; return m; }
const LINE = new THREE.LineBasicMaterial();
function circles(g, x, y, z, radii, seg = 64){
  radii.forEach(r => {
    const pts = []; for (let i = 0; i < seg; i++){ const a = i / seg * TAU; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), LINE); l.position.set(x, y, z); g.add(l);
  });
}
function rrPath(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function blob(g, x, y, r, col){ const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

function kit(renderer){
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (w, h, draw) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; return t;
  };
  const ink = (w, h, draw) => tex(w, h, (g, cw, ch) => { g.fillStyle = FILL_CSS; g.fillRect(0, 0, cw, ch); g.strokeStyle = INK_CSS; g.fillStyle = INK_CSS; draw(g, cw, ch); });
  return { tex, ink };
}

/* studio reflections */
function environment(renderer){
  // a photo studio: dark room, big overhead softbox, two tall strip lights, a rim bar behind and a pale floor bounce
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 16, 24), new THREE.MeshBasicMaterial({ color: 0x1b1b1d, side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: 0x3c3b39 })); floor.rotation.x = -Math.PI/2; floor.position.y = -7.9; env.add(floor);
  const panel = (w, h, pos, rot, k, col = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); env.add(m); };
  panel(14, 6, [0, 7.9, 1], [Math.PI/2, 0, 0], 6);
  panel(2.4, 12, [-11.9, 1, 2], [0, Math.PI/2, 0], 5.5, 0xfff6ee);
  panel(2.4, 12, [11.9, 1, -2], [0, -Math.PI/2, 0], 3.2, 0xeef4ff);
  panel(16, 1.4, [0, 5.5, -11.9], [0, 0, 0], 4);
  panel(10, 5, [0, 0, 11.9], [0, Math.PI, 0], 1.1);
  const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(env, .035).texture; pm.dispose(); return t;
}

/* lock screen that follows the visitor's clock */
function lockScreen(renderer, o, accent){
  const { tex } = kit(renderer);
  const w = 600, h = Math.round(600 * o.SH / o.SW);
  const draw = (g) => {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "numeric", minute: "2-digit" });
    const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    g.clearRect(0, 0, w, h); g.globalAlpha = 1; g.textAlign = "left"; g.textBaseline = "alphabetic";
    g.fillStyle = FILL_CSS; g.fillRect(0, 0, w, h);
    g.save(); rrPath(g, 0, 0, w, h, 84); g.clip();
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#0d0907"); bg.addColorStop(1, "#050403");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    blob(g, w * .2, h * .58, w * 1.0, accent[0]); blob(g, w * .95, h * .78, w * .9, accent[1]);
    blob(g, w * .6, h * .3, w * .7, accent[2]); blob(g, w * .5, h * 1.05, w * .8, "rgba(255,230,210,.35)");
    g.globalAlpha = .16; g.strokeStyle = "#fff"; g.lineWidth = 1.2;
    for (let i = 0; i < 26; i++){ g.beginPath(); for (let x = 0; x <= w; x += 12){ const y = h * .45 + i * 18 + Math.sin(x / 90 + i * .35) * 40; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.globalAlpha = 1;
    g.fillStyle = "#000"; rrPath(g, w/2 - 92, 30, 184, 54, 27); g.fill();
    g.fillStyle = "#fff"; g.font = '600 26px "Archivo", sans-serif'; g.textBaseline = "middle"; g.fillText(time, 58, 58);
    for (let i = 0; i < 4; i++) g.fillRect(w - 140 + i * 8, 66 - (i + 1) * 5, 5, (i + 1) * 5);
    rrPath(g, w - 92, 46, 42, 22, 7); g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 2; g.stroke(); g.fillRect(w - 89, 49, 32, 16);
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillStyle = "rgba(255,255,255,.88)"; g.font = '500 30px "Archivo", sans-serif'; g.fillText(date, w/2, 196);
    let size = 228; g.font = `600 ${size}px "Archivo", sans-serif`;
    const fit = (w - 70) / g.measureText(time).width;
    if (fit < 1){ size = Math.floor(size * fit); g.font = `600 ${size}px "Archivo", sans-serif`; }
    g.fillStyle = "#fff"; g.fillText(time, w/2, 410);
    const glassCircle = (x, y) => { g.beginPath(); g.arc(x, y, 46, 0, TAU); g.fillStyle = "rgba(255,255,255,.16)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 1.5; g.stroke(); };
    glassCircle(100, h - 170); glassCircle(w - 100, h - 170);
    g.fillStyle = "#fff"; rrPath(g, 92, h - 190, 16, 34, 4); g.fill();
    rrPath(g, w - 120, h - 182, 40, 28, 6); g.fill(); g.fillStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.arc(w - 100, h - 168, 8, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.9)"; rrPath(g, w/2 - 80, h - 30, 160, 9, 4.5); g.fill();
    g.restore();
  };
  const t = tex(w, h, draw);
  (function tick(){ if (t._dead) return; draw(t.image.getContext("2d")); t.needsUpdate = true; setTimeout(tick, 60000 - Date.now() % 60000 + 50); })();
  return t;
}
const ACCENTS = {
  pro:  ["rgba(255,110,40,.95)", "rgba(255,160,90,.7)", "rgba(160,40,10,.6)"],
  air:  ["rgba(110,170,255,.9)", "rgba(200,225,255,.6)", "rgba(40,70,160,.6)"],
  base: ["rgba(170,140,255,.9)", "rgba(150,210,190,.6)", "rgba(80,50,160,.6)"]
};

/* ---------- realistic closed phone ---------- */
function buildReal(renderer, p, color){
  const o = layout(p), { W, H, TOP, R, s } = o;
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); inner.scale.z = o.kz;
  const col = C(color);
  const metal = p.kind === "air"
    ? new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: 1, roughness: .14, clearcoat: .6, clearcoatRoughness: .1 })
    : new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: 1, roughness: p.kind === "pro" ? .3 : .24, clearcoat: .3, clearcoatRoughness: .35 });
  const P = {
    metal,
    matte: new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: 1, roughness: .46, clearcoat: .15, clearcoatRoughness: .5 }),
    win:   new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: .85, roughness: .38, clearcoat: .9, clearcoatRoughness: .15 }),
    frost: new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: .05, roughness: .55, clearcoat: .5, clearcoatRoughness: .3 }),
    gloss: new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: .1, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }),
    black: new THREE.MeshStandardMaterial({ color: C("#08080a"), roughness: .3, metalness: .2 }),
    bezel: new THREE.MeshPhysicalMaterial({ color: C("#1a1a1d"), metalness: 1, roughness: .16, clearcoat: .7 }),
    sapphire: new THREE.MeshPhysicalMaterial({ color: C("#040508"), metalness: .25, roughness: .02, clearcoat: 1, envMapIntensity: 2.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, clearcoat: 1, transparent: true, opacity: .08, envMapIntensity: 2.4, depthWrite: false })
  };
  P.glass.userData.alwaysT = true;
  const tinted = [P.metal, P.matte, P.win, P.frost, P.gloss];
  const add = m => { inner.add(m); return m; };
  const ring = rr(W - .09*s, H - .09*s, R - .045*s); ring.holes.push(hole(W - .14*s, H - .14*s, R - .07*s, 0, 0));
  add(shapeMesh(ring, .22, .055, P.metal, 0, .045 * s));
  if (p.kind === "pro"){
    const plate = rr(W - .14*s, H - .14*s, R - .07*s); plate.holes.push(hole(o.win.w, o.win.h, .3*s, 0, o.win.cy));
    add(shapeMesh(plate, .02, .006, P.matte, -.148));
    add(shapeMesh(rr(W - .14*s, o.PH - .05*s, R - .1*s, .3*s, 0, TOP - o.PH/2 - .05*s), .03, .022, P.metal, -.188));
    add(shapeMesh(rr(o.win.w - .012, o.win.h - .012, .3*s, .3*s, 0, o.win.cy), .018, .005, P.win, -.148));
  } else {
    add(shapeMesh(rr(W - .07*s, H - .07*s, R - .035*s), .016, .005, P.frost, -.158));
    if (p.kind === "air") add(shapeMesh(rr(W - .16*s, o.PH - .1*s, R - .12*s, .32*s, 0, TOP - o.PH/2 - .04*s), .028, .02, P.metal, -.19));
    else add(shapeMesh(rr(o.bump.w, o.bump.h, o.bump.r, o.bump.r, o.bump.cx, o.bump.cy), .028, .02, P.gloss, -.19));
  }
  // front
  add(shapeMesh(rr(W - .14*s, H - .14*s, R - .07*s), .02, 0, P.black, .124));
  add(flat(new THREE.PlaneGeometry(o.SW, o.SH), new THREE.MeshBasicMaterial({ map: lockScreen(renderer, o, ACCENTS[p.kind]), toneMapped: false }), 0, 0, .137));
  add(shapeMesh(rr(W - .05*s, H - .05*s, R - .03*s), .012, .009, P.glass, .164));
  // sides and bottom
  const sx = W / 2 + .004;
  add(box(.05, .75*s, .1, P.metal, sx, TOP - 1.65*s, 0));
  add(box(.035, .52*s, .085, P.sapphire, sx, -.75*s, 0));
  add(box(.05, .3*s, .1, P.metal, -sx, TOP - 1.15*s, 0));
  add(box(.05, .45*s, .1, P.metal, -sx, TOP - 1.75*s, 0));
  add(box(.05, .45*s, .1, P.metal, -sx, TOP - 2.32*s, 0));
  add(box(.42*s, .06, .1, P.black, 0, -TOP - .005, 0));
  for (let i = 0; i < 6; i++){ add(box(.035, .03, .035, P.black, (.55 + i * .085) * s, -TOP - .004, 0)); add(box(.035, .03, .035, P.black, -(.55 + i * .085) * s, -TOP - .004, 0)); }
  // cameras
  const zFace = -.3066;
  const elem = (geo, c, x, y, dz) => add(flat(geo, new THREE.MeshStandardMaterial({ color: C(c), roughness: .22, metalness: .7 }), x, y, zFace - dz, true));
  if (p.kind === "base"){
    const pill = rr(.76*s, 1.56*s, .38*s, .38*s, o.lenses[0][0], o.bump.cy);
    add(shapeMesh(pill, .02, .01, P.black, -.215));
  }
  o.lenses.forEach(([x, y]) => {
    const r = o.lr;
    add(cyl(r * 1.05, .07, p.kind === "base" ? P.bezel : P.metal, x, y, -.25));
    add(cyl(r * .94, .1, P.bezel, x, y, -.255));
    add(cyl(r * .81, .102, P.sapphire, x, y, -.255));
    elem(new THREE.RingGeometry(r * .5, r * .76, 64), "#101116", x, y, .0004);
    elem(new THREE.RingGeometry(r * .3, r * .5, 64), "#181a22", x, y, .0006);
    elem(new THREE.CircleGeometry(r * .3, 48), "#06070c", x, y, .0008);
    const coat = new THREE.MeshBasicMaterial({ color: 0x3b2f6e, transparent: true, opacity: .45 }); coat.userData.alwaysT = true;
    add(flat(new THREE.RingGeometry(r * .15, r * .19, 48), coat, x, y, zFace - .001, true));
    const glint = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .22 }); glint.userData.alwaysT = true;
    add(flat(new THREE.CircleGeometry(r * .1, 20), glint, x - r * .3, y + r * .33, zFace - .0012, true));
  });
  add(cyl(.115 * s, .02, P.bezel, o.flash[0], o.flash[1], -.232, 40));
  add(flat(new THREE.CircleGeometry(.09 * s, 32), new THREE.MeshStandardMaterial({ color: C("#e9dfc6"), roughness: .3, emissive: C("#2a2416") }), o.flash[0], o.flash[1], -.2425, true));
  if (o.lidar) add(cyl(.105 * s, .03, P.sapphire, o.lidar[0], o.lidar[1], -.236, 40));
  add(flat(new THREE.CircleGeometry(.026 * s, 16), P.black, o.mic[0], o.mic[1], -.2275, true));
  const mats = [];
  g.traverse(m => { if (!m.isMesh) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if (!mats.includes(x)){ x.userData.base = x.opacity; mats.push(x); } }); });
  return { group: g, mats, tinted, layout: o };
}

/* ---------- teardown drawing ---------- */
function buildParts(renderer, p){
  const o = layout(p), { W, H, TOP, R, s } = o, { tex, ink } = kit(renderer);
  let seed = 1702; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const FILL = new THREE.MeshBasicMaterial(), NOFILL = new THREE.MeshBasicMaterial(); NOFILL.userData.role = "none";
  const inkMat = t => { const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); m.userData.role = "flat"; return m; };
  const lid = (title, sub) => inkMat(ink(256, 256, (g, w, h) => {
    g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16);
    g.textAlign = "center"; g.font = '600 50px "Archivo", sans-serif'; g.fillText(title, w/2, h * .54);
    g.font = '500 17px "IBM Plex Mono", monospace'; g.fillStyle = "#8f8b84"; g.fillText(sub, w/2, h * .74);
    g.beginPath(); g.arc(30, 30, 7, 0, TAU); g.fillStyle = INK_CSS; g.fill();
  }));
  const pcb = ink(900, 590, (g, w, h) => {
    g.globalAlpha = .55; g.lineWidth = 1.4; g.lineCap = "round";
    for (let i = 0; i < 140; i++){ let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++){ rnd() < .5 ? x += (rnd() - .5) * 180 : y += (rnd() - .5) * 130; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = .8; for (let i = 0; i < 260; i++){ g.beginPath(); g.arc(rnd() * w, rnd() * h, 2.2, 0, TAU); g.stroke(); }
    g.globalAlpha = 1; g.lineWidth = 2; rrPath(g, 8, 8, w - 16, h - 16, 26); g.stroke();
    g.font = '500 16px "IBM Plex Mono", monospace'; g.fillText("820-03xxx  MLB", 26, h - 24);
  });
  const vapor = ink(600, 640, (g, w, h) => {
    g.globalAlpha = .55; for (let y = 40; y < h - 30; y += 24) for (let x = 40 + (y / 24 % 2) * 12; x < w - 30; x += 24){ g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); }
    g.globalAlpha = 1; g.lineWidth = 2.5; rrPath(g, 12, 12, w - 24, h - 24, 40); g.stroke();
    g.lineWidth = 1; g.setLineDash([6, 6]); rrPath(g, 24, 24, w - 48, h - 48, 32); g.stroke(); g.setLineDash([]);
  });
  const cell = ink(420, 520, (g, w, h) => {
    g.lineWidth = 2; g.strokeRect(14, 14, w - 28, h - 28);
    g.font = '600 30px "Archivo", sans-serif'; g.fillText("Bateria de íon-lítio", 36, 76);
    g.fillStyle = "#8f8b84"; g.font = '400 15px "IBM Plex Mono", monospace';
    ["Não desmonte, perfure ou aqueça", "Reciclável — descarte correto"].forEach((t, i) => g.fillText(t, 36, 116 + i * 24));
    g.fillStyle = INK_CSS; for (let i = 0; i < 38; i++) g.fillRect(36 + i * 9, h - 110, rnd() < .5 ? 2 : 4, 60);
  });
  const coil = ink(512, 512, (g, w) => {
    const c = w / 2;
    g.lineWidth = 1.6; g.globalAlpha = .8; for (let r = 60; r <= 176; r += 6){ g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
    g.globalAlpha = 1; g.lineWidth = 2;
    for (let i = 0; i < 18; i++){ g.save(); g.translate(c, c); g.rotate(i / 18 * TAU); rrPath(g, 196, -14, 46, 28, 5); g.stroke(); g.restore(); }
    g.beginPath(); g.arc(c, c, 48, 0, TAU); g.stroke(); g.beginPath(); g.arc(c, c, 250, 0, TAU); g.stroke();
  });

  const b = o.board, bt = o.batt, L = o.lenses;
  const backZ = p.kind === "pro" ? -.148 : -.158;
  const isAir = p.kind === "air";
  const DEF = {
    glass: { z0: .164, center: [0, 0, 0], view: { side: "F", ry: .2, rx: .22, s: .95 },
      callouts: [{ p: [.55*s, TOP - 1.2*s, .03], t: "Ceramic Shield 2", d: "3× mais resistente a riscos" }, { p: [-.7*s, -.5*s, .03], t: "Antirreflexo", d: "menos reflexo sob luz forte" }, { p: [.95*s, -TOP + .75*s, .03], t: "Oleofóbico", d: "afasta marcas de dedos" }],
      build: g => g.add(shapeMesh(rr(W - .05*s, H - .05*s, R - .03*s), .012, .009, NOFILL)) },
    display: { z0: .124, center: [0, 0, 0], view: { side: "F", ry: .28, rx: .2, s: 1 },
      callouts: [{ p: [0, TOP - .38*s, .012], t: "Dynamic Island", d: "alertas e atividades ao vivo" }, { p: [.32*s, TOP - .36*s, -.04], t: "Câmera frontal 18 MP", d: "Center Stage enquadra o grupo" }, { p: [-.6*s, .7*s, .012], t: `Super Retina XDR ${p.screen}"`, d: "OLED ProMotion até 120 Hz" }, { p: [.65*s, -1.3*s, .012], t: "Até 3.000 nits", d: "pico de brilho ao ar livre" }, { p: [0, -TOP + .38*s, -.018], t: "Conector flex", d: "liga a tela à placa lógica" }],
      build: g => {
        g.add(shapeMesh(rr(W - .14*s, H - .14*s, R - .07*s), .02, 0, FILL));
        const scr = new THREE.MeshBasicMaterial({ map: lockScreen(renderer, o, ACCENTS[p.kind]), toneMapped: false }); scr.userData.role = "flat";
        g.add(flat(new THREE.PlaneGeometry(o.SW, o.SH), scr, 0, 0, .013));
        g.add(box(.9*s, .2*s, .06, FILL, 0, TOP - .36*s, -.045));
        g.add(cyl(.07*s, .05, FILL, .32*s, TOP - .36*s, -.04, 32));
        g.add(box(.8*s, .5*s, .006, FILL, 0, -TOP + .38*s, -.016));
      } },
    vapor: { z0: .072, center: [0, TOP - 1.65*s, 0], view: { side: "F", ry: .12, rx: .38, s: 1.3 },
      callouts: [{ p: [0, TOP - 1.4*s, .01], t: "Câmara de vapor", d: "selada e soldada a laser" }, { p: [-.8*s, TOP - 2.75*s, .01], t: "Água deionizada", d: "evapora no calor, condensa no frio" }, { p: [.85*s, TOP - .45*s, .01], t: "Dissipação", d: `espalha o calor do ${p.chip}` }],
      build: g => {
        const vh = 3.1 * s, vcy = TOP - .1*s - vh / 2;
        g.add(shapeMesh(rr(W - .4*s, vh, .26*s, .26*s, 0, vcy), .012, .003, FILL));
        g.add(flat(new THREE.PlaneGeometry(W - .42*s, vh - .02), inkMat(vapor), 0, vcy, .0095));
      } },
    board: { z0: isAir ? -.03 : .018, center: [0, b.cy, 0], view: { side: "F", ry: .05, rx: .5, s: isAir ? 2.3 : 1.8 },
      callouts: isAir
        ? [{ p: [-.45*s, b.cy, .07], t: "A19 Pro", d: "CPU de 6 núcleos, 3 nm" }, { p: [.5*s, b.cy + .12*s, .055], t: "Chip N1", d: "Wi‑Fi 7, Bluetooth 6, Thread" }, { p: [1.0*s, b.cy - .12*s, .055], t: "Modem C1X", d: "5G projetado pela Apple" }, { p: [-1.1*s, b.cy, .045], t: "Conectores", d: "tela, câmera e bateria" }]
        : [{ p: [-.25*s, b.cy, .08], t: p.chip, d: `CPU de 6 e GPU de ${p.gpu} núcleos` }, { p: [.78*s, b.cy - .55*s, .06], t: "Chip N1", d: "Wi‑Fi 7, Bluetooth 6, Thread" }, { p: [-1.02*s, b.cy - .55*s, .06], t: "Modem 5G", d: "dados móveis" }, { p: [.85*s, b.cy + .4*s, .055], t: "Blindagem", d: "isola interferências" }, { p: [1.18*s, b.cy + .75*s, .045], t: "Conectores", d: "tela, câmeras e bateria" }],
      build: g => {
        g.add(shapeMesh(rr(b.w, b.h, .22*s, .14*s, 0, b.cy), .03, 0, FILL));
        g.add(flat(new THREE.PlaneGeometry(b.w - .04, b.h - .04), inkMat(pcb), 0, b.cy, .0156));
        const L4 = m => [FILL, FILL, FILL, FILL, m, FILL];
        if (isAir){
          g.add(box(.62*s, .62*s, .06, L4(lid("A19 PRO", "3 nm")), -.45*s, b.cy, .045));
          g.add(box(.3*s, .3*s, .04, L4(lid("N1", "WIRELESS")), .5*s, b.cy + .12*s, .035));
          g.add(box(.36*s, .36*s, .04, L4(lid("C1X", "MODEM")), 1.0*s, b.cy - .12*s, .035));
          g.add(box(.26*s, .12*s, .035, FILL, -1.1*s, b.cy, .03));
        } else {
          g.add(box(.8*s, .8*s, .06, L4(lid(p.chip.toUpperCase(), "3 nm")), -.25*s, b.cy, .045));
          g.add(box(.36*s, .36*s, .04, L4(lid("N1", "WIRELESS")), .78*s, b.cy - .55*s, .035));
          g.add(box(.44*s, .44*s, .04, L4(lid("5G", "MODEM")), -1.02*s, b.cy - .55*s, .035));
          g.add(box(.62*s, .42*s, .035, FILL, .85*s, b.cy + .4*s, .033));
          g.add(box(.3*s, .14*s, .035, FILL, 1.18*s, b.cy + .75*s, .03));
          g.add(box(.3*s, .14*s, .035, FILL, -1.18*s, b.cy + .75*s, .03));
        }
        for (let i = 0; i < 34; i++){
          const x = (rnd() - .5) * (b.w - .3), y = b.cy + (rnd() - .5) * (b.h - .25);
          if (Math.abs(x + (isAir ? .45 : .25) * s) < .5*s && Math.abs(y - b.cy) < .5*s) continue;
          const big = rnd() < .3; g.add(box(big ? .12 : .06, big ? .08 : .035, .025, FILL, x, y, .028));
        }
      } },
    battery: { z0: -.02, center: [0, bt.cy - .4*s, 0], view: { side: "F", ry: .2, rx: .3, s: 1.05 },
      callouts: [{ p: [0, bt.cy + .3*s, .062], t: "Bateria", d: `até ${p.hours} h de vídeo` }, { p: [.6*s, bt.top + .1*s, .02], t: "Conector", d: isAir ? "liga a bateria à placa no platô" : "50% em ~20 min com 40 W" }, { p: [-.7*s, -TOP + .32*s, .06], t: "Taptic Engine", d: "vibração precisa ao toque" }, { p: [.75*s, -TOP + .32*s, .07], t: "Alto-falante", d: "som estéreo" }, { p: [0, -TOP + .12*s, .05], t: "USB‑C", d: p.kind === "pro" ? "USB 3, até 10 Gb/s" : "carga e dados" }],
      build: g => {
        g.add(shapeMesh(rr(bt.w, bt.h, .16*s, .16*s, 0, bt.cy), isAir ? .08 : .1, .008, FILL));
        g.add(flat(new THREE.PlaneGeometry(bt.w - .08, bt.h - .1), inkMat(cell), 0, bt.cy, isAir ? .0485 : .0585));
        g.add(box(.5*s, .32*s, .008, FILL, .6*s, bt.top + .1*s, .02));
        g.add(box(.95*s, .32*s, .1, FILL, -.7*s, -TOP + .32*s, 0));
        g.add(box(.75*s, .34*s, .12, FILL, .75*s, -TOP + .32*s, 0));
        for (let i = 0; i < 5; i++) circles(g, (.5 + i * .12) * s, -TOP + .32*s, .061, [.025], 16);
        g.add(box(.46*s, .14*s, .08, FILL, 0, -TOP + .12*s, 0));
      } },
    cam: { z0: -.07, center: p.kind === "pro" ? [-.1*s, TOP - .95*s, -.1] : [L[0][0] - (isAir ? .3*s : .2*s), L[0][1] - (p.kind === "base" ? .42*s : 0), -.1],
      view: { side: "B", ry: .55, rx: .22, s: isAir ? 2.1 : 1.7 },
      callouts: p.kind === "pro"
        ? [{ p: [L[0][0], L[0][1], -.235], t: "Principal 48 MP", d: "Fusion, 24 mm f/1.78" }, { p: [L[2][0], L[2][1], -.235], t: "Ultra-angular 48 MP", d: "13 mm, também faz macro" }, { p: [L[1][0], L[1][1], -.235], t: "Teleobjetiva 48 MP", d: "tetraprisma 4×, até 8× óptico" }, { p: [o.lidar[0], o.lidar[1], -.17], t: "Scanner LiDAR", d: "foco rápido no escuro" }]
        : isAir
          ? [{ p: [L[0][0], L[0][1], -.235], t: "Fusion 48 MP", d: "zoom 2× com qualidade óptica" }, { p: [L[0][0] + o.lr, L[0][1], -.13], t: "Estabilização", d: "sensor-shift de 2ª geração" }, { p: [o.flash[0], o.flash[1], -.17], t: "Flash", d: "True Tone adaptativo" }]
          : [{ p: [L[0][0], L[0][1], -.235], t: "Principal 48 MP", d: "Fusion, zoom 2× óptico" }, { p: [L[1][0], L[1][1], -.235], t: "Ultra-angular 48 MP", d: "também faz macro" }, { p: [o.flash[0], o.flash[1], -.17], t: "Flash", d: "True Tone adaptativo" }],
      build: g => {
        L.forEach(([x, y]) => {
          g.add(cyl(o.lr, .2, FILL, x, y, -.13));
          circles(g, x, y, -.2315, [o.lr * .8, o.lr * .42]);
          circles(g, x, y, -.08, [o.lr]);
          g.add(box(o.lr * 1.85, o.lr * 1.85, .14, FILL, x, y, 0));
        });
        if (p.kind === "pro") g.add(box(1.0*s, .5*s, .14, FILL, L[1][0] - .3*s, L[1][1], 0));
        if (o.lidar){ g.add(box(.34*s, .34*s, .12, FILL, o.lidar[0], o.lidar[1], 0)); g.add(cyl(.12*s, .14, FILL, o.lidar[0], o.lidar[1], -.1, 40)); circles(g, o.lidar[0], o.lidar[1], -.171, [.08*s, .04*s]); }
        g.add(box(.2*s, .2*s, .1, FILL, o.flash[0], o.flash[1], -.06)); circles(g, o.flash[0], o.flash[1], -.111, [.08*s]);
      } },
    body: { z0: 0, center: [0, 0, -.1], view: { side: "B", ry: .4, rx: .18, s: .92 },
      callouts: [{ p: [-.2*s, TOP - .9*s, -.23], t: "Platô integrado", d: "câmeras, flash e antenas" }, { p: [-W/2 - .03, TOP - 1.15*s, 0], t: "Botão de Ação", d: "atalho que você escolhe" }, { p: [W/2 + .03, -.75*s, 0], t: "Controle da Câmera", d: "clique para abrir, deslize para zoom" }, { p: [-W/2 - .02, -1.4*s, 0], t: "Alumínio forjado", d: "liga aeroespacial, peça única" }],
      build: g => {
        const ring = rr(W - .09*s, H - .09*s, R - .045*s); ring.holes.push(hole(W - .14*s, H - .14*s, R - .07*s, 0, 0));
        g.add(shapeMesh(ring, .22, .055, FILL, 0, .045*s, [-.165, -.11, .11, .165]));
        if (o.win){
          const plate = rr(W - .14*s, H - .14*s, R - .07*s); plate.holes.push(hole(o.win.w, o.win.h, .3*s, 0, o.win.cy));
          g.add(shapeMesh(plate, .02, .006, FILL, -.148));
          g.add(shapeMesh(rr(W - .14*s, o.PH - .05*s, R - .1*s, .3*s, 0, TOP - o.PH/2 - .05*s), .03, .022, FILL, -.188));
          L.forEach(([x, y]) => circles(g, x, y, -.2265, [o.lr * 1.07]));
          circles(g, o.flash[0], o.flash[1], -.2275, [.1*s, .06*s]);
        }
        const sx = W / 2 + .004;
        g.add(box(.05, .75*s, .1, FILL, sx, TOP - 1.65*s, 0)); g.add(box(.035, .52*s, .085, FILL, sx, -.75*s, 0));
        g.add(box(.05, .3*s, .1, FILL, -sx, TOP - 1.15*s, 0)); g.add(box(.05, .45*s, .1, FILL, -sx, TOP - 1.75*s, 0)); g.add(box(.05, .45*s, .1, FILL, -sx, TOP - 2.32*s, 0));
        g.add(box(.42*s, .06, .1, FILL, 0, -TOP - .005, 0));
      } },
    back: { z0: backZ, center: [0, o.win ? o.win.cy : 0, 0], view: { side: "B", ry: .15, rx: .25, s: 1.05 },
      callouts: o.win
        ? [{ p: [0, -.4*s, .02], t: "Bobina MagSafe", d: "carga sem fio até 25 W" }, { p: [.95*s, -.4*s, .02], t: "Ímãs em anel", d: "alinham carregador e acessórios" }, { p: [-.7*s, o.win.bot + .5*s, -.02], t: "Ceramic Shield", d: "vidro resistente na traseira" }]
        : [{ p: [0, -.4*s, .02], t: "Bobina MagSafe", d: "carga sem fio" }, { p: [.95*s, -.4*s, .02], t: "Ímãs em anel", d: "alinham carregador e acessórios" }, { p: [isAir ? -.6*s : o.bump.cx, isAir ? TOP - o.PH/2 : o.bump.cy, -.05], t: isAir ? "Platô" : "Módulo de câmeras", d: isAir ? "barra que guarda câmera e placa" : "vidro elevado com as lentes" }, { p: [-.7*s, -TOP + .9*s, -.02], t: isAir ? "Ceramic Shield" : "Vidro colorido", d: isAir ? "também na traseira" : "cor na própria massa, fosco" }],
      build: g => {
        if (o.win) g.add(shapeMesh(rr(o.win.w - .012, o.win.h - .012, .3*s, .3*s, 0, o.win.cy), .018, .005, FILL));
        else {
          g.add(shapeMesh(rr(W - .07*s, H - .07*s, R - .035*s), .016, .005, FILL));
          if (isAir) g.add(shapeMesh(rr(W - .16*s, o.PH - .1*s, R - .12*s, .32*s, 0, TOP - o.PH/2 - .04*s), .028, .02, FILL, -.032));
          else g.add(shapeMesh(rr(o.bump.w, o.bump.h, o.bump.r, o.bump.r, o.bump.cx, o.bump.cy), .028, .02, FILL, -.032));
          L.forEach(([x, y]) => circles(g, x, y, -.07, [o.lr * 1.07]));
        }
        g.add(flat(new THREE.PlaneGeometry(2.2*s, 2.2*s), inkMat(coil), 0, -.4*s, .016));
      } }
  };
  DEF.frame = { ...DEF.body, view: { side: "B", ry: .4, rx: .18, s: .92 },
    callouts: [{ p: [-W/2 - .03, TOP - 1.15*s, 0], t: "Botão de Ação", d: "atalho que você escolhe" }, { p: [W/2 + .03, -.75*s, 0], t: "Controle da Câmera", d: "clique para abrir, deslize para zoom" }, { p: [-W/2 - .02, -1.4*s, 0], t: isAir ? "Titânio grau 5" : "Alumínio", d: isAir ? "polido, rígido mesmo fino" : "moldura aeroespacial" }, { p: [0, -TOP - .02, 0], t: "USB‑C", d: "na base, entre os alto-falantes" }] };

  const ids = p.parts.map(x => x.id), N = ids.length;
  return ids.map((id, j) => {
    const d = DEF[id];
    return { id, z0: d.z0, zE: 3.5 - j * (7 / (N - 1)), center: d.center, view: d.view, callouts: d.callouts, build: d.build };
  });
}

/* ---------- teardown as solid, real-looking parts: same layers and positions as the drawing ---------- */
function realParts(renderer, p, color){
  const o = layout(p), { W, H, TOP, R, s } = o, { tex } = kit(renderer), b = o.board, bt = o.batt, L = o.lenses, isAir = p.kind === "air";
  let seed = 911; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const col = C(color || p.colors[0].body);
  const std = (c, r, m, extra) => new THREE.MeshStandardMaterial({ color: C(c), roughness: r, metalness: m, ...extra });
  const M = {
    metal: new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: 1, roughness: isAir ? .14 : .3, clearcoat: .3, clearcoatRoughness: .3 }),
    matte: new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: .1, roughness: .5, clearcoat: .5, clearcoatRoughness: .3 }),
    black: std("#0b0b0d", .4, .2), panel: std("#050507", .25, .3),
    pcb: std("#13241a", .55, .25), gold: std("#d6aa5c", .28, 1), steel: std("#b9bbc0", .26, 1), shield: std("#c9cbd0", .34, 1),
    flex: std("#c4772a", .45, .2), copper: std("#c27c4a", .32, 1), sapphire: new THREE.MeshPhysicalMaterial({ color: C("#05060a"), metalness: .25, roughness: .02, clearcoat: 1, envMapIntensity: 2.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: C("#cfd8e6"), roughness: .03, metalness: 0, clearcoat: 1, transparent: true, opacity: .28, envMapIntensity: 2.6, depthWrite: false })
  };
  M.glass.userData.alwaysT = true;
  // the back glass is tinted and see-through so the MagSafe coil behind it stays visible
  M.backGlass = new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: .1, roughness: .35, clearcoat: 1, transparent: true, opacity: .55, depthWrite: false, envMapIntensity: 1.6 });
  M.backGlass.userData.alwaysT = true;
  const chip = (title, sub) => std("#ffffff", .32, .55, { map: tex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#45464c"); gr.addColorStop(1, "#1d1e22"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e4e2dc"; g.textAlign = "center"; g.font = '600 56px "Archivo", sans-serif'; g.fillText(title, w / 2, h * .55);
    g.font = '500 17px "IBM Plex Mono", monospace'; g.fillStyle = "#a3a29d"; g.fillText(sub, w / 2, h * .74);
  }) });
  const top = m => [M.black, M.black, M.black, M.black, m, M.black];
  const pcbTex = tex(900, 590, (g, w, h) => {
    g.fillStyle = "#13241a"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(214,170,92,.35)"; g.lineWidth = 2; g.lineCap = "round";
    for (let i = 0; i < 160; i++){ let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++){ rnd() < .5 ? x += (rnd() - .5) * 180 : y += (rnd() - .5) * 130; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = "rgba(214,170,92,.7)"; for (let i = 0; i < 300; i++){ g.beginPath(); g.arc(rnd() * w, rnd() * h, 2.4, 0, TAU); g.fill(); }
    g.fillStyle = "rgba(240,240,235,.5)"; g.font = '500 16px "IBM Plex Mono", monospace'; g.fillText("820-03xxx  MLB", 26, h - 24);
  });
  const cellTex = tex(420, 520, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#d9dbdf"); gr.addColorStop(1, "#a7aab0"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#26272b"; g.font = '600 30px "Archivo", sans-serif'; g.fillText("Bateria de íon-lítio", 36, 76);
    g.font = '400 15px "IBM Plex Mono", monospace'; ["Não desmonte, perfure ou aqueça", "Reciclável — descarte correto"].forEach((t, i) => g.fillText(t, 36, 116 + i * 24));
    for (let i = 0; i < 38; i++) g.fillRect(36 + i * 9, h - 110, rnd() < .5 ? 2 : 4, 60);
  });
  const vaporTex = tex(600, 640, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#d4936a"); gr.addColorStop(.5, "#a8643c"); gr.addColorStop(1, "#c98258"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(60,25,10,.35)"; for (let y = 40; y < h - 30; y += 24) for (let x = 40 + (y / 24 % 2) * 12; x < w - 30; x += 24){ g.beginPath(); g.arc(x, y, 3.4, 0, TAU); g.fill(); }
    g.strokeStyle = "rgba(255,220,190,.5)"; g.lineWidth = 3; rrPath(g, 16, 16, w - 32, h - 32, 36); g.stroke();
  });
  const coilTex = tex(512, 512, (g, w) => {
    const c = w / 2; g.clearRect(0, 0, w, w);
    for (let r = 60; r <= 176; r += 5){ g.strokeStyle = r % 10 ? "#b8693a" : "#d98a55"; g.lineWidth = 3.4; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
    g.fillStyle = "#2a2b30"; for (let i = 0; i < 18; i++){ g.save(); g.translate(c, c); g.rotate(i / 18 * TAU); rrPath(g, 196, -15, 48, 30, 5); g.fill(); g.restore(); }
  });
  // seen from the back side of the phone, so it must render both faces
  const coilMat = new THREE.MeshStandardMaterial({ map: coilTex, transparent: true, roughness: .35, metalness: .8, side: THREE.DoubleSide }); coilMat.userData.alwaysT = true;
  const caps = (g, n, cx, cy, w, h, z, avoid) => { for (let i = 0; i < n; i++){ const x = cx + (rnd() - .5) * w, y = cy + (rnd() - .5) * h; if (avoid && avoid(x, y)) continue; const big = rnd() < .3; g.add(box(big ? .12 : .06, big ? .08 : .035, .025, big ? M.black : M.gold, x, y, z)); } };
  const lens = (g, x, y, zTop, r) => {
    g.add(cyl(r * 1.02, .2, M.black, x, y, zTop + .1));
    g.add(cyl(r * .96, .012, M.steel, x, y, zTop + .004));
    g.add(flat(new THREE.CircleGeometry(r * .84, 48), M.sapphire, x, y, zTop - .002, true));
    g.add(flat(new THREE.RingGeometry(r * .3, r * .5, 48), std("#1a1c26", .2, .7), x, y, zTop - .003, true));
  };
  const builds = {
    glass: g => g.add(shapeMesh(rr(W - .05*s, H - .05*s, R - .03*s), .012, .009, M.glass)),
    display: g => {
      g.add(shapeMesh(rr(W - .14*s, H - .14*s, R - .07*s), .02, 0, M.panel));
      g.add(flat(new THREE.PlaneGeometry(o.SW, o.SH), new THREE.MeshBasicMaterial({ map: lockScreen(renderer, o, ACCENTS[p.kind]), toneMapped: false }), 0, 0, .013));
      g.add(box(.9*s, .2*s, .06, M.black, 0, TOP - .36*s, -.045));
      g.add(cyl(.07*s, .05, M.sapphire, .32*s, TOP - .36*s, -.04, 32));
      g.add(box(.8*s, .5*s, .006, M.flex, 0, -TOP + .38*s, -.016));
      g.add(box(.3*s, .14*s, .02, M.gold, 0, -TOP + .52*s, -.026));
    },
    vapor: g => {
      const vh = 3.1 * s, vcy = TOP - .1*s - vh / 2;
      g.add(shapeMesh(rr(W - .4*s, vh, .26*s, .26*s, 0, vcy), .012, .003, M.copper));
      g.add(flat(new THREE.PlaneGeometry(W - .44*s, vh - .04), std("#ffffff", .38, .85, { map: vaporTex }), 0, vcy, .0095));
    },
    board: g => {
      g.add(shapeMesh(rr(b.w, b.h, .22*s, .14*s, 0, b.cy), .03, 0, M.pcb));
      g.add(flat(new THREE.PlaneGeometry(b.w - .06, b.h - .06), std("#ffffff", .5, .3, { map: pcbTex }), 0, b.cy, .0156));
      if (isAir){
        g.add(box(.62*s, .62*s, .06, top(chip("A19 PRO", "3 nm")), -.45*s, b.cy, .045));
        g.add(box(.3*s, .3*s, .04, top(chip("N1", "WIRELESS")), .5*s, b.cy + .12*s, .035));
        g.add(box(.36*s, .36*s, .04, top(chip("C1X", "MODEM")), 1.0*s, b.cy - .12*s, .035));
        g.add(box(.26*s, .12*s, .035, M.gold, -1.1*s, b.cy, .03));
      } else {
        g.add(box(.8*s, .8*s, .06, top(chip(p.chip.toUpperCase(), "3 nm")), -.25*s, b.cy, .045));
        g.add(box(.36*s, .36*s, .04, top(chip("N1", "WIRELESS")), .78*s, b.cy - .55*s, .035));
        g.add(box(.44*s, .44*s, .04, top(chip("5G", "MODEM")), -1.02*s, b.cy - .55*s, .035));
        g.add(box(.62*s, .42*s, .035, M.shield, .85*s, b.cy + .4*s, .033));
        g.add(box(.3*s, .14*s, .035, M.gold, 1.18*s, b.cy + .75*s, .03));
        g.add(box(.3*s, .14*s, .035, M.gold, -1.18*s, b.cy + .75*s, .03));
      }
      caps(g, 40, 0, b.cy, b.w - .3, b.h - .25, .028, (x, y) => Math.abs(x + (isAir ? .45 : .25) * s) < .5*s && Math.abs(y - b.cy) < .5*s);
    },
    battery: g => {
      const d = isAir ? .08 : .1;
      g.add(shapeMesh(rr(bt.w, bt.h, .16*s, .16*s, 0, bt.cy), d, .008, std("#a9acb2", .3, .8)));
      g.add(flat(new THREE.PlaneGeometry(bt.w - .08, bt.h - .1), std("#ffffff", .36, .5, { map: cellTex }), 0, bt.cy, d / 2 + .0095));
      g.add(box(.5*s, .32*s, .008, M.flex, .6*s, bt.top + .1*s, .02));
      g.add(box(.95*s, .32*s, .1, M.steel, -.7*s, -TOP + .32*s, 0));
      g.add(box(.75*s, .34*s, .12, M.black, .75*s, -TOP + .32*s, 0));
      for (let i = 0; i < 5; i++) g.add(cyl(.025, .01, M.steel, (.5 + i * .12) * s, -TOP + .32*s, .062, 16));
      g.add(box(.46*s, .14*s, .08, M.steel, 0, -TOP + .12*s, 0));
    },
    cam: g => {
      L.forEach(([x, y]) => { g.add(box(o.lr * 1.85, o.lr * 1.85, .14, M.shield, x, y, 0)); lens(g, x, y, -.23, o.lr); });
      if (p.kind === "pro") g.add(box(1.0*s, .5*s, .14, M.shield, L[1][0] - .3*s, L[1][1], 0));
      if (o.lidar){ g.add(box(.34*s, .34*s, .12, M.black, o.lidar[0], o.lidar[1], 0)); g.add(cyl(.12*s, .14, M.black, o.lidar[0], o.lidar[1], -.1, 40)); g.add(flat(new THREE.CircleGeometry(.1*s, 32), M.sapphire, o.lidar[0], o.lidar[1], -.171, true)); }
      g.add(box(.2*s, .2*s, .1, M.black, o.flash[0], o.flash[1], -.06));
      g.add(flat(new THREE.CircleGeometry(.08*s, 32), std("#e9dfc6", .3, 0, { emissive: C("#2a2416") }), o.flash[0], o.flash[1], -.111, true));
    },
    body: g => {
      const ring = rr(W - .09*s, H - .09*s, R - .045*s); ring.holes.push(hole(W - .14*s, H - .14*s, R - .07*s, 0, 0));
      g.add(shapeMesh(ring, .22, .055, M.metal, 0, .045*s));
      if (o.win){
        const plate = rr(W - .14*s, H - .14*s, R - .07*s); plate.holes.push(hole(o.win.w, o.win.h, .3*s, 0, o.win.cy));
        g.add(shapeMesh(plate, .02, .006, M.matte, -.148));
        g.add(shapeMesh(rr(W - .14*s, o.PH - .05*s, R - .1*s, .3*s, 0, TOP - o.PH/2 - .05*s), .03, .022, M.metal, -.188));
        L.forEach(([x, y]) => { g.add(cyl(o.lr * 1.07, .05, M.metal, x, y, -.215)); g.add(flat(new THREE.CircleGeometry(o.lr * .95, 48), M.sapphire, x, y, -.2405, true)); });
        g.add(flat(new THREE.CircleGeometry(.1*s, 32), std("#e9dfc6", .3, 0), o.flash[0], o.flash[1], -.2275, true));
      }
      const sx = W / 2 + .004;
      g.add(box(.05, .75*s, .1, M.metal, sx, TOP - 1.65*s, 0)); g.add(box(.035, .52*s, .085, M.sapphire, sx, -.75*s, 0));
      g.add(box(.05, .3*s, .1, M.metal, -sx, TOP - 1.15*s, 0)); g.add(box(.05, .45*s, .1, M.metal, -sx, TOP - 1.75*s, 0)); g.add(box(.05, .45*s, .1, M.metal, -sx, TOP - 2.32*s, 0));
      g.add(box(.42*s, .06, .1, M.black, 0, -TOP - .005, 0));
    },
    back: g => {
      if (o.win) g.add(shapeMesh(rr(o.win.w - .012, o.win.h - .012, .3*s, .3*s, 0, o.win.cy), .018, .005, M.backGlass));
      else {
        g.add(shapeMesh(rr(W - .07*s, H - .07*s, R - .035*s), .016, .005, M.backGlass));
        if (isAir) g.add(shapeMesh(rr(W - .16*s, o.PH - .1*s, R - .12*s, .32*s, 0, TOP - o.PH/2 - .04*s), .028, .02, M.metal, -.032));
        else g.add(shapeMesh(rr(o.bump.w, o.bump.h, o.bump.r, o.bump.r, o.bump.cx, o.bump.cy), .028, .02, M.matte, -.032));
        L.forEach(([x, y]) => g.add(flat(new THREE.CircleGeometry(o.lr * .95, 48), M.sapphire, x, y, -.07, true)));
      }
      g.add(flat(new THREE.PlaneGeometry(2.2*s, 2.2*s), coilMat, 0, -.4*s, .017));
    }
  };
  builds.frame = builds.body;
  return { builds, tinted: [M.metal, M.matte, M.backGlass] };
}

window.Fone3D = { layout, environment, buildReal, buildParts, realParts, rr, C, MM, shapeMesh, box, cyl, flat, circles, hole, kit, rrPath };
})();
