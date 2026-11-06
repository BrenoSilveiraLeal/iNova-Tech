/* Catálogo da loja: um lugar só para nomes, preços, cores, especificações e textos.
   Para mudar preço ou texto, edite aqui; todas as páginas usam estes dados. */
(function(){
const COLORS = {
  pro: [
    { id: "laranja", name: "Laranja-cósmico", body: "#e86d2c", swatch: "#e8702f" },
    { id: "azul",    name: "Azul-intenso",    body: "#34425c", swatch: "#33415b" },
    { id: "prata",   name: "Prateado",        body: "#d3d3d0", swatch: "#dcdcd9" }
  ],
  air: [
    { id: "azul",    name: "Azul-céu",        body: "#c3d6ea", swatch: "#c6d9ec" },
    { id: "dourado", name: "Dourado-claro",   body: "#e4cfa8", swatch: "#e6d3b0" },
    { id: "branco",  name: "Branco-nuvem",    body: "#ecebe6", swatch: "#eeede8" },
    { id: "preto",   name: "Preto-espacial",  body: "#2c2d31", swatch: "#2c2d31" }
  ],
  base: [
    { id: "lavanda", name: "Lavanda",         body: "#c9bbe0", swatch: "#cdbfe2" },
    { id: "salvia",  name: "Sálvia",          body: "#b3bf9f", swatch: "#b7c2a4" },
    { id: "nevoa",   name: "Azul-névoa",      body: "#a6bdd5", swatch: "#a9bfd6" },
    { id: "branco",  name: "Branco",          body: "#e9e8e4", swatch: "#ecebe7" },
    { id: "preto",   name: "Preto",           body: "#2b2b2e", swatch: "#2b2b2e" }
  ]
};
const mm = v => v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? (String(v).split(".")[1] || "").length : 0 });

/* Textos das camadas. Cada função recebe o produto e devolve o cartão daquela peça. */
const PART_COPY = {
  glass: p => ({
    eyebrow: "Vidro frontal", h: "Ceramic Shield 2 na frente.",
    p: "O vidro da frente resiste três vezes mais a riscos que a geração anterior e tem um revestimento que reduz reflexos. A tela fica legível mesmo com luz forte batendo nela.",
    stats: [["Riscos", "3× mais"], ["Reflexos", "Menos"], ["Água", "IP68"]]
  }),
  display: p => ({
    eyebrow: "Tela", h: p.kind === "air" ? "6,5 polegadas em 5,64 mm." : `${p.screen} polegadas que se leem ao sol.`,
    p: p.kind === "base"
      ? "Pela primeira vez no iPhone 17 de entrada, a tela ProMotion vai de 1 a 120 Hz, o que permite a tela sempre ativa. O brilho chega a 3.000 nits ao ar livre."
      : "A tela Super Retina XDR com ProMotion vai até 120 Hz e chega a 3.000 nits ao ar livre. No topo, a Dynamic Island mostra chamadas, timers e entregas sem tirar você do que está fazendo.",
    stats: [["Tamanho", p.screen + '"'], ["ProMotion", "120 Hz"], ["Brilho", "3.000 nits"]]
  }),
  vapor: p => ({
    eyebrow: "Resfriamento", h: "A primeira câmara de vapor de um iPhone.",
    p: "Uma câmara selada com água deionizada é soldada a laser no corpo de alumínio. Ela tira o calor do chip e espalha pelo aparelho, então o desempenho se mantém alto em jogos longos e gravações em 4K.",
    stats: [["Fluido", "H₂O"], ["Fixação", "Laser"], ["Em iPhone", "1ª vez"]]
  }),
  board: p => ({
    eyebrow: "Placa lógica",
    h: p.kind === "air" ? "Três chips Apple dentro do platô." : `Chip ${p.chip} e o novo chip N1.`,
    p: p.kind === "air"
      ? "O A19 Pro, o chip sem fio N1 e o modem C1X ficam numa placa compacta dentro da barra do topo. Isso libera o resto do corpo para a bateria."
      : `O ${p.chip} tem CPU de 6 núcleos, GPU de ${p.gpu} núcleos e Neural Engine de 16 núcleos para a Apple Intelligence. O N1 cuida do Wi‑Fi 7, do Bluetooth 6 e do Thread.`,
    stats: p.kind === "air"
      ? [["Chip", "A19 Pro"], ["Modem", "C1X"], ["Sem fio", "N1"]]
      : [["CPU", "6 núcleos"], ["GPU", p.gpu + " núcleos"], ["Neural Engine", "16 núcleos"]]
  }),
  battery: p => ({
    eyebrow: "Bateria",
    h: p.id === "iphone-17-pro-max" ? "A maior autonomia em um iPhone." : p.kind === "air" ? "Uma bateria fina que ocupa o corpo todo." : "Bateria para o dia inteiro.",
    p: p.kind === "air"
      ? `Com a placa no platô, a bateria se espalha pelo resto do aparelho. São até ${p.hours} horas de vídeo num corpo de 5,64 mm.`
      : `São até ${p.hours} horas de vídeo, e com um adaptador de 40 W ela chega a 50% em cerca de 20 minutos.`,
    stats: p.kind === "air"
      ? [["Vídeo", `Até ${p.hours} h`], ["Espessura", "5,64 mm"], ["Chip", "Só eSIM"]]
      : [["Vídeo", `Até ${p.hours} h`], ["Carga rápida", "50% / 20 min"], ["Sem fio", "25 W"]]
  }),
  cam: p => ({
    eyebrow: "Câmeras",
    h: p.kind === "pro" ? "Três câmeras Fusion de 48 MP." : p.kind === "air" ? "Uma câmera Fusion de 48 MP." : "Duas câmeras Fusion de 48 MP.",
    p: p.kind === "pro"
      ? "Principal, ultra-angular e teleobjetiva têm 48 MP. A teleobjetiva usa um tetraprisma para dobrar a luz dentro do corpo e chega a 8× com qualidade óptica, com até 40× de zoom digital."
      : p.kind === "air"
        ? "Uma câmera faz o trabalho de duas: fotografa em 48 MP e faz zoom de 2× com qualidade óptica usando o centro do sensor. Na frente, a câmera de 18 MP com Center Stage."
        : "A principal e a ultra-angular têm 48 MP. A principal faz zoom de 2× com qualidade óptica usando o centro do sensor, e a ultra-angular também faz fotos macro.",
    stats: p.kind === "pro" ? [["Câmeras", "3 × 48 MP"], ["Zoom óptico", "Até 8×"], ["Frontal", "18 MP"]]
      : p.kind === "air" ? [["Câmera", "48 MP"], ["Zoom", "2×"], ["Frontal", "18 MP"]]
      : [["Câmeras", "2 × 48 MP"], ["Zoom", "2×"], ["Frontal", "18 MP"]]
  }),
  body: p => ({
    eyebrow: "Corpo unibody", h: "Alumínio forjado em uma peça só.",
    p: "Laterais, traseira e platô saem do mesmo bloco de liga de alumínio aeroespacial. Na lateral direita fica o Controle da Câmera: um clique abre a câmera e um deslize controla o zoom.",
    stats: [["Altura", mm(p.mm[0]) + " mm"], ["Largura", mm(p.mm[1]) + " mm"], ["Espessura", mm(p.mm[2]) + " mm"]]
  }),
  frame: p => p.kind === "air" ? ({
    eyebrow: "Moldura", h: "Titânio grau 5 em 5,64 mm.",
    p: "A moldura de titânio polido deixa o corpo rígido mesmo sendo tão fino. Na lateral direita fica o Controle da Câmera, e na esquerda, o Botão de Ação.",
    stats: [["Altura", mm(p.mm[0]) + " mm"], ["Largura", mm(p.mm[1]) + " mm"], ["Peso", p.weight + " g"]]
  }) : ({
    eyebrow: "Estrutura", h: "Moldura de alumínio aeroespacial.",
    p: "A moldura de alumínio segura a tela e a traseira. Na lateral direita fica o Controle da Câmera, e na esquerda, o Botão de Ação.",
    stats: [["Altura", mm(p.mm[0]) + " mm"], ["Largura", mm(p.mm[1]) + " mm"], ["Espessura", mm(p.mm[2]) + " mm"]]
  }),
  back: p => p.kind === "pro" ? ({
    eyebrow: "Traseira", h: "Janela de vidro para o MagSafe.",
    p: "Uma janela de Ceramic Shield na traseira deixa a carga sem fio passar pelo alumínio. Atrás dela ficam a bobina MagSafe de até 25 W e o anel de ímãs que alinha carregadores e acessórios.",
    stats: [["MagSafe", "25 W"], ["Vidro", "Ceramic"], ["Ímãs", "Em anel"]]
  }) : p.kind === "air" ? ({
    eyebrow: "Traseira", h: "Ceramic Shield também atrás.",
    p: "A traseira tem Ceramic Shield com acabamento fosco. Por trás dela, a bobina MagSafe e o anel de ímãs alinham carregadores e acessórios.",
    stats: [["Carga", "MagSafe"], ["Vidro", "Ceramic"], ["Cores", "4"]]
  }) : ({
    eyebrow: "Traseira", h: "Vidro colorido e MagSafe.",
    p: "A traseira é de vidro com a cor na própria massa e acabamento fosco. Por trás dela, a bobina MagSafe carrega sem fio até 25 W.",
    stats: [["MagSafe", "25 W"], ["Acabamento", "Fosco"], ["Cores", "5"]]
  })
};

const PRODUCTS = [
  {
    id: "iphone-17", name: "iPhone 17", giant: ["iPHONE", "17"], kind: "base",
    mm: [149.6, 71.5, 7.95], weight: 177, screen: "6,3", chip: "A19", gpu: 5, hours: 30,
    colors: COLORS.base,
    storage: [["256 GB", 7999], ["512 GB", 9499]],
    tagline: "Tela ProMotion, chip A19 e duas câmeras de 48 MP.",
    hero: "Tela ProMotion de 120 Hz, chip A19 e duas câmeras de 48 MP. Role a página para ver como ele é por dentro.",
    design: { h: "Alumínio e vidro em cinco cores.", p: "A estrutura é de alumínio e a traseira é de vidro com a cor na própria massa. No canto, o módulo de câmeras guarda as duas lentes de 48 MP." },
    highlights: [["Chip", "A19"], ["Câmeras", "2 × 48 MP"], ["Tela", '6,3" 120 Hz'], ["Bateria", "Até 30 h"], ["Cores", "5"]],
    specs: [
      ["Tela", '6,3" Super Retina XDR', "ProMotion até 120 Hz, até 3.000 nits"],
      ["Chip", "A19", "CPU de 6 núcleos, GPU de 5 núcleos"],
      ["Câmeras traseiras", "2 × 48 MP Fusion", "Principal e ultra-angular, zoom 2×"],
      ["Câmera frontal", "18 MP Center Stage", "Enquadra o grupo automaticamente"],
      ["Bateria", "Até 30 h de vídeo", "MagSafe até 25 W, 50% em ~20 min com 40 W"],
      ["Armazenamento", "256 GB ou 512 GB", ""],
      ["Conexões", "5G, Wi‑Fi 7, Bluetooth 6", "Chip N1, USB‑C"],
      ["Corpo", "149,6 × 71,5 × 7,95 mm · 177 g", "Alumínio e vidro, IP68"]
    ]
  },
  {
    id: "iphone-air", name: "iPhone Air", giant: ["ULTRA", "FINO"], kind: "air",
    mm: [156.2, 74.7, 5.64], weight: 165, screen: "6,5", chip: "A19 Pro", gpu: 5, hours: 27,
    colors: COLORS.air,
    storage: [["256 GB", 10499], ["512 GB", 11999], ["1 TB", 13499]],
    tagline: "5,64 mm, titânio e chip A19 Pro.",
    hero: "5,64 mm de espessura, moldura de titânio e chip A19 Pro. Role a página para ver como tudo isso cabe.",
    design: { h: "O iPhone mais fino de todos.", p: "A moldura é de titânio polido e a frente e a traseira têm Ceramic Shield. No topo, uma barra guarda a câmera e quase todos os componentes." },
    highlights: [["Espessura", "5,64 mm"], ["Chip", "A19 Pro"], ["Tela", '6,5" 120 Hz'], ["Peso", "165 g"], ["Cores", "4"]],
    specs: [
      ["Tela", '6,5" Super Retina XDR', "ProMotion até 120 Hz, até 3.000 nits"],
      ["Chip", "A19 Pro", "Com chip sem fio N1 e modem C1X"],
      ["Câmera traseira", "48 MP Fusion", "Zoom 2× com qualidade óptica"],
      ["Câmera frontal", "18 MP Center Stage", "Enquadra o grupo automaticamente"],
      ["Bateria", "Até 27 h de vídeo", "Carga sem fio MagSafe"],
      ["Armazenamento", "256 GB a 1 TB", "256 GB, 512 GB ou 1 TB"],
      ["Conexões", "5G, Wi‑Fi 7, Bluetooth 6", "Só eSIM, USB‑C"],
      ["Corpo", "156,2 × 74,7 × 5,64 mm · 165 g", "Titânio, Ceramic Shield nos dois lados, IP68"]
    ]
  },
  {
    id: "iphone-17-pro", name: "iPhone 17 Pro", giant: ["17", "PRO"], kind: "pro",
    mm: [150.0, 71.9, 8.75], weight: 204, screen: "6,3", chip: "A19 Pro", gpu: 6, hours: 31,
    colors: COLORS.pro,
    storage: [["256 GB", 11499], ["512 GB", 12999], ["1 TB", 14499]],
    tagline: "Unibody de alumínio, câmara de vapor e três câmeras de 48 MP.",
    hero: "Corpo unibody de alumínio, câmara de vapor e três câmeras de 48 MP num tamanho de 6,3 polegadas. Role a página para ver por dentro.",
    design: { h: "Uma peça de alumínio, com um platô para as câmeras.", p: "O corpo é forjado em alumínio e se estende até o topo da traseira, formando o platô que guarda as câmeras, o flash e as antenas." },
    highlights: [["Chip", "A19 Pro"], ["Câmeras", "3 × 48 MP"], ["Tela", '6,3" 120 Hz'], ["Bateria", "Até 31 h"], ["Cores", "3"]],
    specs: [
      ["Tela", '6,3" Super Retina XDR', "ProMotion até 120 Hz, até 3.000 nits"],
      ["Chip", "A19 Pro", "CPU e GPU de 6 núcleos, Neural Engine de 16 núcleos"],
      ["Câmeras traseiras", "3 × 48 MP Fusion", "Principal, ultra-angular e tele 4× (até 8× óptico)"],
      ["Câmera frontal", "18 MP Center Stage", "Enquadra o grupo automaticamente"],
      ["Bateria", "Até 31 h de vídeo", "MagSafe até 25 W, 50% em ~20 min com 40 W"],
      ["Armazenamento", "256 GB a 1 TB", "256 GB, 512 GB ou 1 TB"],
      ["Conexões", "5G, Wi‑Fi 7, Bluetooth 6", "Chip N1, USB‑C com USB 3"],
      ["Corpo", "150 × 71,9 × 8,75 mm · 204 g", "Alumínio unibody, IP68"]
    ]
  },
  {
    id: "iphone-17-pro-max", name: "iPhone 17 Pro Max", giant: ["PRO", "MAX"], kind: "pro",
    mm: [163.4, 78.0, 8.75], weight: 233, screen: "6,9", chip: "A19 Pro", gpu: 6, hours: 37,
    colors: COLORS.pro,
    storage: [["256 GB", 12499], ["512 GB", 13999], ["1 TB", 15499], ["2 TB", 18499]],
    tagline: "A maior tela e a maior bateria da linha.",
    hero: "Corpo unibody de alumínio, câmara de vapor e três câmeras de 48 MP. Role a página para ver como ele é por dentro.",
    design: { h: "Uma peça de alumínio, com um platô para as câmeras.", p: "O corpo é forjado em alumínio e se estende até o topo da traseira, formando o platô que guarda as câmeras, o flash e as antenas." },
    highlights: [["Chip", "A19 Pro"], ["Câmeras", "3 × 48 MP"], ["Tela", '6,9" 120 Hz'], ["Bateria", "Até 37 h"], ["Cores", "3"]],
    specs: [
      ["Tela", '6,9" Super Retina XDR', "ProMotion até 120 Hz, até 3.000 nits"],
      ["Chip", "A19 Pro", "CPU e GPU de 6 núcleos, Neural Engine de 16 núcleos"],
      ["Câmeras traseiras", "3 × 48 MP Fusion", "Principal, ultra-angular e tele 4× (até 8× óptico)"],
      ["Câmera frontal", "18 MP Center Stage", "Enquadra o grupo automaticamente"],
      ["Bateria", "Até 37 h de vídeo", "MagSafe até 25 W, 50% em ~20 min com 40 W"],
      ["Armazenamento", "256 GB a 2 TB", "256 GB, 512 GB, 1 TB ou 2 TB"],
      ["Conexões", "5G, Wi‑Fi 7, Bluetooth 6", "Chip N1, USB‑C com USB 3"],
      ["Corpo", "163,4 × 78 × 8,75 mm · 233 g", "Alumínio unibody, IP68"]
    ]
  }
];

const PARTS_BY_KIND = {
  pro:  ["glass", "display", "vapor", "board", "battery", "cam", "body", "back"],
  base: ["glass", "display", "board", "battery", "cam", "frame", "back"],
  air:  ["glass", "display", "board", "battery", "cam", "frame", "back"]
};

PRODUCTS.forEach(p => {
  // "Novo" marks only the newest model of each category
  p.cat = "iphone"; p.type = "iphone"; p.isNew = p.id === "iphone-17-pro-max";
  p.url = p.id + ".html";
  p.from = p.storage[0][1];
  p.parts = PARTS_BY_KIND[p.kind].map(id => ({ id, ...PART_COPY[id](p) }));
});

/* ---------- other products (simple product page with a 3D viewer) ---------- */
const C2 = (id, name, swatch, body = swatch) => ({ id, name, swatch, body });
const MAC_AIR = [C2("ceu", "Azul-céu", "#a9bdd1"), C2("prata", "Prateado", "#d6d7d9"), C2("estelar", "Estelar", "#e3d9c6"), C2("meianoite", "Meia-noite", "#2e3440")];
const OTHERS = [
  { id: "macbook-air-13", cat: "mac", type: "mac", geo: { inch: 13.6, pro: false }, name: 'MacBook Air 13"', isNew: false,
    colors: MAC_AIR, storage: [["Chip M5 · configuração de entrada", 15999]],
    tagline: "Fino, leve e silencioso, com chip M5.",
    highlights: [["Chip", "M5"], ["Tela", '13,6" Liquid Retina'], ["Peso", "1,24 kg"], ["Portas", "MagSafe + 2 Thunderbolt"]],
    specs: [["Chip", "Apple M5", "Sem ventoinha, totalmente silencioso"], ["Tela", '13,6" Liquid Retina', ""], ["Conexões", "MagSafe e 2 Thunderbolt", "Saída para fones"], ["Peso", "1,24 kg", ""]] },
  { id: "macbook-air-15", cat: "mac", type: "mac", geo: { inch: 15.3, pro: false }, name: 'MacBook Air 15"', isNew: false,
    colors: MAC_AIR, storage: [["Chip M5 · configuração de entrada", 17999]],
    tagline: "A tela grande do MacBook Air, com chip M5.",
    highlights: [["Chip", "M5"], ["Tela", '15,3" Liquid Retina'], ["Peso", "1,51 kg"], ["Som", "6 alto-falantes"]],
    specs: [["Chip", "Apple M5", "Sem ventoinha, totalmente silencioso"], ["Tela", '15,3" Liquid Retina', ""], ["Conexões", "MagSafe e 2 Thunderbolt", "Saída para fones"], ["Peso", "1,51 kg", ""]] },
  { id: "macbook-pro-14", cat: "mac", type: "mac", geo: { inch: 14.2, pro: true }, name: 'MacBook Pro 14"', isNew: true,
    colors: [C2("preto", "Preto-espacial", "#2b2c2f"), C2("prata", "Prateado", "#d4d5d7")], storage: [["Chip M5 · configuração de entrada", 24999]],
    tagline: "Tela Liquid Retina XDR e chip M5 para trabalho pesado.",
    highlights: [["Chip", "M5"], ["Tela", '14,2" XDR'], ["Bateria", "Até 24 h"], ["Portas", "3 Thunderbolt + HDMI + SD"]],
    specs: [["Chip", "Apple M5", ""], ["Tela", '14,2" Liquid Retina XDR', "Mini-LED"], ["Bateria", "Até 24 h", "Reprodução de vídeo"], ["Conexões", "3 Thunderbolt, HDMI, SDXC, MagSafe", ""]] },
  { id: "ipad", cat: "ipad", type: "ipad", geo: { inch: 11, pro: false }, name: "iPad", isNew: false,
    colors: [C2("azul", "Azul", "#9fb6d4"), C2("rosa", "Rosa", "#e7b9c2"), C2("amarelo", "Amarelo", "#efd879"), C2("prata", "Prateado", "#d6d7d9")],
    storage: [["128 GB · Wi‑Fi", 4499]],
    tagline: "O iPad para o dia a dia, com chip A16.",
    highlights: [["Chip", "A16"], ["Tela", '11" Liquid Retina'], ["Desbloqueio", "Touch ID"], ["Armazenamento", "128 GB"]],
    specs: [["Chip", "A16", ""], ["Tela", '11" Liquid Retina', ""], ["Segurança", "Touch ID no botão superior", ""], ["Armazenamento", "A partir de 128 GB", ""]] },
  { id: "ipad-air-11", cat: "ipad", type: "ipad", geo: { inch: 11, pro: false }, name: 'iPad Air 11"', isNew: false,
    colors: [C2("cinza", "Cinza-espacial", "#5d6066"), C2("azul", "Azul", "#a8bcd2"), C2("roxo", "Roxo", "#c3b6d8"), C2("estelar", "Estelar", "#e3d9c6")],
    storage: [["128 GB · Wi‑Fi", 9999]],
    tagline: "Leve e com chip M4, o mesmo de um Mac.",
    highlights: [["Chip", "M4"], ["Tela", '11" Liquid Retina'], ["Desbloqueio", "Touch ID"], ["Caneta", "Apple Pencil Pro"]],
    specs: [["Chip", "Apple M4", ""], ["Tela", '11" Liquid Retina', ""], ["Segurança", "Touch ID no botão superior", ""], ["Acessórios", "Apple Pencil Pro e Magic Keyboard", "Vendidos separadamente"]] },
  { id: "ipad-pro-11", cat: "ipad", type: "ipad", geo: { inch: 11, pro: true }, name: 'iPad Pro 11"', isNew: true,
    colors: [C2("preto", "Preto-espacial", "#2b2c2f"), C2("prata", "Prateado", "#d4d5d7")],
    storage: [["256 GB · Wi‑Fi", 12499], ["512 GB · Wi‑Fi", 14899], ["1 TB · Wi‑Fi", 19699]],
    tagline: "Tela OLED Ultra Retina XDR e chip M5 em 5,3 mm.",
    highlights: [["Chip", "M5"], ["Tela", '11" OLED XDR'], ["Espessura", "5,3 mm"], ["Desbloqueio", "Face ID"]],
    specs: [["Chip", "Apple M5", ""], ["Tela", '11" Ultra Retina XDR', "OLED em tandem"], ["Corpo", "5,3 mm", "Alumínio"], ["Segurança", "Face ID", ""]] },
  { id: "airpods-4", cat: "airpods", type: "airpods", geo: { pro: false }, name: "AirPods 4", isNew: false,
    colors: [C2("branco", "Branco", "#f2f2f0")], storage: [["Estojo de recarga USB‑C", 1499]],
    tagline: "Novo formato, chip H2 e áudio espacial personalizado.",
    highlights: [["Chip", "H2"], ["Áudio", "Espacial"], ["Estojo", "USB‑C"], ["Bateria", "Até 30 h com estojo"]],
    specs: [["Chip", "H2", ""], ["Áudio", "Espacial personalizado", "Com rastreamento da cabeça"], ["Estojo", "USB‑C", ""], ["Bateria", "Até 30 h com o estojo", ""]] },
  { id: "airpods-pro-3", cat: "airpods", type: "airpods", geo: { pro: true }, name: "AirPods Pro 3", isNew: true,
    colors: [C2("branco", "Branco", "#f2f2f0")], storage: [["Estojo MagSafe USB‑C", 2699]],
    tagline: "Cancelamento de ruído ainda maior, sensor de batimentos e tradução ao vivo.",
    highlights: [["Ruído", "Cancelamento ativo"], ["Saúde", "Sensor cardíaco"], ["Recurso", "Tradução ao vivo"], ["Resistência", "IP57"]],
    specs: [["Cancelamento de ruído", "Ativo", "Com modo Ambiente"], ["Saúde", "Sensor de frequência cardíaca", "Para treinos"], ["Recursos", "Tradução ao vivo", "Com iPhone compatível"], ["Resistência", "IP57", "Poeira, suor e água"]] },
  { id: "airpods-max", cat: "airpods", type: "max", geo: {}, name: "AirPods Max", isNew: false,
    colors: [C2("meianoite", "Meia-noite", "#3a3d45"), C2("estelar", "Estelar", "#e6dccb"), C2("azul", "Azul", "#a9bfd6"), C2("roxo", "Roxo", "#c9b8d9"), C2("laranja", "Laranja", "#f0a77e")],
    storage: [["USB‑C · Smart Case", 6999]],
    tagline: "Fone sobre a orelha com cancelamento de ruído e áudio espacial.",
    highlights: [["Ruído", "Cancelamento ativo"], ["Áudio", "Espacial"], ["Bateria", "Até 20 h"], ["Conector", "USB‑C"]],
    specs: [["Cancelamento de ruído", "Ativo", "Com modo Ambiente"], ["Alto-falante", "Dinâmico de 40 mm", "Feito pela Apple"], ["Bateria", "Até 20 h", "Com cancelamento ligado"], ["Controles", "Digital Crown e botão", "Volume, faixas e Siri"]] },
  { id: "watch-se-3", cat: "watch", type: "watch", geo: { mm: 44, ultra: false }, name: "Apple Watch SE 3", isNew: false,
    colors: [C2("meianoite", "Meia-noite", "#2e3440"), C2("estelar", "Estelar", "#e3d9c6")], storage: [["40 mm · GPS", 3299], ["44 mm · GPS", 3699]],
    tagline: "O essencial do Apple Watch, agora com tela sempre ativa.",
    highlights: [["Tela", "Sempre ativa"], ["Tamanhos", "40 e 44 mm"], ["Caixa", "Alumínio"], ["Saúde", "Sono e treinos"]],
    specs: [["Tela", "Retina sempre ativa", ""], ["Tamanhos", "40 mm e 44 mm", ""], ["Caixa", "Alumínio", ""], ["Saúde", "Sono, frequência cardíaca e treinos", ""]] },
  { id: "watch-series-11", cat: "watch", type: "watch", geo: { mm: 46, ultra: false }, name: "Apple Watch Series 11", isNew: false,
    colors: [C2("preto", "Preto-azeviche", "#1f2024"), C2("prata", "Prateado", "#d4d5d7"), C2("rosa", "Ouro-rosa", "#e6c4b8"), C2("cinza", "Cinza-espacial", "#5d6066")],
    storage: [["Alumínio · GPS", 5499]],
    tagline: "O Apple Watch mais fino, com até 24 horas de bateria.",
    highlights: [["Bateria", "Até 24 h"], ["Tamanhos", "42 e 46 mm"], ["Saúde", "Alertas de hipertensão"], ["Rede", "5G (celular)"]],
    specs: [["Bateria", "Até 24 h", ""], ["Tamanhos", "42 mm e 46 mm", ""], ["Saúde", "Notificações de hipertensão e escore de sono", ""], ["Caixa", "Alumínio ou titânio", "Titânio a partir de R$ 9.299"]] },
  { id: "watch-ultra-3", cat: "watch", type: "watch", geo: { mm: 49, ultra: true }, name: "Apple Watch Ultra 3", isNew: true,
    colors: [C2("natural", "Titânio natural", "#c9c3b8"), C2("preto", "Titânio preto", "#2a2a2c")], storage: [["49 mm · GPS + Celular", 10499]],
    tagline: "Titânio, tela maior e mensagens por satélite.",
    highlights: [["Caixa", "Titânio 49 mm"], ["Bateria", "Até 42 h"], ["Emergência", "Via satélite"], ["Profundidade", "Mergulho até 40 m"]],
    specs: [["Caixa", "Titânio, 49 mm", ""], ["Bateria", "Até 42 h", "Até 72 h no modo de pouca energia"], ["Conectividade", "5G e satélite", "SOS e mensagens"], ["Esportes", "Mergulho recreativo até 40 m", ""]] },
  { id: "vision-pro", cat: "vision", type: "vision", geo: {}, name: "Apple Vision Pro", isNew: true,
    colors: [C2("prata", "Prateado", "#c9cbcf")], storage: [["256 GB · importado", 37999], ["512 GB · importado", 39999], ["1 TB · importado", 41999]],
    tagline: "Computador espacial com chip M5, 12 câmeras e telas micro-OLED.",
    highlights: [["Chips", "M5 + R1"], ["Telas", "Micro-OLED 4K"], ["Câmeras", "12 + LiDAR"], ["Bateria", "Até 2,5 h"]],
    specs: [["Chips", "M5 e R1", "O R1 processa as câmeras e sensores"], ["Telas", "Duas micro-OLED", "23 milhões de pixels, até 120 Hz"], ["Câmeras e sensores", "12 câmeras, LiDAR e TrueDepth", "Rastreio de olhos e mãos"], ["Bateria", "Até 2,5 h de uso", "Até 3 h de vídeo; bateria externa"]] }
];
/* ---------- the "por dentro" story for every other product ---------- */
const GIANT = {
  "macbook-air-13": ["MACBOOK", "AIR"], "macbook-air-15": ["MACBOOK", "AIR"], "macbook-pro-14": ["MACBOOK", "PRO"],
  "ipad": ["iPAD", "A16"], "ipad-air-11": ["iPAD", "AIR"], "ipad-pro-11": ["iPAD", "PRO"],
  "airpods-4": ["AIRPODS", "4"], "airpods-pro-3": ["AIRPODS", "PRO"],
  "watch-se-3": ["WATCH", "SE"], "watch-series-11": ["WATCH", "11"], "watch-ultra-3": ["WATCH", "ULTRA"],
  "airpods-max": ["AIRPODS", "MAX"], "vision-pro": ["VISION", "PRO"]
};
const CHIP = { "macbook-air-13": "M5", "macbook-air-15": "M5", "macbook-pro-14": "M5", "ipad": "A16", "ipad-air-11": "M4", "ipad-pro-11": "M5",
  "airpods-4": "H2", "airpods-pro-3": "H2", "watch-se-3": "S10", "watch-series-11": "S10", "watch-ultra-3": "S10", "airpods-max": "H1", "vision-pro": "M5" };
const DESIGN = {
  mac: { h: "Alumínio inteiro, do teclado ao fundo.", p: "O corpo é usinado em alumínio e guarda tela, teclado, bateria e placa em poucos milímetros." },
  ipad: { h: "Uma tela inteira na palma da mão.", p: "Corpo de alumínio com laterais retas e uma tela que vai quase de ponta a ponta." },
  airpods: { h: "Pequenos por fora, cheios de peças por dentro.", p: "Cada fone tem chip, alto-falante, microfones e bateria. O estojo tem a própria bateria e carrega os dois." },
  watch: { h: "Um computador inteiro numa caixa de pulso.", p: "Por baixo do vidro ficam tela, chip, bateria e os sensores que encostam na pele." },
  max: { h: "Alumínio, aço inox e tecido.", p: "As conchas são de alumínio anodizado, a haste é de aço inoxidável e a malha em cima distribui o peso pela cabeça." },
  vision: { h: "Vidro, alumínio e 12 câmeras.", p: "Uma única peça de vidro laminado cobre as câmeras e sensores. Por trás, uma moldura de alumínio guarda dois chips e duas telas." }
};
const COPY = {
  mac: {
    display: p => ({ eyebrow: "Tela", h: `Liquid Retina${p.geo.pro ? " XDR" : ""} de ${p.geo.inch.toLocaleString("pt-BR")}".`, p: `Uma tela de bordas finas com a câmera de 12 MP no entalhe do topo. ${p.geo.pro ? "O painel mini-LED chega a brilho de HDR." : "Fina o bastante para a tampa pesar quase nada."}`, stats: [["Tamanho", p.geo.inch.toLocaleString("pt-BR") + '"'], ["Câmera", "12 MP"], ["Tipo", p.geo.pro ? "Mini-LED" : "LCD"]] }),
    keyboard: p => ({ eyebrow: "Teclado", h: "Magic Keyboard com Touch ID.", p: "Teclas de curso curto e iluminação. No canto, o Touch ID desbloqueia o Mac e confirma compras. Abaixo, o trackpad Force Touch responde à pressão.", stats: [["Teclado", "Magic"], ["Desbloqueio", "Touch ID"], ["Trackpad", "Force Touch"]] }),
    board: p => ({ eyebrow: "Placa lógica", h: `Chip ${p.chip}: processador, gráficos e memória juntos.`, p: `O ${p.chip} reúne CPU, GPU, Neural Engine e a memória unificada num só encapsulamento, ao lado do armazenamento SSD.`, stats: [["Chip", p.chip], ["Memória", "Unificada"], ["Armazenamento", "SSD"]] }),
    battery: p => ({ eyebrow: "Bateria", h: p.geo.pro ? "Até 24 horas longe da tomada." : "Bateria espalhada pelo corpo.", p: "As células de polímero de lítio ocupam quase todo o espaço sob o teclado e carregam pelo MagSafe ou pelo USB‑C.", stats: p.geo.pro ? [["Vídeo", "Até 24 h"], ["Carga", "MagSafe 3"], ["Tipo", "Polímero"]] : [["Carga", "MagSafe 3"], ["Também", "USB‑C"], ["Tipo", "Polímero"]] }),
    ports: p => ({ eyebrow: "Som e portas", h: p.geo.pro ? "Seis alto-falantes e todas as portas." : "Alto-falantes e MagSafe.", p: p.geo.pro ? "Thunderbolt, HDMI, leitor de cartão SD e MagSafe 3 dos lados, e alto-falantes com graves que não distorcem." : "Duas portas Thunderbolt, MagSafe 3 e saída para fones, com alto-falantes integrados ao corpo.", stats: p.geo.pro ? [["Thunderbolt", "3"], ["HDMI", "Sim"], ["Cartão", "SDXC"]] : [["Thunderbolt", "2"], ["Carga", "MagSafe 3"], ["Fones", "3,5 mm"]] }),
    bottom: p => ({ eyebrow: "Base", h: p.geo.pro ? "Ventilação ativa no fundo." : "Sem ventoinha. Sem barulho.", p: p.geo.pro ? "A ventilação tira o ar quente pelas laterais, e o corpo de alumínio ajuda a espalhar o calor em tarefas pesadas." : "O MacBook Air não tem ventoinha: o calor se espalha pelo alumínio, e ele fica totalmente silencioso.", stats: p.geo.pro ? [["Ventilação", "Ativa"], ["Corpo", "Alumínio"], ["Pés", "Borracha"]] : [["Ventoinha", "Nenhuma"], ["Ruído", "Zero"], ["Corpo", "Alumínio"]] })
  },
  ipad: {
    display: p => ({ eyebrow: "Tela", h: p.geo.pro ? "Ultra Retina XDR em OLED duplo." : "Liquid Retina de 11 polegadas.", p: p.geo.pro ? "Duas camadas de OLED empilhadas dão brilho alto e pretos perfeitos, numa tela de 11 polegadas." : "Tela laminada com cores amplas e antirreflexo, boa para ler, desenhar e assistir.", stats: [["Tamanho", '11"'], ["Tipo", p.geo.pro ? "OLED" : "LCD"], ["Caneta", p.id === "ipad" ? "USB‑C" : "Pencil Pro"]] }),
    board: p => ({ eyebrow: "Placa lógica", h: `Chip ${p.chip}.`, p: `O ${p.chip} fica numa placa estreita ao longo da lateral, deixando o resto do corpo para a bateria.`, stats: [["Chip", p.chip], ["Rede", "Wi‑Fi"], ["Porta", "USB‑C"]] }),
    battery: p => ({ eyebrow: "Bateria", h: "Duas células, um dia inteiro.", p: "As duas células ocupam a maior parte do corpo e dão bateria para o dia todo de uso.", stats: [["Células", "2"], ["Uso", "Dia todo"], ["Carga", "USB‑C"]] }),
    cam: p => ({ eyebrow: "Câmeras", h: "Câmera frontal na lateral maior.", p: "A câmera da frente fica na borda horizontal, certa para chamadas de vídeo com o iPad deitado. Atrás, a câmera grande digitaliza documentos.", stats: [["Frontal", "12 MP"], ["Posição", "Horizontal"], ["Traseira", p.geo.pro ? "+ LiDAR" : "12 MP"]] }),
    body: p => ({ eyebrow: "Corpo", h: "Alumínio de lado a lado.", p: "A carcaça de alumínio leva os alto-falantes nos cantos e o botão superior com Touch ID ou a câmera do Face ID.", stats: [["Material", "Alumínio"], ["Alto-falantes", p.geo.pro ? "4" : "2"], ["Desbloqueio", p.geo.pro ? "Face ID" : "Touch ID"]] })
  },
  airpods: {
    lid: p => ({ eyebrow: "Tampa", h: "Uma tampa que fecha com ímãs.", p: "A tampa abre com um dedo e fecha sozinha com ímãs. A dobradiça é de metal para durar anos de uso.", stats: [["Fecho", "Magnético"], ["Dobradiça", "Metal"], ["Abertura", "1 dedo"]] }),
    buds: p => ({ eyebrow: "Fones", h: "Chip H2 em cada fone.", p: p.geo.pro ? "Cada fone tem chip H2, alto-falante, microfones para o cancelamento de ruído e um sensor de batimentos." : "Cada fone tem chip H2, alto-falante e microfones que separam a sua voz do ruído em volta.", stats: p.geo.pro ? [["Chip", "H2"], ["Ruído", "Cancela"], ["Saúde", "Batimentos"]] : [["Chip", "H2"], ["Áudio", "Espacial"], ["Microfones", "Com voz isolada"]] }),
    cradle: p => ({ eyebrow: "Berço", h: "Cada fone volta ao lugar sozinho.", p: "Ímãs puxam os fones para os encaixes, onde contatos de metal começam a carga.", stats: [["Encaixe", "Magnético"], ["Contatos", "Metal"], ["Carga", "Automática"]] }),
    board: p => ({ eyebrow: "Bateria do estojo", h: "Mais cargas guardadas no estojo.", p: p.geo.pro ? "A bateria do estojo recarrega os fones várias vezes. Um alto-falante embutido toca para você achar o estojo pelo app Buscar." : "A bateria do estojo recarrega os fones várias vezes ao longo do dia.", stats: [["Bateria", "Interna"], ["Total", p.geo.pro ? "Várias cargas" : "Até 30 h"], ["Buscar", p.geo.pro ? "Com som" : "Sim"]] }),
    shell: p => ({ eyebrow: "Estojo", h: p.geo.pro ? "USB‑C e MagSafe." : "Carga por USB‑C.", p: p.geo.pro ? "Carregue com o mesmo cabo do iPhone ou encoste num carregador MagSafe." : "O estojo carrega com o mesmo cabo USB‑C do iPhone e do Mac.", stats: p.geo.pro ? [["Cabo", "USB‑C"], ["Sem fio", "MagSafe"], ["Proteção", "IP57"]] : [["Cabo", "USB‑C"], ["Tamanho", "Compacto"], ["Cor", "Branco"]] })
  },
  watch: {
    glass: p => ({ eyebrow: "Vidro", h: p.geo.ultra ? "Cristal de safira plano." : "Vidro que resiste a riscos.", p: p.geo.ultra ? "A frente é de safira, com a borda de titânio subindo para proteger o vidro de pancadas." : "O vidro curvo cobre a tela de ponta a ponta e resiste aos riscos do dia a dia.", stats: [["Material", p.geo.ultra ? "Safira" : "Ion-X"], ["Formato", p.geo.ultra ? "Plano" : "Curvo"], ["Água", p.geo.ultra ? "100 m" : "50 m"]] }),
    display: p => ({ eyebrow: "Tela", h: "Sempre ativa.", p: "A tela fica ligada com o pulso abaixado, com brilho baixo, e acende por completo quando você olha.", stats: [["Tipo", "OLED"], ["Modo", "Sempre ativa"], ["Brilho", "Automático"]] }),
    chip: p => ({ eyebrow: "Chip", h: "Chip S10.", p: "O S10 roda os apps, o Siri e os recursos de saúde sem depender do iPhone o tempo todo.", stats: [["Chip", "S10"], ["Siri", "No relógio"], ["Rede", p.geo.ultra ? "5G" : "Bluetooth e Wi‑Fi"]] }),
    battery: p => ({ eyebrow: "Bateria", h: p.geo.ultra ? "Até 42 horas." : p.id === "watch-series-11" ? "Até 24 horas." : "Bateria para o dia.", p: "A bateria fica entre a placa e a traseira, ocupando quase toda a caixa.", stats: [["Duração", p.geo.ultra ? "42 h" : p.id === "watch-series-11" ? "24 h" : "Dia todo"], ["Carga", "Rápida"], ["Cabo", "Magnético"]] }),
    case: p => ({ eyebrow: "Caixa", h: p.geo.ultra ? "Titânio de 49 mm." : "Caixa de alumínio.", p: p.geo.ultra ? "A caixa de titânio leva a Digital Crown, o botão lateral e o Botão de Ação laranja." : "A caixa leva a Digital Crown, que gira e clica, e o botão lateral.", stats: [["Material", p.geo.ultra ? "Titânio" : "Alumínio"], ["Coroa", "Digital Crown"], ["Botões", p.geo.ultra ? "3" : "2"]] }),
    back: p => ({ eyebrow: "Sensores", h: "Sensores que encostam na pele.", p: "A traseira lê os batimentos, acompanha o sono e os treinos, e carrega sem fio pelo cabo magnético.", stats: [["Coração", "Óptico"], ["Sono", "Sim"], ["Carga", "Magnética"]] })
  },
  max: {
    shell: p => ({ eyebrow: "Concha", h: "Digital Crown no alumínio.", p: "A concha de alumínio anodizado traz a Digital Crown, que controla volume, faixas e Siri, e o botão do cancelamento de ruído.", stats: [["Material", "Alumínio"], ["Volume", "Digital Crown"], ["Botão", "Ruído"]] }),
    board: p => ({ eyebrow: "Chips e microfones", h: "Um chip H1 em cada lado.", p: "Cada concha tem um chip H1. São 9 microfones no total: 8 para o cancelamento de ruído e 3 para a sua voz, alguns fazendo as duas coisas.", stats: [["Chips", "2× H1"], ["Microfones", "9"], ["Ajuste", "Equalização adaptativa"]] }),
    battery: p => ({ eyebrow: "Bateria", h: "Até 20 horas por carga.", p: "A bateria fica na concha e dura até 20 horas com cancelamento de ruído e áudio espacial ligados. Carrega pelo USB‑C.", stats: [["Duração", "20 h"], ["Carga", "USB‑C"], ["Rápida", "5 min = 1,5 h"]] }),
    driver: p => ({ eyebrow: "Alto-falante", h: "Driver dinâmico de 40 mm.", p: "Projetado pela Apple, com motor de ímã de neodímio em anel duplo para graves fortes sem distorção, mesmo no volume alto.", stats: [["Tamanho", "40 mm"], ["Ímã", "Anel duplo"], ["Distorção", "Mínima"]] }),
    cushion: p => ({ eyebrow: "Almofada", h: "Espuma com memória, presa por ímãs.", p: "As almofadas de espuma com memória se ajustam à orelha, vedam o som e saem com um puxão: são presas por ímãs.", stats: [["Espuma", "Memória"], ["Fixação", "Ímãs"], ["Troca", "Fácil"]] }),
    headband: p => ({ eyebrow: "Haste", h: "Aço inox e malha respirável.", p: "A estrutura de aço inoxidável segura as conchas, e a malha de tecido no topo espalha o peso para o fone não apertar.", stats: [["Estrutura", "Aço inox"], ["Topo", "Malha"], ["Braços", "Telescópicos"]] })
  },
  vision: {
    glass: p => ({ eyebrow: "Vidro frontal", h: "Uma peça de vidro laminado 3D.", p: "O vidro curvo protege câmeras e sensores e serve de janela para a tela EyeSight, que mostra seus olhos a quem está perto.", stats: [["Vidro", "Laminado"], ["Formato", "Curvo 3D"], ["Tela externa", "EyeSight"]] }),
    sensors: p => ({ eyebrow: "Câmeras e sensores", h: "12 câmeras, LiDAR e TrueDepth.", p: "Câmeras de alta resolução mostram o mundo à sua volta; as outras acompanham as mãos, o ambiente e o seu rosto.", stats: [["Câmeras", "12"], ["Profundidade", "LiDAR"], ["Mãos", "Rastreadas"]] }),
    chips: p => ({ eyebrow: "Chips", h: "M5 para os apps, R1 para os sensores.", p: "O M5 roda o visionOS e os apps. O R1 junta as imagens das câmeras e sensores e as entrega às telas em 12 milissegundos.", stats: [["Apps", "M5"], ["Sensores", "R1"], ["Atraso", "12 ms"]] }),
    displays: p => ({ eyebrow: "Telas", h: "23 milhões de pixels em duas telas.", p: "Cada olho tem uma tela micro-OLED do tamanho de um selo, mais nítida que uma TV 4K, atrás de lentes personalizadas.", stats: [["Pixels", "23 mi"], ["Tipo", "Micro-OLED"], ["Taxa", "Até 120 Hz"]] }),
    frame: p => ({ eyebrow: "Moldura", h: "Alumínio com alto-falantes nas hastes.", p: "A moldura de liga de alumínio leva a Digital Crown, o botão superior e os alto-falantes de áudio espacial perto dos ouvidos.", stats: [["Material", "Alumínio"], ["Controles", "Crown e botão"], ["Áudio", "Espacial"]] }),
    seal: p => ({ eyebrow: "Vedação e faixa", h: "Tecido que se molda ao rosto.", p: "A vedação de luz encaixa por ímãs e a faixa de malha 3D se ajusta com um botão giratório.", stats: [["Vedação", "Magnética"], ["Faixa", "Malha 3D"], ["Ajuste", "Botão giratório"]] })
  }
};
OTHERS.forEach(p => {
  p.url = "produto.html?id=" + p.id; p.from = p.storage[0][1];
  p.chip = CHIP[p.id]; p.giant = GIANT[p.id];
  p.hero = p.tagline + " Role a página para ver o que tem dentro.";
  // story copy follows the model type (AirPods Max shares the AirPods category but not the earbud story)
  p.design = DESIGN[p.type];
  p.designStats = p.highlights.slice(0, 3);
  p.assembleH = "Tudo de volta no lugar.";
  p.parts = Object.keys(COPY[p.type]).map(id => ({ id, ...COPY[p.type][id](p) }));
});
PRODUCTS.forEach(p => {
  p.designStats = [["Espessura", p.mm[2].toLocaleString("pt-BR") + " mm"], ["Peso", p.weight + " g"], ["Proteção", "IP68"]];
  p.assembleH = `Tudo de volta em ${p.mm[2].toLocaleString("pt-BR")} mm.`;
});

const ALL = [...PRODUCTS, ...OTHERS];
// Pre-rendered previews: browser rendering is only a fallback for new catalogue entries.
const PREVIEWS = new Set(["airpods-4-branco", "airpods-max-azul", "airpods-max-estelar", "airpods-max-laranja", "airpods-max-meianoite", "airpods-max-roxo", "airpods-pro-3-branco", "ipad-air-11-azul", "ipad-air-11-cinza", "ipad-air-11-estelar", "ipad-air-11-roxo", "ipad-amarelo", "ipad-azul", "ipad-prata", "ipad-pro-11-prata", "ipad-pro-11-preto", "ipad-rosa", "iphone-17-branco", "iphone-17-lavanda", "iphone-17-nevoa", "iphone-17-preto", "iphone-17-pro-azul", "iphone-17-pro-laranja", "iphone-17-pro-max-azul", "iphone-17-pro-max-laranja", "iphone-17-pro-max-prata", "iphone-17-pro-prata", "iphone-17-salvia", "iphone-air-azul", "iphone-air-branco", "iphone-air-dourado", "iphone-air-preto", "macbook-air-13-ceu", "macbook-air-13-estelar", "macbook-air-13-meianoite", "macbook-air-13-prata", "macbook-air-15-ceu", "macbook-air-15-estelar", "macbook-air-15-meianoite", "macbook-air-15-prata", "macbook-pro-14-prata", "macbook-pro-14-preto", "vision-pro-prata", "watch-se-3-estelar", "watch-se-3-meianoite", "watch-series-11-cinza", "watch-series-11-prata", "watch-series-11-preto", "watch-series-11-rosa", "watch-ultra-3-natural", "watch-ultra-3-preto"]);

window.STORE = {
  name: "iNova Tech",
  phones: PRODUCTS,
  products: ALL,
  categories: [
    // "kw" are the everyday words people type in the search box
    { id: "iphone", name: "iPhone", kw: "celular telefone smartphone" },
    { id: "mac", name: "Mac", kw: "notebook laptop computador macbook" },
    { id: "ipad", name: "iPad", kw: "tablet" },
    { id: "airpods", name: "AirPods", kw: "fone fones ouvido headphone earbuds" },
    { id: "watch", name: "Watch", kw: "relogio relógio smartwatch apple watch" },
    { id: "vision", name: "Vision", kw: "oculos óculos realidade virtual aumentada mista vr ar headset camera câmera" }
  ],
  image(p, ci = 0){
    if (p.images?.[ci]) return p.images[ci];
    const key = `${p.id}-${(p.colors[ci] || p.colors[0]).id}`;
    return PREVIEWS.has(key) ? `assets/thumbs/${key}.webp` : "";
  },
  get: id => ALL.find(p => p.id === id),
  brl: v => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })
};
})();
