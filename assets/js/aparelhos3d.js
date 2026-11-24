/* Aparelhos3D: realistic models for Mac, iPad, AirPods and Watch, plus a thumbnail renderer used by the shop grid and search. */
(function(){
const F = window.Fone3D, C = F.C, rr = F.rr, TAU = Math.PI * 2;

function slab(shape, d, bevel, mat, bevelSize = bevel){
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize, bevelSegments: 6, curveSegments: 24 });
  g.translate(0, 0, -d / 2); return new THREE.Mesh(g, mat);
}
/* smooth curved solids: a squircle outline (half-sizes a, b, exponent n) swept through a cross-section profile of [scale, z]
   points, then bent back by bendX/bendY at the edges. Solid slabs start and end at scale 0; rings use closed profiles. */
function squircle(a, b, n){ return t => { const c = Math.cos(t), s = Math.sin(t); return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]; }; }
function loft(outline, profile, { closed = false, bendX = 0, bendY = 0, hw = 1, hh = 1, segs = 96 } = {}){
  const pos = [], uv = [], idx = [], rows = profile.length;
  profile.forEach(([sc, z], i) => { for (let j = 0; j < segs; j++){ const [x, y] = outline(j / segs * TAU); const X = x * sc, Y = y * sc; pos.push(X, Y, z - bendX * (X / hw) ** 2 - bendY * (Y / hh) ** 2); uv.push(j / segs, i / (rows - 1)); } });
  const last = closed ? rows : rows - 1;
  for (let i = 0; i < last; i++){ const r0 = i * segs, r1 = ((i + 1) % rows) * segs; for (let j = 0; j < segs; j++){ const j1 = (j + 1) % segs; idx.push(r0 + j, r1 + j, r0 + j1, r0 + j1, r1 + j, r1 + j1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// cross-sections: a slab of depth d with rounded rim (e = rim radius in outline-scale units, ez in z)
function slabProfile(d, e = .04, ez = Math.min(d / 2, .04)){
  const p = [[0, d / 2]]; [.3, .55, .75, .88].forEach(s => p.push([s * (1 - e), d / 2]));
  for (let k = 0; k <= 6; k++){ const f = k / 6 * Math.PI / 2; p.push([1 - e + e * Math.sin(f), d / 2 - ez + ez * Math.cos(f)]); }
  for (let k = 0; k <= 6; k++){ const f = k / 6 * Math.PI / 2; p.push([1 - e + e * Math.cos(f), -d / 2 + ez - ez * Math.sin(f)]); }
  [.88, .75, .55, .3].forEach(s => p.push([s * (1 - e), -d / 2])); p.push([0, -d / 2]); return p;
}
function ringProfile(inner, d, e = .03){
  const ez = Math.min(d / 2, .035), p = [];
  for (let k = 0; k <= 4; k++){ const f = k / 4 * Math.PI / 2; p.push([inner + e - e * Math.cos(f), d / 2 - ez + ez * Math.sin(f)]); }
  for (let k = 0; k <= 4; k++){ const f = k / 4 * Math.PI / 2; p.push([1 - e + e * Math.sin(f), d / 2 - ez + ez * Math.cos(f)]); }
  for (let k = 0; k <= 4; k++){ const f = k / 4 * Math.PI / 2; p.push([1 - e + e * Math.cos(f), -d / 2 + ez - ez * Math.sin(f)]); }
  for (let k = 0; k <= 4; k++){ const f = k / 4 * Math.PI / 2; p.push([inner + e - e * Math.sin(f), -d / 2 + ez - ez * Math.cos(f)]); }
  return p;
}
function canvasTex(renderer, w, h, draw){
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
function rrPath(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function glow(g, x, y, r, col){ const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
function wallpaper(g, w, h, a, b){
  g.fillStyle = "#07080b"; g.fillRect(0, 0, w, h);
  glow(g, w * .25, h * .7, w * .8, a); glow(g, w * .85, h * .3, w * .7, b); glow(g, w * .5, h * 1.1, w * .6, "rgba(255,255,255,.25)");
}
const now = () => new Date();
const hhmm = () => now().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function materials(color, kind){
  const col = C(color);
  return {
    metal: new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: 1, roughness: kind === "polished" ? .16 : .34, clearcoat: .25, clearcoatRoughness: .35 }),
    gloss: new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: 0, roughness: .22, clearcoat: 1, clearcoatRoughness: .08 }),
    black: new THREE.MeshStandardMaterial({ color: C("#0a0a0c"), roughness: .35, metalness: .2 }),
    dark:  new THREE.MeshStandardMaterial({ color: C("#1b1c1f"), roughness: .6, metalness: .1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: C("#06070a"), metalness: .2, roughness: .03, clearcoat: 1, envMapIntensity: 2 }),
    rubber:new THREE.MeshStandardMaterial({ color: C("#2a2b2e"), roughness: .85, metalness: 0 })
  };
}

/* ---------- MacBook ---------- */
function mac(renderer, item, color){
  const { inch, pro } = item.geo, W = .42 * inch, D = W * .7, T = pro ? .17 : .12;
  const M = materials(color), g = new THREE.Group();
  const base = slab(rr(W, D, .22, .22), T, .03, M.metal); base.rotation.x = -Math.PI / 2; base.position.y = T / 2; g.add(base);
  // keyboard: a dark well with real raised keys (one instanced mesh)
  const KW = W * .84, KD = D * .4, kz = -D * .14, top = T + .03;
  const well = new THREE.Mesh(new THREE.PlaneGeometry(KW + .08, KD + .08), new THREE.MeshStandardMaterial({ color: C("#0c0d0f"), roughness: .8 }));
  well.rotation.x = -Math.PI / 2; well.position.set(0, top + .001, kz); g.add(well);
  const rows = 6, cols = 14, pitchX = KW / cols, pitchZ = KD / rows, keys = [];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++){
    if (r === 5 && k > 4 && k <= 8) continue;
    const wide = r === 5 && k === 4 ? 5 : 1, h = r === 0 ? .62 : 1;
    keys.push([-KW / 2 + pitchX * (k + wide / 2), kz - KD / 2 + pitchZ * (r + .5) + (r === 0 ? pitchZ * .19 : 0), pitchX * wide - pitchX * .16, pitchZ * h - pitchZ * .18]);
  }
  const keyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: C("#17181b"), roughness: .5, metalness: .05 }), keys.length);
  const m4 = new THREE.Matrix4();
  keys.forEach(([x, z, w, d], i) => keyMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(x, top + .018, z), new THREE.Quaternion(), new THREE.Vector3(w, .03, d))));
  g.add(keyMesh);
  if (pro){
    [-1, 1].forEach(s => { const sp = new THREE.Mesh(new THREE.PlaneGeometry(W * .045, D * .42), M.dark); sp.rotation.x = -Math.PI / 2; sp.position.set(s * W * .465, T + .031, -D * .14); g.add(sp); });
  }
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(W * .42, D * .3), new THREE.MeshPhysicalMaterial({ color: C(color).multiplyScalar(.92), metalness: .6, roughness: .2, clearcoat: .6 }));
  tp.rotation.x = -Math.PI / 2; tp.position.set(0, T + .031, D * .25); g.add(tp);
  // lid on a hinge at the back edge
  const hinge = new THREE.Group(); hinge.position.set(0, T, -D / 2 + .04); g.add(hinge);
  const LH = D * .98, lid = new THREE.Group(); hinge.add(lid);
  const shell = slab(rr(W, LH, .2, .2), .05, .02, M.metal); shell.position.set(0, LH / 2, -.04); lid.add(shell);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - .1, LH - .1), M.black); bezel.position.set(0, LH / 2, .007); lid.add(bezel);
  const screen = canvasTex(renderer, 1280, 830, (c, w, h) => {
    wallpaper(c, w, h, pro ? "rgba(120,90,255,.9)" : "rgba(80,160,255,.85)", pro ? "rgba(255,90,120,.7)" : "rgba(120,230,210,.6)");
    c.fillStyle = "rgba(20,20,24,.55)"; c.fillRect(0, 0, w, 34);
    c.fillStyle = "#fff"; c.font = '600 20px "Archivo", sans-serif'; c.textBaseline = "middle"; c.fillText("Finder   Arquivo   Editar   Visualizar", 60, 17);
    c.textAlign = "right"; c.fillText(hhmm(), w - 24, 17);
    c.fillStyle = "#000"; rrPath(c, w / 2 - 70, -10, 140, 40, 12); c.fill();
    c.fillStyle = "rgba(255,255,255,.18)"; rrPath(c, w / 2 - 300, h - 92, 600, 72, 22); c.fill();
    ["#ff6a1a", "#6aa8ff", "#7bdc8f", "#f2efe9", "#c49bff", "#ffd36a"].forEach((col, i) => { c.fillStyle = col; rrPath(c, w / 2 - 270 + i * 92, h - 80, 58, 58, 14); c.fill(); });
  });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - .26, LH - .3), new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }));
  scr.position.set(0, LH / 2 + .03, .008); lid.add(scr);
  // glossy glass over the panel so the studio lights reflect on the screen
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, clearcoat: 1, transparent: true, opacity: .07, envMapIntensity: 2.5, depthWrite: false });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(W - .1, LH - .1), glassM); gl.position.set(0, LH / 2, .012); lid.add(gl);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, W * .78, 32).rotateZ(Math.PI / 2), M.dark); barrel.position.set(0, T + .02, -D / 2 + .05); g.add(barrel);
  hinge.rotation.x = -.32; // open a little past upright
  return { group: g, tinted: [M.metal, tp.material], pose: [.32, -.55, 0] };
}

/* ---------- iPad ---------- */
function ipad(renderer, item, color){
  const { pro } = item.geo, H = 5.4, W = 3.86, T = pro ? .1 : .15, R = .32;
  const M = materials(color), g = new THREE.Group();
  g.add(slab(rr(W, H, R), T, .025, M.metal));
  // glass face sits on top of the body's bevel (top at T/2 + .025), never sharing a plane with it
  const front = slab(rr(W - .06, H - .06, R - .03), .01, 0, M.black); front.position.z = T / 2 + .031; g.add(front);
  const tex = canvasTex(renderer, 700, 980, (c, w, h) => {
    wallpaper(c, w, h, pro ? "rgba(255,110,40,.9)" : "rgba(110,150,255,.9)", pro ? "rgba(255,60,120,.6)" : "rgba(255,210,120,.6)");
    c.fillStyle = "#fff"; c.textAlign = "center"; c.font = '600 150px "Archivo", sans-serif'; c.fillText(hhmm(), w / 2, 300);
    c.font = '500 30px "Archivo", sans-serif'; c.fillText(now().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), w / 2, 130);
  });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - .34, H - .34), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = T / 2 + .039; g.add(scr);
  const back = -T / 2 - .03;
  if (pro){
    const bump = slab(rr(.9, .9, .26, .26, 0, 0), .04, .015, M.black); bump.position.set(W / 2 - .62, H / 2 - .62, back - .01); g.add(bump);
    [[-.18, .18, .15], [-.18, -.18, .11], [.2, .18, .07]].forEach(([x, y, r]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .06, 40).rotateX(Math.PI / 2), M.glass); l.position.set(W / 2 - .62 + x, H / 2 - .62 + y, back - .04); g.add(l); });
  } else {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .05, 40).rotateX(Math.PI / 2), M.metal); ring.position.set(W / 2 - .4, H / 2 - .4, back); g.add(ring);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .052, 40).rotateX(Math.PI / 2), M.glass); l.position.set(W / 2 - .4, H / 2 - .4, back); g.add(l);
  }
  const btn = new THREE.Mesh(new THREE.BoxGeometry(.45, .05, .06), M.metal); btn.position.set(W / 2 - 1, H / 2 + .02, 0); g.add(btn);
  return { group: g, tinted: [M.metal], pose: [.06, Math.PI - .55, -.04] };
}

/* ---------- AirPods ---------- */
// one earbud as a single smooth body: lathe profile (head → neck → stem), then the head is pushed
// toward the ear (-x) and forward (+z) and the stem squeezed to an oval. Head center ends at HC, stem runs down -y.
const BUD_R = .3, BUD_HC = new THREE.Vector3(-.07, 0, .05);
function earbud(m, pro){
  const R = BUD_R, V2 = THREE.Vector2, sL = pro ? .36 : .42, y1 = -.38 - sL, pts = [];
  for (let i = 0; i <= 28; i++){ const a = Math.PI / 2 - i / 28 * (Math.PI / 2 + 1); pts.push(new V2(Math.cos(a) * R, Math.sin(a) * R * .97)); }
  new THREE.QuadraticBezierCurve(new V2(Math.cos(-1) * R, Math.sin(-1) * R * .97), new V2(.1, -.29), new V2(.1, -.38)).getPoints(10).slice(1).forEach(p => pts.push(p));
  for (let i = 1; i <= 6; i++) pts.push(new V2(.1 - .012 * i / 6, -.38 - sL * i / 6));
  [[.086, y1 - .012], [.077, y1 - .022], [.05, y1 - .027], [0, y1 - .028]].forEach(([x, y]) => pts.push(new V2(x, y)));
  const geo = new THREE.LatheGeometry(pts, 64), P = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++){
    v.fromBufferAttribute(P, i);
    const h = THREE.MathUtils.smoothstep(v.y, -.4, -.12), s = 1 - h;
    v.z *= 1 - .14 * s; v.x *= 1 - .05 * h;
    v.x += h * BUD_HC.x + s * (v.y + .38) * .06; v.z += h * BUD_HC.z;
    P.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  // weld the lathe seam and the two poles so no crease shows
  const N = geo.attributes.normal, n = pts.length, seg = 64, a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let j = 0; j < n; j++){ a.fromBufferAttribute(N, j); b.fromBufferAttribute(N, seg * n + j); a.add(b).normalize(); N.setXYZ(j, a.x, a.y, a.z); N.setXYZ(seg * n + j, a.x, a.y, a.z); }
  for (let i = 0; i <= seg; i++){ N.setXYZ(i * n, 0, 1, 0); N.setXYZ(i * n + n - 1, 0, -1, 0); }
  const g = new THREE.Group(), body = new THREE.Mesh(geo, m.white); g.add(body);
  // patch that hugs the head sphere, aimed along dir, stretched to an oval by sx
  const patch = (ang, sx, mat, dir, lift = .003) => {
    const r = R + lift, pg = new THREE.SphereGeometry(r, 32, 6, 0, Math.PI * 2, 0, ang), pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++){ v.fromBufferAttribute(pp, i); v.x *= sx; v.setLength(r); pp.setXYZ(i, v.x, v.y, v.z); }
    pg.computeVertexNormals();
    const pm = new THREE.Mesh(pg, mat); pm.position.copy(BUD_HC); pm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); return pm;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  g.add(patch(.2, 1.9, m.dark, V(.55, .72, .05)));           // outer mic vent on top
  g.add(patch(.07, 1, m.dark, V(-.15, -.35, .92)));          // skin-detect sensor
  if (pro){
    const dn = V(-.72, -.05, .69).normalize(), up = V(0, 1, 0);
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(.12, .13, .12, 40), m.white);
    noz.position.copy(BUD_HC).addScaledVector(dn, R * .92); noz.quaternion.setFromUnitVectors(up, dn); g.add(noz);
    const tipPts = [[.11, 0], [.165, .015], [.205, .06], [.205, .11], [.175, .16], [.12, .195], [.07, .205]].map(([x, y]) => new V2(x, y));
    const tip = new THREE.Mesh(new THREE.LatheGeometry(tipPts, 48), m.tip); tip.material.side = THREE.DoubleSide;
    tip.position.copy(BUD_HC).addScaledVector(dn, R * .92 + .02); tip.quaternion.copy(noz.quaternion); g.add(tip);
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(.072, 32), m.dark); mesh.position.set(0, .2, 0); mesh.rotation.x = -Math.PI / 2; tip.add(mesh);
    const mic = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .09, 12), m.dark); mic.scale.z = .3;
    mic.position.set(.008, -.47, .083); g.add(mic);
  } else {
    g.add(patch(.3, 1.35, m.dark, V(-.62, .02, .78)));        // speaker grille facing the ear
  }
  const foot = new THREE.Mesh(new THREE.CircleGeometry(.062, 40), m.steel); foot.position.set(s0(y1), y1 - .029, 0); foot.rotation.x = Math.PI / 2; g.add(foot);
  const port = new THREE.Mesh(new THREE.CircleGeometry(.022, 20), m.dark); port.position.set(s0(y1), y1 - .0295, 0); port.rotation.x = Math.PI / 2; g.add(port);
  return g;
  function s0(y){ return (y + .38) * .06; }
}

function airpods(renderer, item){
  const { pro } = item.geo, M = materials("#f4f4f2"), g = new THREE.Group();
  // AirPods plastic: warm white, satin underneath, glossy coat on top
  const white = new THREE.MeshPhysicalMaterial({ color: C("#efefec"), metalness: 0, roughness: .42, clearcoat: .8, clearcoatRoughness: .18, envMapIntensity: 1.1 });
  const cw = pro ? 2.3 : 2.0, ch = pro ? 1.72 : 1.85, cd = pro ? .86 : .8;
  const caseG = new THREE.Group(); g.add(caseG);
  const body = slab(rr(cw, ch, pro ? .55 : .7, pro ? .55 : .7), cd - .3, .15, white, .14); caseG.add(body);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(cw + .015, .008, cd + .015), new THREE.MeshStandardMaterial({ color: C("#8f8f8b"), roughness: .6 })); seam.position.y = ch * .18; caseG.add(seam);
  const hingeM = new THREE.Mesh(new THREE.BoxGeometry(cw * .35, .1, .02), new THREE.MeshStandardMaterial({ color: C("#b9bbbf"), metalness: 1, roughness: .25 })); hingeM.position.set(0, ch * .18, -cd / 2 - .005); caseG.add(hingeM);
  if (pro){ [-1, 1].forEach(s => { const sp = new THREE.Mesh(new THREE.CircleGeometry(.025, 12), M.black); sp.position.set(s * .1, -ch / 2 - .06, cd / 2 - .1); sp.rotation.x = Math.PI / 2; caseG.add(sp); }); }
  const led = new THREE.Mesh(new THREE.CircleGeometry(.035, 16), new THREE.MeshBasicMaterial({ color: 0x5fe08a, toneMapped: false })); led.position.set(0, -ch * .05, cd / 2 + .001); caseG.add(led);
  const port = new THREE.Mesh(new THREE.BoxGeometry(.3, .03, .09), M.black); port.position.set(0, -ch / 2 - .14, 0); caseG.add(port);
  caseG.position.x = -.35;
  // the two earbuds resting beside the case
  const budM = { white, dark: new THREE.MeshStandardMaterial({ color: C("#1a1b1e"), roughness: .7, metalness: .4 }), steel: new THREE.MeshStandardMaterial({ color: C("#c4c6ca"), roughness: .25, metalness: 1 }), tip: new THREE.MeshStandardMaterial({ color: C("#e2e2dd"), roughness: .9 }) };
  const bud = (x, flip) => {
    const b = earbud(budM, pro);
    b.position.set(x, .3, .7); b.rotation.set(.15, flip ? -.6 : .6, flip ? .12 : -.12); b.scale.set(flip ? -1.05 : 1.05, 1.05, 1.05);
    return b;
  };
  g.add(bud(1.3, false)); g.add(bud(2.0, true));
  return { group: g, tinted: [], pose: [.3, -.35, 0] };
}

/* ---------- Apple Watch ---------- */
function watch(renderer, item, color){
  const { ultra, mm } = item.geo, s = mm / 46, W = 1.62 * s * (ultra ? 1.06 : 1), H = 1.95 * s * (ultra ? 1.04 : 1), T = ultra ? .52 : .4;
  const M = materials(color, ultra ? "polished" : ""), g = new THREE.Group();
  const caseM = ultra ? new THREE.MeshPhysicalMaterial({ color: C(color), metalness: 1, roughness: .42, clearcoat: .2 }) : M.metal;
  g.add(slab(rr(W, H, .42 * s, .42 * s), T - .12, .1, caseM, .09));
  const face = canvasTex(renderer, 512, 620, (c, w, h) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, w, h);
    c.fillStyle = ultra ? "#ff8a3d" : "#f2efe9"; c.textAlign = "center"; c.font = '600 170px "Archivo", sans-serif'; c.fillText(hhmm(), w / 2, h * .52);
    c.font = '500 34px "IBM Plex Mono", monospace'; c.fillStyle = "#9a968f";
    c.fillText(now().toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" }).toUpperCase(), w / 2, h * .2);
    [["#ff3b5c", .2], ["#9cff3b", .5], ["#36d1ff", .8]].forEach(([col, x]) => { c.strokeStyle = col; c.lineWidth = 12; c.beginPath(); c.arc(w * x, h * .78, 44, -Math.PI / 2, -Math.PI / 2 + TAU * (.55 + x * .4)); c.stroke(); });
  });
  const glass = slab(rr(W - .12, H - .12, .36 * s, .36 * s), .02, ultra ? 0 : .03, M.black); glass.position.z = T / 2 + .03; g.add(glass);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - .3, H - .3), new THREE.MeshBasicMaterial({ map: face, toneMapped: false })); scr.position.z = T / 2 + (ultra ? .062 : .082); g.add(scr); // in front of the domed glass
  // domed cover glass catching the studio light
  const dome = slab(rr(W - .1, H - .1, .38 * s, .38 * s), .01, .05, new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, clearcoat: 1, transparent: true, opacity: .1, envMapIntensity: 2.6, depthWrite: false }), .045);
  dome.position.z = T / 2 + .09; g.add(dome);
  // digital crown with fine ridges
  const crownTex = canvasTex(renderer, 256, 16, (c, w, h) => { for (let x = 0; x < w; x += 4){ c.fillStyle = x % 8 ? "#777" : "#fff"; c.fillRect(x, 0, 4, h); } });
  const crownM = caseM.clone(); crownM.roughnessMap = null; crownM.bumpMap = crownTex; crownM.bumpScale = .02;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .14, 64), crownM); crown.rotation.z = Math.PI / 2; crown.position.set(W / 2 + .1, H * .18, 0); g.add(crown);
  const side = new THREE.Mesh(new THREE.BoxGeometry(.06, .42, .16), caseM); side.position.set(W / 2 + .06, -H * .16, 0); g.add(side);
  if (ultra){
    const act = new THREE.Mesh(new THREE.BoxGeometry(.06, .34, .16), new THREE.MeshStandardMaterial({ color: C("#ff6a1a"), roughness: .4, metalness: .3 })); act.position.set(-W / 2 - .06, H * .12, 0); g.add(act);
  }
  // sport band: two soft straps that curve back the way they sit on a wrist
  const bandCol = ultra ? "#3a3d42" : color;
  const bandM = new THREE.MeshPhysicalMaterial({ color: C(bandCol).multiplyScalar(ultra ? 1 : .86), roughness: .62, metalness: 0, clearcoat: .35, clearcoatRoughness: .5, side: THREE.DoubleSide });
  const strap = () => {
    const bw = W * .8, bt = .11, L = 2.7, Rb = 1.55;
    const geo = new THREE.ExtrudeGeometry(rr(bw, bt, bt * .48, bt * .48), { depth: L, steps: 60, bevelEnabled: false, curveSegments: 8 });
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++){
      v.fromBufferAttribute(pos, i);
      const th = v.z / Rb; // bend the length around a circle behind the case; thickness follows the curve
      pos.setXYZ(i, v.x, (Rb + v.y) * Math.sin(th), -Rb + (Rb + v.y) * Math.cos(th));
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, bandM);
  };
  const up = strap(); up.position.set(0, H / 2 - .12, -.06); g.add(up);
  const down = strap(); down.scale.y = -1; down.position.set(0, -H / 2 + .12, -.06); g.add(down);
  for (let i = 0; i < 6; i++){ // pin holes on the lower strap
    const th = (1.0 + i * .2) / 1.55, hole = new THREE.Mesh(new THREE.CircleGeometry(.04, 14), new THREE.MeshStandardMaterial({ color: C("#111"), roughness: 1 }));
    hole.position.set(0, -H / 2 + .12 - (1.55 + .056) * Math.sin(th), -.06 - 1.55 + (1.55 + .056) * Math.cos(th));
    hole.rotation.x = th; g.add(hole); // faces out along the bent strap
  }
  return { group: g, tinted: ultra ? [caseM, crownM] : [M.metal, crownM, bandM], pose: [.12, -.4, 0] };
}

/* ---------- Apple Vision Pro: curved glass front, aluminium frame, fabric light seal and knit band (front is +z) ---------- */
const VP = { a: 1.62, b: .78, n: 3.6, A: .42, B: .07 };
const vOut = (k = 1) => squircle(VP.a * k, VP.b * k, VP.n);
const vOpt = { bendX: VP.A, bendY: VP.B, hw: VP.a, hh: VP.b };
const vBend = (x, y) => -VP.A * (x / VP.a) ** 2 - VP.B * (y / VP.b) ** 2;
const meshAt = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
function visionKit(metal){
  return {
    metal,
    frontGlass: new THREE.MeshPhysicalMaterial({ color: C("#05060a"), metalness: .3, roughness: .03, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 2.4 }),
    fabric: new THREE.MeshStandardMaterial({ color: C("#8a8c90"), roughness: .96 }),
    knit: new THREE.MeshStandardMaterial({ color: C("#46484d"), roughness: .9, side: THREE.DoubleSide }),
    pod: new THREE.MeshPhysicalMaterial({ color: C("#dcdcd8"), roughness: .45, clearcoat: .4 }),
    dark: new THREE.MeshStandardMaterial({ color: C("#111215"), roughness: .5, metalness: .3 }),
    steel: new THREE.MeshStandardMaterial({ color: C("#b9bbc0"), roughness: .26, metalness: 1 })
  };
}
const VISION = {
  glass: (g, k, mat) => g.add(meshAt(loft(vOut(), slabProfile(.09, .035, .035), vOpt), mat || k.frontGlass, 0, 0, .4)),
  frame: (g, k) => {
    g.add(meshAt(loft(vOut(1.03), ringProfile(.84, .36), vOpt), k.metal, 0, 0, .16));
    const top = .8, cz = x => .16 + vBend(x, .77);
    g.add(meshAt(new THREE.CylinderGeometry(.085, .085, .09, 40), k.metal, 1.0, top + .035, cz(1.0)));
    g.add(meshAt(new THREE.BoxGeometry(.42, .05, .12), k.metal, -1.0, top + .01, cz(-1.0)));
    // audio straps: rigid arms that carry the speakers back toward the ears
    [-1, 1].forEach(s => { const p = slab(rr(.78, .3, .13, .13), .1, .02, k.pod); p.rotation.y = Math.PI / 2; p.position.set(s * 1.64, 0, -.64); g.add(p); });
  },
  seal: (g, k) => {
    g.add(meshAt(loft(vOut(.97), ringProfile(.62, .34, .05), vOpt), k.fabric, 0, 0, -.2));
    // solo knit band around the back of the head
    const pts = []; for (let i = 0; i <= 40; i++){ const t = i / 40 * Math.PI; pts.push(new THREE.Vector3(1.66 * Math.cos(t), 0, -1.02 - 1.7 * Math.sin(t))); }
    const band = new THREE.ExtrudeGeometry(rr(.5, .07, .03), { steps: 120, bevelEnabled: false, extrudePath: new THREE.CatmullRomCurve3(pts) });
    g.add(new THREE.Mesh(band, k.knit));
    g.add(meshAt(new THREE.CylinderGeometry(.13, .13, .07, 40).rotateZ(Math.PI / 2), k.dark, 1.62, 0, -1.4));
  }
};
function vision(renderer, item, color){
  const M = materials(color), k = visionKit(M.metal), g = new THREE.Group();
  VISION.glass(g, k); VISION.frame(g, k); VISION.seal(g, k);
  g.add(meshAt(loft(vOut(.86), slabProfile(.02), vOpt), k.dark, 0, 0, -.005)); // closes the frame from behind
  return { group: g, tinted: [M.metal], pose: [.12, -.55, 0] };
}

/* ---------- AirPods Max: aluminium cups with knit cushions, a wide colour-matched headband with a mesh inset,
   and short steel arms above each cup (front is +z, cups on ±x) ---------- */
const MX = { cx: 1.08, cy: -.55, a: .45, b: .56, n: 2.9, top: 1.2, y0: .42, yS: .24 };
let knitCanvas = null;
function knitTex(rx, ry){
  if (!knitCanvas){ // a fine diagonal knit, used as colour variation and as bump
    knitCanvas = document.createElement("canvas"); knitCanvas.width = knitCanvas.height = 64; const g = knitCanvas.getContext("2d");
    g.fillStyle = "#e4e4e4"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#a9a9a9";
    for (let y = 0; y < 64; y += 4) for (let x = (y / 4 % 2) * 2; x < 64; x += 4){ g.beginPath(); g.ellipse(x + 1, y + 1, 1.6, .9, Math.PI / 4, 0, TAU); g.fill(); }
  }
  const t = new THREE.CanvasTexture(knitCanvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
function maxKit(metal, color){
  const knit = new THREE.MeshStandardMaterial({ color: C(color).multiplyScalar(.92), roughness: .95, map: knitTex(26, 8), bumpMap: knitTex(26, 8), bumpScale: .004, side: THREE.DoubleSide });
  const inset = new THREE.MeshStandardMaterial({ color: C(color).multiplyScalar(.75), roughness: .95, map: knitTex(60, 3), bumpMap: knitTex(60, 3), bumpScale: .003, side: THREE.DoubleSide });
  return {
    metal, knit, inset,
    band: new THREE.MeshPhysicalMaterial({ color: C(color), roughness: .5, metalness: .2, clearcoat: .3, clearcoatRoughness: .5, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: C("#c9cbcf"), roughness: .16, metalness: 1 }),
    floor: new THREE.MeshStandardMaterial({ color: C("#1c1d20"), roughness: 1, map: knitTex(14, 6) })
  };
}
const cupOut = (k = 1) => squircle(MX.a * k, MX.b * k, MX.n);
// a cup frame: local +z points away from the head; children use cup-local coordinates
const cupFrame = s => { const g = new THREE.Group(); g.position.set(s * MX.cx, MX.cy, 0); g.rotation.y = s * Math.PI / 2; return g; };
/* the headband path: up from the right arm, an ellipse over the head, down to the left arm; returns [x, y, nx, ny] samples */
function bandPath(){
  const A = MX.cx, B = MX.top - MX.y0, p = [];
  for (let i = 0; i < 6; i++) p.push([A, MX.yS + (MX.y0 - MX.yS) * i / 6, 1, 0]);
  for (let i = 0; i <= 72; i++){ const th = Math.PI * i / 72, nx = Math.cos(th) / A, ny = Math.sin(th) / B, l = Math.hypot(nx, ny); p.push([A * Math.cos(th), MX.y0 + B * Math.sin(th), nx / l, ny / l]); }
  for (let i = 1; i <= 6; i++) p.push([-A, MX.y0 - (MX.y0 - MX.yS) * i / 6, -1, 0]);
  return p;
}
// a band swept along the path: width (along z) follows wFn(t), thickness h, pushed off the path by rOff; ends collapse to close it
function bandGeo(wFn, h, rOff, t0 = 0, t1 = 1, segs = 28){
  const path = bandPath(), N = path.length, rows = [], pos = [], uv = [], idx = [];
  path.forEach((q, i) => { const t = i / (N - 1); if (t >= t0 - 1e-6 && t <= t1 + 1e-6) rows.push([q, t]); });
  const all = [[rows[0][0], rows[0][1], 0], ...rows.map(r => [r[0], r[1], 1]), [rows[rows.length - 1][0], rows[rows.length - 1][1], 0]];
  all.forEach(([[x, y, nx, ny], t, k], i) => {
    const w = wFn(t) * k, hh = h * k;
    for (let j = 0; j < segs; j++){
      const f = j / segs * TAU, c = Math.cos(f), s = Math.sin(f);
      const zc = w / 2 * Math.sign(c) * Math.pow(Math.abs(c), .5), rc = rOff + hh / 2 * Math.sign(s) * Math.pow(Math.abs(s), .5);
      pos.push(x + nx * rc, y + ny * rc, zc); uv.push(j / segs, t);
    }
  });
  for (let i = 0; i < all.length - 1; i++) for (let j = 0; j < segs; j++){ const a = i * segs + j, b = i * segs + (j + 1) % segs, c2 = a + segs, d = b + segs; idx.push(a, b, c2, b, d, c2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const bandW = t => .2 + .52 * Math.pow(Math.sin(Math.PI * t), 1.6);
const MAXP = {
  shell: (g, k, right) => {
    g.add(new THREE.Mesh(loft(cupOut(), slabProfile(.42, .2, .14)), k.metal));
    if (right){ // Digital Crown and the noise-control button on top of the right cup
      g.add(meshAt(new THREE.CylinderGeometry(.075, .075, .1, 40), k.metal, -.2, .6, .02));
      g.add(meshAt(new THREE.BoxGeometry(.16, .035, .07), k.metal, .16, .56, .02));
    }
  },
  // a thick knit pad the size of the cup with an oval opening; the dark acoustic mesh sits at the bottom of it
  cushion: (g, k) => {
    g.add(meshAt(loft(cupOut(.99), ringProfile(.5, .3, .16)), k.knit, 0, 0, -.365));
    g.add(meshAt(loft(squircle(.24, .3, 2.6), slabProfile(.01)), k.floor, 0, 0, -.235));
  },
  headband: (g, k) => {
    g.add(new THREE.Mesh(bandGeo(bandW, .075, 0), k.band));
    g.add(new THREE.Mesh(bandGeo(t => bandW(t) * .74, .02, -.04, .2, .8), k.inset)); // mesh on the underside
    [-1, 1].forEach(s => {
      const x = s * MX.cx;
      g.add(meshAt(new THREE.CylinderGeometry(.05, .05, .05, 28), k.steel, x, MX.yS, 0));
      g.add(meshAt(new THREE.CylinderGeometry(.03, .034, MX.yS - .1, 24), k.steel, x, (MX.yS + .1) / 2, 0));
      g.add(meshAt(new THREE.SphereGeometry(.058, 24, 16), k.steel, x, .1, 0));
      g.add(meshAt(new THREE.CylinderGeometry(.085, .095, .05, 28), k.steel, x, .035, 0));
    });
  }
};
function max(renderer, item, color){
  const M = materials(color), k = maxKit(M.metal, color), g = new THREE.Group();
  [-1, 1].forEach(s => { const c = cupFrame(s); MAXP.shell(c, k, s > 0); MAXP.cushion(c, k); g.add(c); });
  MAXP.headband(g, k);
  return { group: g, tinted: [M.metal, k.band, k.knit, k.inset], pose: [.12, .55, 0] };
}

const BUILDERS = { mac, ipad, airpods, watch, vision, max };
function build(renderer, item, color){
  if (item.type === "iphone"){ const r = F.buildReal(renderer, item, color); return { group: r.group, tinted: r.tinted, pose: [.08, Math.PI - .5, -.04] }; }
  return BUILDERS[item.type](renderer, item, color);
}

/* ---------- thumbnails: one hidden renderer draws every product once per colour ---------- */
let tr = null, ts, tc;
const cache = new Map(), pending = new Map(), queue = [];
let busy = false, ready = false;
// start drawing thumbnails a moment after load, so the opening animation gets the main thread first
setTimeout(() => { ready = true; pump(); }, 1200);
function thumbRenderer(){
  if (tr) return tr;
  const canvas = document.createElement("canvas");
  tr = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  tr.setPixelRatio(1); tr.setSize(420, 420, false);
  tr.outputEncoding = THREE.sRGBEncoding; tr.toneMapping = THREE.ACESFilmicToneMapping;
  ts = new THREE.Scene(); ts.environment = F.environment(tr);
  ts.add(new THREE.HemisphereLight(0xffffff, 0x2a2724, .55));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-5, 7, 9); ts.add(key);
  tc = new THREE.PerspectiveCamera(26, 1, .1, 200);
  return tr;
}
/* soft contact shadow: a blurred dark ellipse on the floor under an object */
let shadowTexture = null;
function contactShadow(w, d, strength = .55){
  if (!shadowTexture){
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(.35, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); shadowTexture = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: strength, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.renderOrder = -1; m.userData.shadow = true;
  return m;
}
/* centre the object, look at it from slightly above, and put its shadow under it */
function frame(obj, cam, margin = 1.18, shadowParent){
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  obj.position.sub(mid);
  const fov = THREE.MathUtils.degToRad(cam.fov / 2), fit = Math.max(size.y * 1.12, size.x / cam.aspect) / 2 / Math.tan(fov) * margin;
  const dist = fit + size.z / 2;
  cam.position.set(0, dist * .16, dist); cam.lookAt(0, -size.y * .04, 0);
  if (shadowParent){
    const old = shadowParent.children.find(c => c.userData.shadow); if (old) shadowParent.remove(old);
    const foot = Math.max(size.x, size.z) * 1.15, sh = contactShadow(foot, Math.max(size.z, foot * .45) * 1.1);
    sh.position.set(0, -size.y / 2 - .04, 0); shadowParent.add(sh);
  }
}
function dispose(obj){
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => { if (m.map){ m.map._dead = true; m.map.dispose(); } m.dispose(); });
  });
}
let lastInteraction = 0;
addEventListener("scroll", () => { lastInteraction = performance.now(); }, { passive: true });
function schedulePump(){
  if ("requestIdleCallback" in window) requestIdleCallback(pump, { timeout: 1000 });
  else setTimeout(pump, 80);
}
async function pump(){
  if (!ready || busy || !queue.length) return;
  if (document.hidden || performance.now() - lastInteraction < 120){ setTimeout(schedulePump, 150); return; }
  busy = true;
  const { item, ci, resolve } = queue.shift(), key = item.id + ":" + ci;
  try {
    const r = thumbRenderer(), b = build(r, item, item.colors[ci].body);
    F.batch(b.group);
    const wrap = new THREE.Group(); wrap.add(b.group); b.group.rotation.set(...b.pose);
    const holder = new THREE.Group(); holder.add(wrap); ts.add(holder);
    tc.aspect = 1; tc.updateProjectionMatrix(); frame(wrap, tc, 1.18, holder);
    r.render(ts, tc);
    const blob = await new Promise(resolve => r.domElement.toBlob(resolve, "image/webp", .9));
    const url = blob ? URL.createObjectURL(blob) : "";
    ts.remove(holder); dispose(holder);
    cache.set(key, url); resolve(url);
  } catch (e) { resolve(""); }
  pending.delete(key);
  busy = false;
  schedulePump();
}
function thumb(item, ci = 0){
  const key = item.id + ":" + ci;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (pending.has(key)) return pending.get(key);
  const task = new Promise(resolve => { queue.push({ item, ci, resolve }); });
  pending.set(key, task);
  schedulePump();
  return task;
}

/* ---------- "por dentro" adapters: each device as a stack of layers along +z (front), drawn in chalk lines ----------
   An adapter gives the story engine: real model + how to rotate it into layer space, the layers, and the camera keys. */
function lineAdapter(P){
  const TAU2 = Math.PI * 2;
  const { shapeMesh, box, cyl, flat, circles, hole, kit } = F;
  const FILL = new THREE.MeshBasicMaterial(), NOFILL = new THREE.MeshBasicMaterial(); NOFILL.userData.role = "none";
  const inkMat = t => { const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); m.userData.role = "flat"; return m; };
  const L4 = m => [FILL, FILL, FILL, FILL, m, FILL];
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lidTex = (k, title, sub) => inkMat(k.ink(256, 256, (g, w, h) => {
    g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16); g.textAlign = "center";
    g.font = '600 64px "Archivo", sans-serif'; g.fillText(title, w / 2, h * .56);
    g.font = '500 18px "IBM Plex Mono", monospace'; g.fillStyle = "#8f8b84"; g.fillText(sub, w / 2, h * .76);
  }));
  const cellTex = k => inkMat(k.ink(300, 300, (g, w, h) => {
    g.lineWidth = 2; g.strokeRect(10, 10, w - 20, h - 20);
    g.font = '600 26px "Archivo", sans-serif'; g.fillText("Li-ion", 26, 54);
    g.globalAlpha = .35; for (let i = 0; i < 5; i++){ g.beginPath(); g.moveTo(26, 90 + i * 22); g.lineTo(w - 26, 90 + i * 22); g.stroke(); } g.globalAlpha = 1;
  }));
  const pcbTex = k => inkMat(k.ink(512, 360, (g, w, h) => {
    g.globalAlpha = .5; g.lineWidth = 1.4;
    for (let i = 0; i < 70; i++){ let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 3; j++){ rnd() < .5 ? x += (rnd() - .5) * 120 : y += (rnd() - .5) * 90; g.lineTo(x, y); } g.stroke(); }
    g.globalAlpha = 1; g.lineWidth = 2; g.strokeRect(6, 6, w - 12, h - 12);
  }));
  const F0 = TAU2 - .45, B0 = F0 + Math.PI;
  const steps = (ids, span) => ids.map((_, j) => span / 2 - j * span / (ids.length - 1));

  if (P.type === "mac"){
    const W = .42 * P.geo.inch, Dm = W * .7, pro = P.geo.pro;
    const KW = W * .84, KD = Dm * .4, ky = Dm * .14;
    const ids = ["display", "keyboard", "board", "battery", "ports", "bottom"], zE = steps(ids, 4.2);
    const defs = {
      display: { z0: .1, center: [0, 0, 0], view: { side: "F", ry: .05, rx: .1, s: 1.1 },
        callouts: [{ p: [0, Dm / 2 - .12, .03], t: "Câmera 12 MP", d: "Center Stage no entalhe" }, { p: [-W * .25, 0, .03], t: `Liquid Retina${pro ? " XDR" : ""}`, d: `${P.geo.inch.toLocaleString("pt-BR")} polegadas` }, { p: [W * .35, Dm / 2, -.01], t: "Dobradiça", d: "abre com um dedo" }],
        build: (g, k) => {
          g.add(shapeMesh(F.rr(W, Dm, .22, .22), .03, .01, FILL));
          g.add(flat(new THREE.PlaneGeometry(W - .3, Dm - .3), inkMat(k.ink(640, 450, (c, w, h) => {
            c.lineWidth = 2; c.strokeRect(4, 4, w - 8, h - 8); c.fillRect(w / 2 - 40, 0, 80, 18);
            c.globalAlpha = .25; for (let i = 1; i < 8; i++){ c.beginPath(); c.moveTo(0, i * h / 8); c.lineTo(w, i * h / 8); c.stroke(); } c.globalAlpha = 1;
            c.font = '500 20px "IBM Plex Mono", monospace'; c.fillText("LIQUID RETINA", 24, h - 24);
          })), 0, 0, .026));
          g.add(cyl(.05, .04, FILL, 0, Dm / 2 - .12, .01, 24));
        } },
      keyboard: { z0: .05, center: [0, 0, 0], view: { side: "F", ry: -.1, rx: .15, s: 1.15 },
        callouts: [{ p: [-W * .2, ky, .02], t: "Magic Keyboard", d: "teclas com iluminação" }, { p: [KW / 2 - KW / 28, ky + KD / 2 - KD / 12, .03], t: "Touch ID", d: "desbloqueia e confirma compras" }, { p: [0, -Dm * .28, .02], t: "Trackpad Force Touch", d: "clique em qualquer ponto" }],
        build: (g, k) => {
          g.add(shapeMesh(F.rr(W - .04, Dm - .04, .2, .2), .02, .005, FILL));
          g.add(flat(new THREE.PlaneGeometry(KW, KD), inkMat(k.ink(840, 400, (c, w, h) => {
            const cols = 14, rows = 6, pw = w / cols, ph = h / rows; c.lineWidth = 2;
            for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++){ if (r === 5 && q > 4 && q <= 8) continue; const wide = r === 5 && q === 4 ? 5 : 1; F.rrPath(c, q * pw + 4, r * ph + 4, pw * wide - 8, ph - 8, 6); c.stroke(); }
            c.beginPath(); c.arc(w - pw / 2, ph / 2, ph * .28, 0, Math.PI * 2); c.stroke();
          })), 0, ky, .016));
          g.add(shapeMesh(F.rr(W * .42, Dm * .3, .08, .08, 0, -Dm * .28), .006, 0, FILL, .014));
        } },
      board: { z0: .01, center: [0, Dm * .22, 0], view: { side: "F", ry: .1, rx: .25, s: 2.2 },
        callouts: [{ p: [-W * .04, Dm * .22, .07], t: `Chip ${P.chip}`, d: "CPU, GPU e Neural Engine" }, { p: [W * .1, Dm * .3, .05], t: "Memória unificada", d: "no mesmo encapsulamento" }, { p: [-W * .12, Dm * .1, .05], t: "SSD", d: "armazenamento rápido" }],
        build: (g, k) => {
          g.add(shapeMesh(F.rr(W * .34, Dm * .42, .1, .1, 0, Dm * .22), .025, 0, FILL));
          g.add(flat(new THREE.PlaneGeometry(W * .34 - .06, Dm * .42 - .06), pcbTex(k), 0, Dm * .22, .0135));
          g.add(box(.7, .7, .05, L4(lidTex(k, P.chip, "APPLE SILICON")), -W * .04, Dm * .22, .04));
          g.add(box(.3, .45, .03, FILL, W * .1, Dm * .3, .03)); g.add(box(.3, .45, .03, FILL, W * .1, Dm * .13, .03));
          g.add(box(.5, .25, .03, FILL, -W * .12, Dm * .1, .03));
        } },
      battery: { z0: -.03, center: [0, -Dm * .05, 0], view: { side: "F", ry: -.05, rx: .2, s: 1.2 },
        callouts: [{ p: [0, -Dm * .14, .05], t: "Bateria", d: "células de polímero de lítio" }, { p: [W * .33, Dm * .22, .05], t: "Células laterais", d: "ao lado da placa" }, { p: [-W * .45, -Dm * .14, .02], t: "Conector", d: pro ? "até 24 h de vídeo" : "carga por MagSafe 3" }],
        build: (g, k) => {
          [-1, 0, 1].forEach(i => { g.add(shapeMesh(F.rr(W * .27, Dm * .34, .06, .06, i * W * .3, -Dm * .14), .06, .004, FILL)); g.add(flat(new THREE.PlaneGeometry(W * .25, Dm * .3), cellTex(k), i * W * .3, -Dm * .14, .035)); });
          [-1, 1].forEach(i => g.add(shapeMesh(F.rr(W * .24, Dm * .3, .06, .06, i * W * .33, Dm * .22), .06, .004, FILL)));
        } },
      ports: { z0: -.05, center: [0, Dm * .05, 0], view: { side: "F", ry: .25, rx: .2, s: 1.15 },
        callouts: [{ p: [W * .44, Dm * .05, .04], t: "Alto-falantes", d: pro ? "seis, com graves fortes" : "som estéreo" }, { p: [-W / 2 + .2, Dm * .3, .04], t: "MagSafe 3", d: "carga que solta se puxar" }, { p: [-W / 2 + .2, Dm * .12, .04], t: "Thunderbolt", d: pro ? "três portas" : "duas portas" }].concat(pro ? [{ p: [W * .2, Dm * .33, .04], t: "Ventoinha", d: "ar quente sai pelas laterais" }] : []),
        build: g => {
          [-1, 1].forEach(i => g.add(box(.35, Dm * .55, .06, FILL, i * W * .44, Dm * .05, 0)));
          g.add(box(.3, Dm * .35, .05, FILL, -W / 2 + .2, Dm * .22, 0));
          g.add(box(.1, .2, .06, FILL, -W / 2 + .07, Dm * .3, .01)); g.add(box(.1, .15, .06, FILL, -W / 2 + .07, Dm * .12, .01));
          if (pro){ g.add(cyl(.45, .05, FILL, W * .2, Dm * .33, 0, 48)); circles(g, W * .2, Dm * .33, .03, [.4, .3, .12], 48); }
        } },
      bottom: { z0: -.085, center: [0, 0, 0], view: { side: "F", ry: -.2, rx: .1, s: 1.05 },
        callouts: [{ p: [-W * .3, -Dm * .2, .03], t: "Alumínio", d: "fundo usinado numa peça" }, { p: [W / 2 - .4, -Dm / 2 + .4, -.05], t: "Pés de borracha", d: "firmes na mesa" }, { p: [0, Dm / 2 - .1, .03], t: pro ? "Saída de ar" : "Sem ventoinha", d: pro ? "pela dobradiça" : "resfriamento passivo" }],
        build: g => {
          g.add(shapeMesh(F.rr(W, Dm, .22, .22), .04, .015, FILL));
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(.12, .03, FILL, a * (W / 2 - .4), b * (Dm / 2 - .4), -.04, 24)));
        } }
    };
    // the model grows with the screen size, so the camera scale shrinks with it: every Mac fills about the same space on the page
    const sz = 10.6 / P.geo.inch;
    return {
      W, H: Dm * 1.2, realRot: [Math.PI / 2, 0, 0], // span: its on-screen width when seen at an angle in the hero
      keys: { hero: { x: 0, y: -1.6, rx: -1.15, ry: -.42, s: 1.15 * sz }, design: { x: -2.3, y: -.5, rx: -1.0, ry: .55, s: .8 * sz },
        open: { x: 1.8, rx: -1.0, ry: F0 - .1, s: .85 * sz, e: 1 }, assemble: { x: 2.3, y: -.3, rx: -1.1, ry: TAU2 * 2 - .4, s: 1 * sz },
        specs: { x: 3.6, rx: -1.1, ry: TAU2 * 2 + .5, s: .85 * sz, ma: .12 }, buy: { x: 2.8, y: -.3, rx: -1.1, ry: TAU2 * 2 - .35, s: .9 * sz } },
      baseRx: -1.05, F: F0, B: B0, yawZ: true,
      parts: renderer => { const k = kit(renderer); return ids.map((id, j) => ({ id, ...defs[id], zE: zE[j], build: g => defs[id].build(g, k) })); }
    };
  }

  if (P.type === "ipad"){
    const H = 5.4, W = 3.86, R = .32, pro = P.geo.pro;
    const ids = ["display", "board", "battery", "cam", "body"], zE = steps(ids, 6);
    const defs = {
      display: { z0: .07, center: [0, 0, 0], view: { side: "F", ry: .2, rx: .2, s: 1 },
        callouts: [{ p: [-W * .2, H * .15, .02], t: pro ? "Ultra Retina XDR" : "Liquid Retina", d: pro ? "OLED em duas camadas" : "laminada e antirreflexo" }, { p: [W / 2 - .2, 0, .02], t: "Câmera frontal", d: "na borda horizontal" }, { p: [0, -H / 2 + .3, -.01], t: "Conector flex", d: "liga a tela à placa" }],
        build: (g, k) => { g.add(shapeMesh(F.rr(W - .06, H - .06, R), .02, .006, FILL)); g.add(flat(new THREE.PlaneGeometry(W - .3, H - .3), inkMat(k.ink(420, 590, (c, w, h) => { c.lineWidth = 2; c.strokeRect(4, 4, w - 8, h - 8); c.globalAlpha = .25; for (let i = 1; i < 10; i++){ c.beginPath(); c.moveTo(0, i * h / 10); c.lineTo(w, i * h / 10); c.stroke(); } })), 0, 0, .017)); g.add(cyl(.06, .04, FILL, W / 2 - .2, 0, .0, 24)); g.add(box(.8, .4, .01, FILL, 0, -H / 2 + .3, -.02)); } },
      board: { z0: .02, center: [W * .32, 0, 0], view: { side: "F", ry: .1, rx: .35, s: 1.8 },
        callouts: [{ p: [W * .32, .3, .06], t: `Chip ${P.chip}`, d: "numa placa estreita" }, { p: [W * .32, -1.1, .04], t: "Wi‑Fi e Bluetooth", d: "antenas nas bordas" }, { p: [W * .32, -H / 2 + .5, .03], t: "USB‑C", d: "carga e acessórios" }],
        build: (g, k) => { g.add(shapeMesh(F.rr(W * .3, H * .8, .1, .1, W * .32, 0), .025, 0, FILL)); g.add(flat(new THREE.PlaneGeometry(W * .3 - .06, H * .8 - .06), pcbTex(k), W * .32, 0, .0135)); g.add(box(.6, .6, .05, L4(lidTex(k, P.chip, "APPLE")), W * .32, .3, .04)); g.add(box(.4, .3, .03, FILL, W * .32, -1.1, .03)); g.add(box(.4, .2, .04, FILL, W * .32, -H / 2 + .5, .03)); } },
      battery: { z0: -.01, center: [-W * .15, 0, 0], view: { side: "F", ry: .2, rx: .3, s: 1.1 },
        callouts: [{ p: [-W * .15, H * .22, .05], t: "Célula 1", d: "polímero de lítio" }, { p: [-W * .15, -H * .22, .05], t: "Célula 2", d: "dia todo de uso" }],
        build: (g, k) => { [1, -1].forEach(s2 => { g.add(shapeMesh(F.rr(W * .62, H * .42, .1, .1, -W * .15, s2 * H * .22), .06, .004, FILL)); g.add(flat(new THREE.PlaneGeometry(W * .58, H * .38), cellTex(k), -W * .15, s2 * H * .22, .035)); }); } },
      cam: { z0: -.04, center: [W / 2 - .6, H / 2 - .6, 0], view: { side: "B", ry: .5, rx: .25, s: 2.4 },
        callouts: [{ p: [W / 2 - .6, H / 2 - .6, -.08], t: "Câmera traseira", d: "fotos e documentos" }].concat(pro ? [{ p: [W / 2 - .42, H / 2 - .42, -.08], t: "LiDAR", d: "mede o ambiente" }] : []).concat([{ p: [W / 2 - .2, 0, -.02], t: "Câmera frontal", d: "12 MP na horizontal" }]),
        build: g => { g.add(box(.6, .6, .1, FILL, W / 2 - .6, H / 2 - .6, 0)); g.add(cyl(.16, .1, FILL, W / 2 - .6, H / 2 - .6, -.07, 32)); circles(g, W / 2 - .6, H / 2 - .6, -.121, [.12, .06]); if (pro){ g.add(cyl(.08, .08, FILL, W / 2 - .42, H / 2 - .42, -.06, 24)); } g.add(box(.25, .25, .06, FILL, W / 2 - .2, 0, 0)); } },
      body: { z0: -.075, center: [0, 0, 0], view: { side: "B", ry: .35, rx: .15, s: .95 },
        callouts: [{ p: [-W * .2, 0, -.03], t: "Alumínio", d: "carcaça em uma peça" }, { p: [-W / 2 + .1, H / 2 - .3, 0], t: "Alto-falantes", d: pro ? "quatro, um em cada canto" : "estéreo" }, { p: [W / 2 - 1, H / 2, 0], t: pro ? "Botão superior" : "Touch ID", d: pro ? "Face ID na frente" : "no botão de cima" }],
        build: g => { const ring = F.rr(W, H, R); ring.holes.push(hole(W - .12, H - .12, R - .06, 0, 0)); g.add(shapeMesh(ring, .1, .02, FILL)); g.add(shapeMesh(F.rr(W - .06, H - .06, R - .03), .01, .004, FILL, -.05)); g.add(box(.45, .05, .06, FILL, W / 2 - 1, H / 2 + .02, 0)); [-1, 1].forEach(s2 => g.add(box(.3, .08, .05, FILL, s2 * (W / 2 - .5), H / 2 - .05, 0))); } }
    };
    return {
      W, H, realRot: [0, 0, 0],
      keys: { hero: { x: 0, y: -.05, rx: .06, ry: -.32, rz: .04, s: 1.1 }, design: { x: -2.4, rx: .1, ry: Math.PI - .5, rz: -.05, s: 1.1 },
        open: { x: 1.7, rx: .3, ry: TAU2 - 1.0, s: .62, e: 1 }, assemble: { x: 2.3, rx: .05, ry: 2 * TAU2 - .35, rz: .04, s: 1.1 },
        specs: { x: 3.5, rx: .1, ry: 2 * TAU2 + .6, s: 1, ma: .12 }, buy: { x: 2.7, rx: .06, ry: 2 * TAU2 + Math.PI - .5, rz: -.04, s: .95 } },
      baseRx: 0, F: TAU2 - 1.0, B: TAU2 - 1.0 + Math.PI,
      parts: renderer => { const k = kit(renderer); return ids.map((id, j) => ({ id, ...defs[id], zE: zE[j], build: g => defs[id].build(g, k) })); }
    };
  }

  if (P.type === "watch"){
    const s = P.geo.mm / 46, ultra = P.geo.ultra, W = 1.62 * s * (ultra ? 1.06 : 1), H = 1.95 * s * (ultra ? 1.04 : 1), R = .42 * s;
    const ids = ["glass", "display", "chip", "battery", "case", "back"], zE = steps(ids, 3.6);
    const defs = {
      glass: { z0: .3, center: [0, 0, 0], view: { side: "F", ry: .2, rx: .2, s: 2.4 },
        callouts: [{ p: [W * .2, H * .25, .04], t: ultra ? "Safira" : "Vidro Ion-X", d: ultra ? "plano, protegido pela borda" : "curvo, resiste a riscos" }, { p: [-W * .3, -H * .3, .04], t: "Bordas finas", d: "tela quase até a borda" }],
        build: g => { g.add(shapeMesh(F.rr(W - .06, H - .06, R), .02, ultra ? .005 : .04, NOFILL)); } },
      display: { z0: .22, center: [0, 0, 0], view: { side: "F", ry: .25, rx: .2, s: 2.5 },
        callouts: [{ p: [0, H * .1, .02], t: "OLED sempre ativa", d: "acende quando você olha" }, { p: [0, -H / 2 + .12, -.02], t: "Conector", d: "liga a tela à placa" }],
        build: (g, k) => { g.add(shapeMesh(F.rr(W - .14, H - .14, R - .06), .02, 0, FILL)); g.add(flat(new THREE.PlaneGeometry(W - .3, H - .3), inkMat(k.ink(300, 360, (c, w, h) => { c.textAlign = "center"; c.font = '600 90px "Archivo", sans-serif'; c.fillText("10:09", w / 2, h * .55); c.lineWidth = 6; [.25, .5, .75].forEach(x => { c.beginPath(); c.arc(w * x, h * .8, 22, 0, 4.5); c.stroke(); }); })), 0, 0, .011)); g.add(box(.4, .15, .01, FILL, 0, -H / 2 + .12, -.015)); } },
      chip: { z0: .12, center: [0, 0, 0], view: { side: "F", ry: .1, rx: .35, s: 2.8 },
        callouts: [{ p: [0, H * .08, .05], t: `Chip ${P.chip}`, d: "apps, Siri e saúde" }, { p: [W * .25, -H * .25, .04], t: "Taptic Engine", d: "toques no pulso" }, { p: [-W * .3, H * .3, .03], t: "Antenas", d: ultra ? "5G e satélite" : "Bluetooth e Wi‑Fi" }],
        build: (g, k) => { g.add(shapeMesh(F.rr(W * .78, H * .62, .1, .1), .02, 0, FILL)); g.add(box(.55, .55, .05, L4(lidTex(k, P.chip, "SiP")), 0, H * .08, .03)); g.add(box(.45, .25, .07, FILL, W * .25, -H * .25, .03)); } },
      battery: { z0: .02, center: [0, 0, 0], view: { side: "F", ry: .2, rx: .3, s: 2.6 },
        callouts: [{ p: [0, 0, .07], t: "Bateria", d: ultra ? "até 42 h" : P.id === "watch-series-11" ? "até 24 h" : "para o dia todo" }, { p: [W * .3, H * .3, .02], t: "Conector", d: "carga rápida" }],
        build: (g, k) => { g.add(shapeMesh(F.rr(W * .7, H * .58, .12, .12), .1, .006, FILL)); g.add(flat(new THREE.PlaneGeometry(W * .64, H * .52), cellTex(k), 0, 0, .057)); } },
      case: { z0: 0, center: [0, 0, 0], view: { side: "F", ry: -.6, rx: .2, s: 2.2 },
        callouts: [{ p: [W / 2 + .1, H * .18, 0], t: "Digital Crown", d: "gira e clica" }, { p: [W / 2 + .06, -H * .16, 0], t: "Botão lateral", d: "apps e emergência" }, { p: [-W / 2 - .05, 0, 0], t: ultra ? "Titânio" : "Alumínio", d: ultra ? "com Botão de Ação laranja" : "leve e resistente" }],
        build: g => { const ring = F.rr(W, H, R); ring.holes.push(hole(W - .16, H - .16, R - .08, 0, 0)); g.add(shapeMesh(ring, .3, .06, FILL, 0, .05)); g.add(cyl(.13, .14, FILL, W / 2 + .1, H * .18, 0, 32).rotateY(Math.PI / 2)); g.add(box(.06, .42, .16, FILL, W / 2 + .06, -H * .16, 0)); if (ultra) g.add(box(.06, .34, .16, FILL, -W / 2 - .06, H * .12, 0)); } },
      back: { z0: -.24, center: [0, 0, 0], view: { side: "B", ry: .2, rx: .25, s: 2.4 },
        callouts: [{ p: [0, 0, -.06], t: "Sensor cardíaco", d: "LEDs e fotodiodos" }, { p: [W * .3, H * .3, -.04], t: "Carga magnética", d: "encaixa no carregador" }, { p: [-W * .3, -H * .3, -.04], t: "Sono e treinos", d: "lidos o dia todo" }],
        build: g => { g.add(shapeMesh(F.rr(W * .92, H * .9, R * .9), .05, .03, FILL)); circles(g, 0, 0, -.081, [.45 * s, .32 * s, .14 * s], 48); for (let i = 0; i < 8; i++){ const a = i / 8 * TAU2; circles(g, Math.cos(a) * .38 * s, Math.sin(a) * .38 * s, -.082, [.035], 12); } } }
    };
    return {
      W: W * 1.1, H: H * 2.4, realRot: [0, 0, 0],
      keys: { hero: { x: 0, y: .05, rx: .1, ry: -.35, rz: .03, s: 1.35 }, design: { x: -2.4, rx: .15, ry: Math.PI - .6, s: 1.3 },
        open: { x: 1.6, rx: .3, ry: TAU2 - 1.0, s: 1.25, e: 1 }, assemble: { x: 2.3, rx: .1, ry: 2 * TAU2 - .35, s: 1.35 },
        specs: { x: 3.4, rx: .1, ry: 2 * TAU2 + .5, s: 1.2, ma: .12 }, buy: { x: 2.7, rx: .1, ry: 2 * TAU2 - .4, s: 1.2 } },
      baseRx: 0, F: TAU2 - 1.0, B: TAU2 - 1.0 + Math.PI,
      parts: renderer => { const k = kit(renderer); return ids.map((id, j) => ({ id, ...defs[id], zE: zE[j], build: g => defs[id].build(g, k) })); }
    };
  }

  // Vision Pro and AirPods Max only come as solid parts (REAL); these entries place the layers, cameras and labels
  const solid = (ids, defs, span, rest) => ({ ...rest, parts: () => { const zE = steps(ids, span); return ids.map((id, j) => ({ id, ...defs[id], zE: zE[j], build: () => {} })); } });
  if (P.type === "vision"){
    const Z = VP_Z, at = (x, y, z, id) => [x, y, z - Z[id]], fz = (x, y, d) => .4 + vBend(x, y) + d;
    return solid(["glass", "sensors", "chips", "displays", "frame", "seal"], {
      glass: { z0: Z.glass, center: [0, 0, 0], view: { side: "F", ry: .3, rx: .15, s: 1.6 },
        callouts: [{ p: at(-.8, .3, fz(-.8, .3, .05), "glass"), t: "Vidro laminado 3D", d: "curvo, numa peça só" }, { p: at(.45, -.1, .34 + vBend(.45, -.1), "glass"), t: "EyeSight", d: "mostra seus olhos por fora" }] },
      sensors: { z0: Z.sensors, center: [0, -.15, 0], view: { side: "F", ry: .25, rx: .22, s: 1.9 },
        callouts: [{ p: at(.5, -.42, .33 + vBend(.5, -.42), "sensors"), t: "Câmeras principais", d: "vídeo e fotos espaciais" }, { p: at(0, -.5, .33 + vBend(0, -.5), "sensors"), t: "LiDAR e TrueDepth", d: "medem o ambiente e o rosto" }, { p: at(-1.35, .05, .33 + vBend(-1.35, .05), "sensors"), t: "Câmeras de rastreio", d: "mãos e espaço à volta" }] },
      chips: { z0: Z.chips, center: [0, .2, 0], view: { side: "F", ry: .1, rx: .35, s: 2.2 },
        callouts: [{ p: at(-.38, .28, .19, "chips"), t: "Chip M5", d: "visionOS e apps" }, { p: at(.32, .28, .19, "chips"), t: "Chip R1", d: "câmeras e sensores em 12 ms" }, { p: at(1.1, .1, .12 + vBend(1.1, .1) + .04, "chips"), t: "Ventilação", d: "silenciosa, tira o calor" }] },
      displays: { z0: Z.displays, center: [0, 0, 0], view: { side: "B", ry: .3, rx: .18, s: 2.1 },
        callouts: [{ p: at(-.62, .02, -.15 + vBend(-.62, .02), "displays"), t: "Micro-OLED", d: "uma tela por olho, 23 mi de pixels" }, { p: at(.62, .25, -.12 + vBend(.62, .25), "displays"), t: "Lentes", d: "três elementos, sob medida" }, { p: at(0, -.24, -.04, "displays"), t: "Ajuste dos olhos", d: "motor alinha as telas" }] },
      frame: { z0: Z.frame, center: [0, 0, -.2], view: { side: "F", ry: -.6, rx: .2, s: 1.45 },
        callouts: [{ p: at(1.0, .84, .16 + vBend(1.0, .77), "frame"), t: "Digital Crown", d: "volume e imersão" }, { p: at(-1.0, .82, .16 + vBend(-1, .77), "frame"), t: "Botão superior", d: "fotos e vídeos espaciais" }, { p: at(1.7, 0, -.64, "frame"), t: "Alto-falantes", d: "áudio espacial perto do ouvido" }] },
      seal: { z0: Z.seal, center: [0, 0, -1], view: { side: "B", ry: .55, rx: .25, s: 1 },
        callouts: [{ p: at(-.9, .5, -.05 + vBend(-.9, .5), "seal"), t: "Vedação de luz", d: "presa por ímãs" }, { p: at(0, .25, -2.74, "seal"), t: "Faixa de malha 3D", d: "uma peça, sem costura" }, { p: at(1.66, 0, -1.4, "seal"), t: "Botão de ajuste", d: "aperta ou solta a faixa" }] }
    }, 4.6, {
      W: 3.4, H: 2.4, realRot: [0, 0, 0],
      keys: { hero: { x: 0, y: -.1, rx: .12, ry: -.5, s: 1.35 }, design: { x: -2.4, rx: .12, ry: Math.PI - .6, s: 1.15 },
        open: { x: 1.6, rx: .25, ry: F0, s: .85, e: 1 }, assemble: { x: 2.3, rx: .1, ry: 2 * TAU2 - .45, s: 1.3 },
        specs: { x: 3.4, rx: .1, ry: 2 * TAU2 + .5, s: 1.15, ma: .12 }, buy: { x: 2.7, rx: .1, ry: 2 * TAU2 - .4, s: 1.2 } },
      baseRx: 0, F: F0, B: B0
    });
  }
  if (P.type === "max"){
    const Z = MAX_Z, c = (u, v, w, id) => [u, v + MX.cy, MX.cx + w - Z[id]], HALF = Math.PI / 2;
    return solid(["shell", "board", "battery", "driver", "cushion", "headband"], {
      shell: { z0: Z.shell, center: [0, MX.cy, 0], view: { side: "F", ry: .35, rx: .2, s: 2.4 },
        callouts: [{ p: c(-.2, .65, .02, "shell"), t: "Digital Crown", d: "volume, faixas e Siri" }, { p: c(.2, .58, .02, "shell"), t: "Botão de ruído", d: "cancelamento ou modo Ambiente" }, { p: c(.1, -.2, .19, "shell"), t: "Alumínio anodizado", d: "concha leve e firme" }] },
      board: { z0: Z.board, center: [0, MX.cy, 0], view: { side: "F", ry: .12, rx: .3, s: 2.7 },
        callouts: [{ p: c(0, .12, .11, "board"), t: "Chip H1", d: "um em cada concha" }, { p: c(.3, .3, .1, "board"), t: "Microfones", d: "9 no total, para ruído e voz" }] },
      battery: { z0: Z.battery, center: [0, MX.cy, 0], view: { side: "F", ry: .18, rx: .3, s: 2.7 },
        callouts: [{ p: c(0, -.12, .02, "battery"), t: "Bateria", d: "até 20 h com cancelamento" }, { p: c(.3, .15, -.02, "battery"), t: "USB‑C", d: "5 min de carga = 1,5 h" }] },
      driver: { z0: Z.driver, center: [0, MX.cy, 0], view: { side: "B", ry: .3, rx: .2, s: 2.7 },
        callouts: [{ p: c(0, 0, -.17, "driver"), t: "Driver de 40 mm", d: "projetado pela Apple" }, { p: c(.15, .1, -.01, "driver"), t: "Ímã em anel duplo", d: "graves sem distorção" }] },
      cushion: { z0: Z.cushion, center: [0, MX.cy, 0], view: { side: "B", ry: .35, rx: .2, s: 2.4 },
        callouts: [{ p: c(.4, .2, -.3, "cushion"), t: "Espuma com memória", d: "veda o som" }, { p: c(0, 0, -.25, "cushion"), t: "Ímãs", d: "a almofada sai com um puxão" }] },
      headband: { z0: Z.headband, center: [0, .3, -.4], view: { side: "F", ry: HALF + 1 - TAU2 - .2, rx: .15, s: 1.4 },
        callouts: [{ p: [0, MX.top - .08, 0], t: "Malha de tecido", d: "distribui o peso" }, { p: [0, .81, .935], t: "Haste", d: "na mesma cor das conchas" }, { p: [0, .17, MX.cx], t: "Braços de aço inox", d: "telescópicos, ajustam a altura" }] }
    }, 3.6, {
      W: 2.7, H: 2.4, realRot: [0, -HALF, 0],
      keys: { hero: { x: 0, y: -.1, rx: .12, ry: HALF - .5, s: 1.35 }, design: { x: -2.4, rx: .1, ry: .55, s: 1.3 },
        open: { x: 1.6, rx: .25, ry: F0, s: 1.05, e: 1 }, assemble: { x: 2.3, rx: .1, ry: 2 * TAU2 + HALF - .5, s: 1.35 },
        specs: { x: 3.4, rx: .1, ry: 2 * TAU2 + HALF + .5, s: 1.2, ma: .12 }, buy: { x: 2.7, rx: .1, ry: 2 * TAU2 + HALF - .4, s: 1.25 } },
      baseRx: 0, F: F0, B: B0
    });
  }
  // AirPods: the case stands up along +z in layer space
  const pro = P.geo.pro, cw = pro ? 2.3 : 2.0, cd = pro ? .86 : .8, chH = pro ? 1.72 : 1.85;
  const ids = ["lid", "buds", "cradle", "board", "shell"], zE = steps(ids, 4.4);
  // an earbud standing up: round head on top (drawn as stacked rings so it reads in line art), stem below
  const bud = (g, x, y, z) => {
    const top = z + .75, sL = pro ? .6 : .85;
    g.add(cyl(.3, .36, FILL, x, y, top - .18, 40));
    circles(g, x, y, top - .18, [.33], 40); circles(g, x, y, top + .001, [.2, .1], 32);
    if (pro){ g.add(cyl(.22, .14, FILL, x, y, top + .07, 32)); circles(g, x, y, top + .141, [.12], 24); }
    g.add(cyl(.09, sL, FILL, x + .05, y, top - .36 - sL / 2, 24));
    circles(g, x + .05, y, top - .36 - sL - .001, [.06], 16);
  };
  const defs = {
    lid: { z0: chH * .42, center: [0, 0, 0], view: { side: "F", ry: .3, rx: .25, s: 2.2 },
      callouts: [{ p: [0, 0, .12], t: "Tampa", d: "fecha sozinha com ímãs" }, { p: [0, -cd / 2, 0], t: "Dobradiça", d: "de metal" }],
      build: g => { g.add(shapeMesh(F.rr(cw, cd, .38, .38), .2, .08, FILL)); g.add(box(cw * .35, .04, .08, FILL, 0, -cd / 2 - .02, -.08)); } },
    buds: { z0: chH * .15, center: [0, 0, .1], view: { side: "F", ry: .5, rx: .1, s: 2.2 },
      callouts: [{ p: [-.45, 0, .37], t: "Chip H2", d: "em cada fone" }, { p: [.45, 0, pro ? .69 : .55], t: pro ? "Ponteiras" : "Alto-falante", d: pro ? "vedam para cancelar ruído" : "de baixa distorção" }, { p: [.5, 0, pro ? -.45 : -.7], t: "Microfones", d: "na ponta da haste" }].concat(pro ? [{ p: [-.45, .3, .45], t: "Sensor cardíaco", d: "nos treinos" }] : []),
      build: g => { bud(g, -.45, 0, -.2); bud(g, .45, 0, -.2); } },
    cradle: { z0: 0, center: [0, 0, 0], view: { side: "F", ry: .2, rx: .5, s: 2.3 },
      callouts: [{ p: [-.45, 0, .06], t: "Encaixe magnético", d: "puxa o fone para o lugar" }, { p: [.45, 0, .06], t: "Contatos", d: "começam a carga" }],
      build: g => { g.add(shapeMesh(F.rr(cw - .1, cd - .1, .34, .34), .1, .02, FILL)); [-.45, .45].forEach(x => circles(g, x, 0, .07, [.32, .2, .1], 40)); } },
    board: { z0: -chH * .18, center: [0, 0, 0], view: { side: "F", ry: .1, rx: .4, s: 2.4 },
      callouts: [{ p: [-.4, 0, .1], t: "Bateria do estojo", d: "várias recargas" }, { p: [.55, 0, .06], t: "Placa de carga", d: "controla a energia" }].concat(pro ? [{ p: [.85, .15, .1], t: "Alto-falante", d: "toca para achar no Buscar" }] : []),
      build: (g, k) => { g.add(shapeMesh(F.rr(cw * .45, cd * .7, .12, .12, -.4, 0), .16, .01, FILL)); g.add(flat(new THREE.PlaneGeometry(cw * .4, cd * .62), cellTex(k), -.4, 0, .091)); g.add(box(cw * .35, cd * .7, .03, FILL, .55, 0, 0)); if (pro) g.add(cyl(.12, .1, FILL, .85, .15, .06, 20)); } },
    shell: { z0: -chH * .38, center: [0, 0, 0], view: { side: "F", ry: -.3, rx: .3, s: 2 },
      callouts: [{ p: [0, cd / 2, -.2], t: "USB‑C", d: "o mesmo cabo do iPhone" }, { p: [-cw * .3, 0, -.3], t: pro ? "MagSafe" : "Estojo", d: pro ? "carga sem fio" : "compacto e leve" }].concat(pro ? [{ p: [cw * .3, cd / 2, 0], t: "IP57", d: "resiste a suor e água" }] : []),
      build: g => { const ring = F.rr(cw, cd, .38, .38); ring.holes.push(hole(cw - .1, cd - .1, .33, 0, 0)); g.add(shapeMesh(ring, chH * .55, .1, FILL)); g.add(box(.3, .05, .1, FILL, 0, cd / 2 + .06, -chH * .2)); } }
  };
  return {
    W: cw * 1.75, H: chH * 2.2, realRot: [Math.PI / 2, 0, 0],
    keys: { hero: { x: 0, y: -.7, rx: -1.15, ry: -.4, s: 1.3 }, design: { x: -2.4, y: -.6, rx: -1.1, ry: Math.PI - .6, s: 1.45 },
      open: { x: 1.6, rx: -.95, ry: F0, s: 1.25, e: 1 }, assemble: { x: 2.3, rx: -1.15, ry: 2 * TAU2 - .4, s: 1.9 },
      specs: { x: 3.4, rx: -1.15, ry: 2 * TAU2 + .5, s: 1.7, ma: .12 }, buy: { x: 2.7, rx: -1.15, ry: 2 * TAU2 - .35, s: 1.7 } },
    baseRx: -1.0, F: F0, B: B0, yawZ: true,
    parts: renderer => { const k = kit(renderer); return ids.map((id, j) => ({ id, ...defs[id], zE: zE[j], build: g => defs[id].build(g, k) })); }
  };
}
/* ---------- realistic layers: the same layout as the drawings, built from real-looking materials ---------- */
function realKit(renderer, P){
  const col = C(P.colors[0].body);
  const metal = new THREE.MeshPhysicalMaterial({ color: col.clone(), metalness: 1, roughness: P.geo && P.geo.ultra ? .42 : .3, clearcoat: .25, clearcoatRoughness: .35 });
  const pad = new THREE.MeshPhysicalMaterial({ color: col.clone().multiplyScalar(.96), metalness: .7, roughness: .18, clearcoat: .7 });
  const M = {
    metal, tinted: [metal, pad], pad,
    black: new THREE.MeshStandardMaterial({ color: C("#0b0b0d"), roughness: .4, metalness: .2 }),
    key: new THREE.MeshStandardMaterial({ color: C("#151619"), roughness: .5, metalness: .05 }),
    pcb: new THREE.MeshStandardMaterial({ color: C("#16261c"), roughness: .55, metalness: .25 }),
    gold: new THREE.MeshStandardMaterial({ color: C("#d4a95e"), roughness: .3, metalness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: C("#b7b9bd"), roughness: .28, metalness: 1 }),
    rubber: new THREE.MeshStandardMaterial({ color: C("#1d1d1f"), roughness: .9 }),
    white: new THREE.MeshPhysicalMaterial({ color: C("#efefec"), roughness: .42, clearcoat: .8, clearcoatRoughness: .18 }),
    tip: new THREE.MeshStandardMaterial({ color: C("#dcdcd7"), roughness: .95 }),
    darkGlass: new THREE.MeshPhysicalMaterial({ color: C("#08090c"), roughness: .05, metalness: .2, clearcoat: 1, envMapIntensity: 1.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .02, clearcoat: 1, transparent: true, opacity: .14, envMapIntensity: 2.4, depthWrite: false })
  };
  M.glass.userData.alwaysT = true;
  const labelTex = canvasTex(renderer, 300, 300, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#d3d5d9"); gr.addColorStop(1, "#a9acb1"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a2b2f"; g.font = '600 30px "Archivo", sans-serif'; g.fillText("Li-ion", 24, 54);
    g.font = '400 15px "IBM Plex Mono", monospace'; ["Polímero de lítio", "Não perfure nem aqueça"].forEach((s, i) => g.fillText(s, 24, 90 + i * 22));
  });
  M.cell = new THREE.MeshPhysicalMaterial({ map: labelTex, roughness: .36, metalness: .55, clearcoat: .3 });
  M.chip = (title, sub) => new THREE.MeshStandardMaterial({ roughness: .3, metalness: .6, map: canvasTex(renderer, 256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#3c3d42"); gr.addColorStop(1, "#1b1c20"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#dcdcd8"; g.textAlign = "center"; g.font = '600 66px "Archivo", sans-serif'; g.fillText(title, w / 2, h * .56);
    g.font = '500 18px "IBM Plex Mono", monospace'; g.fillStyle = "#9a9a96"; g.fillText(sub, w / 2, h * .76);
  }) });
  M.screen = (w, h, a, b, draw) => new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(renderer, w, h, (g, cw, ch) => { wallpaper(g, cw, ch, a, b); if (draw) draw(g, cw, ch); }) });
  return M;
}
const faces = (side, m) => [side, side, side, side, m, side];
function caps(g, mat, n, area, z, s = 1){ // scattered tiny components on a board
  let sd = 77; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++){ const big = r() < .3; g.add(F.box((big ? .1 : .05) * s, (big ? .07 : .03) * s, .02, big ? mat.black : mat.gold, area[0] + (r() - .5) * area[2], area[1] + (r() - .5) * area[3], z)); }
}
const REAL = {
  mac(P, M){
    const W = .42 * P.geo.inch, Dm = W * .7, pro = P.geo.pro, KW = W * .84, KD = Dm * .4, ky = Dm * .14, { shapeMesh, box, cyl, rr } = F;
    return {
      display: g => {
        g.add(shapeMesh(rr(W, Dm, .22, .22), .03, .01, M.metal));
        const bz = new THREE.Mesh(new THREE.PlaneGeometry(W - .06, Dm - .06), M.black); bz.position.z = .03; g.add(bz);
        const sc = new THREE.Mesh(new THREE.PlaneGeometry(W - .3, Dm - .32), M.screen(1024, 700, pro ? "rgba(120,90,255,.9)" : "rgba(80,160,255,.85)", pro ? "rgba(255,90,120,.7)" : "rgba(120,230,210,.6)", (c, w) => { c.fillStyle = "rgba(20,20,24,.55)"; c.fillRect(0, 0, w, 30); }));
        sc.position.set(0, -.02, .035); g.add(sc);
        g.add(box(.5, .12, .006, M.black, 0, Dm / 2 - .1, .04));
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(W - .08, Dm - .08), M.glass); gl.position.z = .048; g.add(gl);
      },
      keyboard: g => {
        g.add(shapeMesh(rr(W - .04, Dm - .04, .2, .2), .02, .005, M.metal));
        const well = new THREE.Mesh(new THREE.PlaneGeometry(KW + .08, KD + .08), M.black); well.position.set(0, ky, .021); g.add(well);
        const cols = 14, rows = 6, px = KW / cols, py = KD / rows, keys = [];
        for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++){ if (r === 5 && q > 4 && q <= 8) continue; const wide = r === 5 && q === 4 ? 5 : 1; keys.push([-KW / 2 + px * (q + wide / 2), ky + KD / 2 - py * (r + .5), px * wide - px * .16, py - py * .18]); }
        const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.key, keys.length), m4 = new THREE.Matrix4();
        keys.forEach(([x, y, w, h], i) => inst.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, .032), new THREE.Quaternion(), new THREE.Vector3(w, h, .03)))); g.add(inst);
        const tid = cyl(px * .3, .02, M.darkGlass, KW / 2 - px / 2, ky + KD / 2 - py / 2, .045, 32); g.add(tid);
        const tp = new THREE.Mesh(new THREE.PlaneGeometry(W * .42, Dm * .3), M.pad); tp.position.set(0, -Dm * .28, .021); g.add(tp);
      },
      board: g => {
        g.add(shapeMesh(rr(W * .34, Dm * .42, .1, .1, 0, Dm * .22), .025, 0, M.pcb));
        g.add(box(.7, .7, .05, faces(M.black, M.chip(P.chip, "APPLE SILICON")), -W * .04, Dm * .22, .04));
        g.add(box(.3, .45, .03, M.black, W * .1, Dm * .3, .03)); g.add(box(.3, .45, .03, M.black, W * .1, Dm * .13, .03));
        g.add(box(.5, .25, .03, M.black, -W * .12, Dm * .1, .03));
        g.add(box(.25, .08, .03, M.gold, -W * .14, Dm * .4, .03)); g.add(box(.25, .08, .03, M.gold, W * .14, Dm * .04, .03));
        caps(g, M, 40, [0, Dm * .22, W * .32, Dm * .4], .022);
      },
      battery: g => {
        [-1, 0, 1].forEach(i => { g.add(shapeMesh(rr(W * .27, Dm * .34, .06, .06, i * W * .3, -Dm * .14), .06, .004, M.cell)); });
        [-1, 1].forEach(i => g.add(shapeMesh(rr(W * .24, Dm * .3, .06, .06, i * W * .33, Dm * .22), .06, .004, M.cell)));
      },
      ports: g => {
        [-1, 1].forEach(i => g.add(box(.35, Dm * .55, .06, M.black, i * W * .44, Dm * .05, 0)));
        g.add(box(.3, Dm * .35, .04, M.pcb, -W / 2 + .2, Dm * .22, 0));
        g.add(box(.1, .2, .06, M.steel, -W / 2 + .07, Dm * .3, .01)); g.add(box(.1, .15, .06, M.steel, -W / 2 + .07, Dm * .12, .01));
        if (pro){ g.add(cyl(.45, .05, M.black, W * .2, Dm * .33, 0, 48)); g.add(cyl(.47, .02, M.steel, W * .2, Dm * .33, .03, 48)); }
      },
      bottom: g => {
        g.add(shapeMesh(rr(W, Dm, .22, .22), .04, .015, M.metal));
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(cyl(.12, .03, M.rubber, a * (W / 2 - .4), b * (Dm / 2 - .4), -.04, 24)));
      }
    };
  },
  ipad(P, M){
    const H = 5.4, W = 3.86, R = .32, pro = P.geo.pro, { shapeMesh, box, cyl, rr, hole } = F;
    return {
      display: g => {
        g.add(shapeMesh(rr(W - .06, H - .06, R), .02, .006, M.black));
        const sc = new THREE.Mesh(new THREE.PlaneGeometry(W - .3, H - .3), M.screen(600, 840, pro ? "rgba(255,110,40,.9)" : "rgba(110,150,255,.9)", pro ? "rgba(255,60,120,.6)" : "rgba(255,210,120,.6)")); sc.position.z = .022; g.add(sc);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(W - .08, H - .08), M.glass); gl.position.z = .03; g.add(gl);
        g.add(box(.8, .4, .01, M.gold, 0, -H / 2 + .3, -.02));
      },
      board: g => { g.add(shapeMesh(rr(W * .3, H * .8, .1, .1, W * .32, 0), .025, 0, M.pcb)); g.add(box(.6, .6, .05, faces(M.black, M.chip(P.chip, "APPLE")), W * .32, .3, .04)); g.add(box(.4, .3, .03, M.steel, W * .32, -1.1, .03)); g.add(box(.4, .2, .04, M.steel, W * .32, -H / 2 + .5, .03)); caps(g, M, 30, [W * .32, 0, W * .26, H * .7], .022); },
      battery: g => { [1, -1].forEach(s2 => g.add(shapeMesh(rr(W * .62, H * .42, .1, .1, -W * .15, s2 * H * .22), .06, .004, M.cell))); },
      cam: g => {
        g.add(box(.6, .6, .1, M.black, W / 2 - .6, H / 2 - .6, 0));
        g.add(cyl(.18, .1, M.steel, W / 2 - .6, H / 2 - .6, -.06, 40)); g.add(cyl(.14, .102, M.darkGlass, W / 2 - .6, H / 2 - .6, -.06, 40));
        if (pro) g.add(cyl(.08, .08, M.darkGlass, W / 2 - .42, H / 2 - .42, -.06, 24));
        g.add(box(.25, .25, .06, M.black, W / 2 - .2, 0, 0)); g.add(cyl(.05, .02, M.darkGlass, W / 2 - .2, 0, .035, 20));
      },
      body: g => { const ring = rr(W, H, R); ring.holes.push(hole(W - .12, H - .12, R - .06, 0, 0)); g.add(shapeMesh(ring, .1, .02, M.metal)); g.add(shapeMesh(rr(W - .06, H - .06, R - .03), .01, .004, M.metal, -.05)); g.add(box(.45, .05, .06, M.metal, W / 2 - 1, H / 2 + .02, 0)); }
    };
  },
  watch(P, M){
    const s = P.geo.mm / 46, ultra = P.geo.ultra, W = 1.62 * s * (ultra ? 1.06 : 1), H = 1.95 * s * (ultra ? 1.04 : 1), R = .42 * s, { shapeMesh, box, cyl, rr, hole } = F;
    return {
      glass: g => { g.add(shapeMesh(rr(W - .06, H - .06, R), .02, ultra ? .005 : .04, M.glass)); },
      display: g => {
        g.add(shapeMesh(rr(W - .14, H - .14, R - .06), .02, 0, M.black));
        const face = new THREE.Mesh(new THREE.PlaneGeometry(W - .3, H - .3), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(renderer0, 400, 480, (c, w, h) => {
          c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.fillStyle = ultra ? "#ff8a3d" : "#f2efe9"; c.textAlign = "center"; c.font = '600 130px "Archivo", sans-serif'; c.fillText(hhmm(), w / 2, h * .52);
          [["#ff3b5c", .25], ["#9cff3b", .5], ["#36d1ff", .75]].forEach(([cc, x]) => { c.strokeStyle = cc; c.lineWidth = 10; c.beginPath(); c.arc(w * x, h * .78, 34, -Math.PI / 2, Math.PI); c.stroke(); });
        }) })); face.position.z = .016; g.add(face);
      },
      chip: g => { g.add(shapeMesh(rr(W * .78, H * .62, .1, .1), .02, 0, M.pcb)); g.add(box(.55, .55, .05, faces(M.black, M.chip(P.chip, "SiP")), 0, H * .08, .03)); g.add(box(.45, .25, .07, M.steel, W * .25, -H * .25, .03)); caps(g, M, 14, [0, 0, W * .6, H * .5], .015, .7); },
      battery: g => { g.add(shapeMesh(rr(W * .7, H * .58, .12, .12), .1, .006, M.cell)); },
      case: g => {
        const ring = rr(W, H, R); ring.holes.push(hole(W - .16, H - .16, R - .08, 0, 0)); g.add(shapeMesh(ring, .3, .06, M.metal, 0, .05));
        g.add(cyl(.13, .14, M.metal, W / 2 + .1, H * .18, 0, 48).rotateY(Math.PI / 2)); g.add(box(.06, .42, .16, M.metal, W / 2 + .06, -H * .16, 0));
        if (ultra) g.add(box(.06, .34, .16, new THREE.MeshStandardMaterial({ color: C("#ff6a1a"), roughness: .4, metalness: .3 }), -W / 2 - .06, H * .12, 0));
      },
      back: g => {
        g.add(shapeMesh(rr(W * .92, H * .9, R * .9), .05, .03, M.darkGlass));
        const ringsT = canvasTex(renderer0, 256, 256, (c, w) => { c.fillStyle = "rgba(0,0,0,0)"; c.clearRect(0, 0, w, w); c.strokeStyle = "rgba(200,205,215,.7)"; c.lineWidth = 3; [110, 80, 34].forEach(r => { c.beginPath(); c.arc(w / 2, w / 2, r, 0, Math.PI * 2); c.stroke(); }); c.fillStyle = "#3d7cff"; for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; c.beginPath(); c.arc(w / 2 + Math.cos(a) * 95, w / 2 + Math.sin(a) * 95, 7, 0, Math.PI * 2); c.fill(); } });
        const sens = new THREE.Mesh(new THREE.PlaneGeometry(1.0 * s, 1.0 * s), new THREE.MeshBasicMaterial({ map: ringsT, transparent: true, toneMapped: false })); sens.material.userData.alwaysT = true; sens.position.z = -.081; sens.rotation.y = Math.PI; g.add(sens);
      }
    };
  },
  airpods(P, M){
    const pro = P.geo.pro, cw = pro ? 2.3 : 2.0, cd = pro ? .86 : .8, chH = pro ? 1.72 : 1.85, { shapeMesh, box, cyl, rr, hole } = F;
    // standing up: the bud's +y becomes the layer's +z, its front (+z) faces the viewer (-y); the left one is mirrored
    const bud = (g, x) => {
      const b = earbud({ white: M.white, dark: M.black, steel: M.steel, tip: M.tip }, pro);
      b.rotation.x = Math.PI / 2; b.position.set(x, 0, .5); b.scale.set(x < 0 ? -1 : 1, 1, 1); g.add(b);
    };
    return {
      lid: g => { g.add(shapeMesh(rr(cw, cd, .38, .38), .2, .08, M.white)); g.add(box(cw * .35, .04, .08, M.steel, 0, -cd / 2 - .02, -.08)); },
      buds: g => { bud(g, -.45); bud(g, .45); },
      // wells sit clearly above the tray surface (top at z .07) so the two never fight for the same pixels
      cradle: g => {
        g.add(shapeMesh(rr(cw - .1, cd - .1, .34, .34), .1, .02, M.white));
        [-.45, .45].forEach(x => {
          const rim = new THREE.Mesh(new THREE.RingGeometry(.3, .34, 48), M.steel); rim.position.set(x, 0, .076); g.add(rim);
          const well = new THREE.Mesh(new THREE.CircleGeometry(.3, 48), M.key); well.position.set(x, 0, .075); g.add(well);
          g.add(box(.08, .04, .01, M.gold, x, .18, .082));
        });
      },
      board: g => { g.add(shapeMesh(rr(cw * .45, cd * .7, .12, .12, -.4, 0), .16, .01, M.cell)); g.add(box(cw * .35, cd * .7, .03, M.pcb, .55, 0, 0)); caps(g, M, 12, [.55, 0, cw * .3, cd * .6], .025, .8); if (pro) g.add(cyl(.12, .1, M.black, .85, .15, .06, 20)); },
      shell: g => { const ring = rr(cw, cd, .38, .38); ring.holes.push(hole(cw - .1, cd - .1, .33, 0, 0)); g.add(shapeMesh(ring, chH * .55, .1, M.white)); g.add(shapeMesh(rr(cw - .06, cd - .06, .35, .35), .04, .02, M.white, -chH * .26)); g.add(box(.3, .05, .1, M.black, 0, cd / 2 + .06, -chH * .2)); }
    };
  },
  // Vision Pro layers live in model space; each layer's origin sits at its z0
  vision(P, M){
    const { box } = F, k = visionKit(M.metal), at = (g, z0) => { const s = new THREE.Group(); s.position.z = -z0; g.add(s); return s; };
    const tinted = new THREE.MeshPhysicalMaterial({ color: C("#0b0d12"), metalness: .3, roughness: .03, clearcoat: 1, transparent: true, opacity: .62, depthWrite: false, envMapIntensity: 2.4 });
    tinted.userData.alwaysT = true;
    const lens = (g, x, y, z, r, mat = M.darkGlass) => { g.add(meshAt(new THREE.CylinderGeometry(r * 1.25, r * 1.25, .06, 32).rotateX(Math.PI / 2), M.black, x, y, z)); g.add(meshAt(new THREE.CircleGeometry(r, 32), mat, x, y, z + .031)); };
    return {
      glass: g => { const s = at(g, VP_Z.glass); VISION.glass(s, k, tinted); s.add(meshAt(loft(vOut(.8), slabProfile(.012), vOpt), new THREE.MeshStandardMaterial({ color: C("#0c1530"), emissive: C("#0a1838"), roughness: .3 }), 0, 0, .33)); },
      sensors: g => {
        const s = at(g, VP_Z.sensors);
        s.add(meshAt(loft(vOut(.95), ringProfile(.7, .04), vOpt), new THREE.MeshStandardMaterial({ color: C("#2a2b30"), roughness: .45, metalness: .6 }), 0, 0, .28));
        VP_CAMS.forEach(([x, y, r]) => lens(s, x, y, .3 + vBend(x, y), r));
        s.add(meshAt(new THREE.CircleGeometry(.05, 24), new THREE.MeshBasicMaterial({ color: 0x3a1010 }), 0, -.5, .332 + vBend(0, -.5)));
      },
      chips: g => {
        const s = at(g, VP_Z.chips), z = .12 + vBend(0, .28);
        const pcb = slab(rr(1.9, .62, .16, .16, 0, .28), .03, 0, M.pcb); pcb.position.z = z; s.add(pcb);
        s.add(box(.4, .4, .05, faces(M.black, M.chip("M5", "APPLE")), -.38, .28, z + .04));
        s.add(box(.32, .32, .05, faces(M.black, M.chip("R1", "SENSORES")), .32, .28, z + .04));
        caps(s, M, 22, [0, .28, 1.7, .5], z + .025, .8);
        [-1, 1].forEach(sg => { // a small blower fan on each side
          const x = sg * 1.1, fz = .12 + vBend(x, .1);
          s.add(meshAt(loft(squircle(.22, .22, 2), ringProfile(.86, .08)), M.steel, x, .1, fz));
          s.add(meshAt(new THREE.CylinderGeometry(.06, .06, .07, 24).rotateX(Math.PI / 2), M.black, x, .1, fz));
          for (let i = 0; i < 11; i++){ const b = box(.13, .018, .05, M.black, 0, 0, 0); b.geometry.translate(.11, 0, 0); b.rotation.z = i / 11 * TAU; b.position.set(x, .1, fz); s.add(b); }
        });
      },
      displays: g => {
        const s = at(g, VP_Z.displays), scr = M.screen(400, 340, "rgba(90,140,255,.95)", "rgba(255,120,80,.7)");
        [-1, 1].forEach(sg => {
          const x = sg * .62, z = .02 + vBend(x, .02);
          const panel = slab(rr(.56, .5, .1), .06, .01, M.black); panel.position.set(x, .02, z); s.add(panel);
          s.add(F.flat(new THREE.PlaneGeometry(.48, .42), scr, x, .02, z - .041, true));
          s.add(meshAt(loft(squircle(.3, .3, 2), ringProfile(.88, .12), {}), M.steel, x, .02, z - .12));
          s.add(meshAt(loft(squircle(.27, .27, 2), slabProfile(.06, .3, .03)), M.glass, x, .02, z - .12));
        });
        s.add(box(1.0, .05, .04, M.steel, 0, -.24, -.02));
      },
      frame: g => VISION.frame(at(g, VP_Z.frame), k),
      seal: g => VISION.seal(at(g, VP_Z.seal), k)
    };
  },
  // AirPods Max: right-cup layers use cup-local coords (z out of the head); the headband layer is the rest in model space
  max(P, M){
    const { box } = F, k = maxKit(M.metal, P.colors[0].body);
    M.tinted.push(k.band, k.knit, k.inset); // the headband and cushions follow the chosen colour too
    const cup = (g, z0) => { const s = new THREE.Group(); s.position.set(0, MX.cy, MX.cx - z0); g.add(s); return s; };
    return {
      shell: g => MAXP.shell(cup(g, MAX_Z.shell), k, true),
      board: g => {
        const s = cup(g, MAX_Z.board);
        s.add(meshAt(loft(cupOut(.82), slabProfile(.025)), M.pcb, 0, 0, .06));
        s.add(box(.22, .22, .04, faces(M.black, M.chip("H1", "ÁUDIO")), 0, .12, .085));
        caps(s, M, 16, [0, -.12, .5, .4], .08, .7);
        [[-.3, .3], [.3, .3], [-.32, -.3], [.32, -.3]].forEach(([x, y]) => s.add(meshAt(new THREE.CylinderGeometry(.035, .035, .03, 16).rotateX(Math.PI / 2), M.black, x, y, .08)));
      },
      battery: g => {
        const s = cup(g, MAX_Z.battery);
        s.add(box(.6, .5, .07, M.steel, 0, -.12, -.02));
        s.add(F.flat(new THREE.PlaneGeometry(.56, .46), M.cell, 0, -.12, .0155));
      },
      driver: g => {
        const s = cup(g, MAX_Z.driver), cone = new THREE.MeshStandardMaterial({ color: C("#2c2d31"), roughness: .8, side: THREE.DoubleSide });
        s.add(meshAt(loft(squircle(.36, .36, 2), ringProfile(.82, .06)), M.steel, 0, 0, -.11));
        s.add(meshAt(new THREE.LatheGeometry([[.05, 0], [.15, -.02], [.25, -.045], [.3, -.06]].map(([x, y]) => new THREE.Vector2(x, y)), 48).rotateX(Math.PI / 2), cone, 0, 0, -.1));
        s.add(meshAt(new THREE.CylinderGeometry(.15, .15, .08, 40).rotateX(Math.PI / 2), M.steel, 0, 0, -.05));
        s.add(meshAt(new THREE.CylinderGeometry(.09, .09, .085, 32).rotateX(Math.PI / 2), M.black, 0, 0, -.05));
      },
      cushion: g => MAXP.cushion(cup(g, MAX_Z.cushion), k),
      headband: g => {
        const s = new THREE.Group(); s.rotation.y = -Math.PI / 2; s.position.z = -MAX_Z.headband; g.add(s);
        MAXP.headband(s, k);
        const left = cupFrame(-1); MAXP.shell(left, k, false); MAXP.cushion(left, k); s.add(left);
      }
    };
  }
};
const VP_Z = { glass: .4, sensors: .28, chips: .12, displays: 0, frame: .16, seal: -.2 };
const VP_CAMS = [[-.5, -.42, .09], [.5, -.42, .09], [-.95, -.55, .07], [.95, -.55, .07], [-1.35, .05, .08], [1.35, .05, .08], [-1.1, .45, .06], [1.1, .45, .06], [0, -.5, .07], [-.2, -.56, .04], [.2, -.56, .04]];
const MAX_Z = { shell: 1.08, board: 1.14, battery: 1.06, driver: .97, cushion: .78, headband: 0 };
let renderer0 = null;
function adapter(P){
  const a = lineAdapter(P);
  if (!REAL[P.type]) return a;
  return { ...a, realParts: true, parts: renderer => {
    renderer0 = renderer;
    const M = realKit(renderer, P), builds = REAL[P.type](P, M);
    const list = a.parts(renderer).map(d => ({ ...d, build: g => builds[d.id](g) }));
    list.tinted = M.tinted;
    return list;
  } };
}

function realFor(renderer, P, color){
  const b = build(renderer, P, color), g = new THREE.Group();
  g.add(b.group);
  const mats = [];
  // anything built see-through (screen glass, watch dome, shadows) must stay see-through when the page toggles opacity
  g.traverse(m => { if (!m.isMesh) return; (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { if (!mats.includes(x)){ x.userData.base = x.opacity; if (x.transparent) x.userData.alwaysT = true; mats.push(x); } }); });
  return { group: g, mats, tinted: b.tinted };
}

window.Aparelhos3D = { build, thumb, frame, dispose, contactShadow, adapter, realFor };
})();
