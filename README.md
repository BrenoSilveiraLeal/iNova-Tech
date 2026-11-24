# iNova Tech

Vitrine de e-commerce para uma revenda independente de produtos Apple, construída como projeto de portfólio de front-end. Reúne catálogo pesquisável, sacola, checkout simulado e páginas de produto com cenas 3D interativas, sem framework e sem etapa de compilação.

> **Demonstração:** não há backend, pagamento ou pedido real. O checkout é simulado e não cobra nem envia dados. Nenhuma chave de API ou segredo é necessário.

## O que o projeto demonstra

- Catálogo com busca, categorias, filtros, ordenação e seleção de cores.
- Sacola persistida no navegador (`localStorage`), cálculo de frete e cupom ilustrativos e checkout com validação de formulário.
- Páginas de produto com animação guiada pela rolagem e cenas 3D (Three.js) geradas proceduralmente.
- Escala proporcional: a composição é a mesma em qualquer monitor desktop (ver abaixo).
- Responsivo de 375 px a 4K, com estados de carregamento e suporte a `prefers-reduced-motion`.
- Conteúdo e interface em português do Brasil.

## Tecnologias

- HTML semântico, CSS e JavaScript puros.
- [Three.js](https://threejs.org/) e [Anime.js](https://animejs.com/) por CDN; fontes Archivo e IBM Plex Mono pelo Google Fonts (é preciso conexão com a internet).
- Miniaturas WebP locais em `assets/img/thumbs/`.

## Estrutura

```text
.
├── index.html                  # Vitrine e catálogo
├── produto.html                # Página 3D genérica (?id=<produto>)
├── iphone-17*.html, iphone-air.html   # Páginas 3D dedicadas de iPhone
├── assets/
│   ├── css/
│   │   ├── loja.css            # Estilos compartilhados
│   │   └── loading.css         # Tela de carregamento
│   ├── js/
│   │   ├── catalogo.js         # Camada de dados: produtos, preços, categorias, imagens (window.STORE)
│   │   ├── carrinho.js         # Sacola, frete, cupom e checkout simulado
│   │   ├── produto.js          # Experiência das páginas de produto
│   │   ├── fone3d.js           # Cenas 3D de iPhone e áudio
│   │   ├── aparelhos3d.js      # Cenas 3D de Mac, iPad, Watch e Vision
│   │   ├── escala.js           # Escala proporcional da interface
│   │   ├── loading.js          # Estado de carregamento
│   │   └── scroll-restoration.js  # Atualizar a página volta ao topo
│   └── img/                    # Favicon e miniaturas dos produtos
└── qa-reports/                 # Relatórios de QA, com os scripts Playwright usados
```

### Arquitetura e ponto de integração com um backend

Não existe servidor, mas as responsabilidades já estão separadas para facilitar a integração:

- **Dados** ficam apenas em `catalogo.js`, exposto como `window.STORE` (`get`, `image`, `brl`, `products`). Trocar esse arquivo por chamadas a uma API REST não exige mexer nas páginas.
- **Sacola e checkout** ficam em `carrinho.js`. O ponto onde um backend assumiria (preço, frete, cupom e criação do pedido) é o envio do formulário de checkout, hoje apenas simulado.
- **Apresentação 3D** é independente dos dados e é escolhida pelo `type` do produto.

## Escala proporcional

O layout foi desenhado para uma tela de referência de 1366 × 720. `assets/js/escala.js` ajusta o tamanho da fonte raiz conforme a janela (fator entre 0,6 e 2,5), e como quase todo o CSS usa `rem`, a interface cresce ou encolhe por inteiro, mantendo a mesma composição. Abaixo de 900 px de largura vale o layout responsivo normal.

## Executar localmente

```bash
python -m http.server 8000
```

Abra <http://localhost:8000>. Não há instalação de pacotes nem variáveis de ambiente.

## Personalizar o catálogo

Edite `PRODUCTS`, `OTHERS` e `PREVIEWS` em `assets/js/catalogo.js`. Para adicionar um produto com miniaturas, salve `assets/img/thumbs/<produto>-<cor>.webp` e inclua o nome em `PREVIEWS`; sem a miniatura, a vitrine usa um render 3D. Fotos próprias podem ser colocadas em uma pasta `fotos/` (`<produto>-<cor>.png`); use apenas imagens que você tenha autorização para publicar.

## Qualidade

A pasta `qa-reports/` guarda as rodadas de QA com Playwright (rotas × 7 resoluções, console, rede, imagens quebradas, overflow e fluxos). Para repetir a mais recente, com o servidor ativo:

```bash
pip install playwright
python qa-reports/2026-11-23/qa.py
python qa-reports/2026-11-23/flows.py
```

## Publicar

Conteúdo 100% estático: GitHub Pages, Netlify ou Vercel servem a raiz do repositório. O `.gitignore` já exclui `.env`, chaves e certificados, caso um backend seja adicionado. Antes de uso comercial, conecte um backend e um provedor de pagamento e valide preços, estoque, frete, privacidade e direitos de imagem. Nunca coloque segredos em JavaScript ou HTML público.

## Marcas e conteúdo

iNova Tech é uma demonstração de revenda independente e não é afiliada à Apple Inc. Apple, iPhone, Mac, iPad, AirPods, Apple Watch e Apple Vision Pro são marcas de seus respectivos titulares. Preços e disponibilidade são ilustrativos.
