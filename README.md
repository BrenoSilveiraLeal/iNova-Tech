# iNova Tech

Vitrine de e-commerce para uma revenda independente de produtos Apple. O projeto demonstra uma experiência de loja responsiva, com catálogo pesquisável, sacola e páginas interativas que apresentam os produtos em 3D.

> **Demonstração de front-end:** não existe backend, pagamento ou pedido real neste projeto. O checkout é simulado e não cobra nem envia dados.

## O que o projeto demonstra

- Catálogo com busca, categorias, filtros, ordenação e seleção de cores.
- Sacola persistida no navegador e fluxo visual de checkout.
- Páginas de produto com animações e cenas 3D interativas.
- Layout responsivo, estados de carregamento e suporte à preferência por movimento reduzido.
- Interface e conteúdo em português do Brasil.

## Tecnologias

- HTML semântico, CSS e JavaScript sem framework ou etapa de compilação.
- [Three.js](https://threejs.org/) para as cenas 3D e [Anime.js](https://animejs.com/) para animações, carregados por CDN.
- Fontes Archivo e IBM Plex Mono servidas pelo Google Fonts.
- Miniaturas WebP locais em `assets/thumbs/`.

É necessária uma conexão à internet para carregar as bibliotecas e fontes externas.

## Estrutura

```text
.
├── index.html                 # Vitrine e catálogo
├── produto.html               # Página 3D por identificador de produto
├── iphone-17.html             # Página 3D do iPhone 17
├── iphone-air.html             # Página 3D do iPhone Air
├── iphone-17-pro.html          # Página 3D do iPhone 17 Pro
├── iphone-17-pro-max.html      # Página 3D do iPhone 17 Pro Max
└── assets/
    ├── catalogo.js             # Produtos, preços, categorias e imagens
    ├── carrinho.js              # Sacola, checkout de demonstração e fotos opcionais
    ├── aparelhos3d.js            # Cenas 3D de aparelhos
    ├── fone3d.js                 # Cenas 3D de áudio
    ├── produto.js                # Experiência das páginas de produto
    ├── loading.js                # Estado de carregamento da página
    ├── escala.js                 # Escala responsiva e posição de rolagem ao atualizar
    ├── loja.css                  # Estilos compartilhados
    ├── loading.css               # Estilos do carregamento
    ├── favicon.svg               # Ícone da loja
    └── thumbs/                   # Miniaturas do catálogo
```

## Executar localmente

Sirva a pasta pela raiz do projeto com qualquer servidor HTTP estático. Por exemplo, com Python:

```bash
python -m http.server 8000
```

Depois, abra <http://localhost:8000>. Não há instalação de pacotes nem configuração de variáveis de ambiente.

## Personalizar o catálogo

Edite `PRODUCTS`, `OTHERS` e os dados da loja em `assets/catalogo.js`. A sacola, os cupons e os prazos ilustrativos de entrega ficam em `assets/carrinho.js`.

As miniaturas incluídas em `assets/thumbs/` são usadas pela vitrine. Para experimentar fotos próprias, crie uma pasta `fotos/` e configure os caminhos no campo `images` dos produtos em `assets/catalogo.js`. Use apenas imagens que você tenha autorização para publicar.

## Publicar

O site pode ser publicado como conteúdo estático, por exemplo no GitHub Pages, Netlify ou Vercel. Publique os arquivos HTML e a pasta `assets/` mantendo a estrutura de diretórios. Não são necessárias chaves de API no navegador.

Antes de usar a loja comercialmente, conecte o checkout a um backend e a um provedor de pagamentos, valide preços, disponibilidade, frete, privacidade e direitos de uso das imagens. Nunca coloque segredos ou chaves privadas em JavaScript ou HTML público.

## Marcas e conteúdo

iNova Tech é uma demonstração de revenda independente e não é afiliada à Apple Inc. Apple, iPhone, Mac, iPad, AirPods, Apple Watch e Apple Vision Pro são marcas de seus respectivos titulares. Preços e disponibilidade exibidos são ilustrativos; confirme-os antes de qualquer uso comercial.
