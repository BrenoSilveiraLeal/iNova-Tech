# Relatório de QA — iNova Tech — 23/11/2026

## Ambiente
- Servidor estático local (`python -m http.server 8000`), Microsoft Edge 158 via Playwright (Python); o Chromium do Playwright não estava instalado.
- Skill: `ultimate-website-qa`. Scripts: `qa.py` (matriz) e `flows.py` (fluxos). Evidências em `screenshots/` (ignorado pelo Git).

## Alterações verificadas
| Mudança | Verificação | Resultado |
|---|---|---|
| Remoção do Apple Watch SE 3 | Catálogo com 16 produtos; grade mostra só Series 11 e Ultra 3; `?id=watch-se-3` mostra produto inexistente | Pass |
| Remoção do carregador `.glb` opcional (código morto) | Nenhum 404 nem erro de console nas 61 combinações | Pass |
| Escala proporcional (`escala.js`) | Fonte raiz 16 px em 1366, 17,99 em 1536, 22,49 em 1920, 40 em 3840; razão com a referência 1,00 em 1366×720, 1920×1012 e 2560×1350 | Pass |
| Reorganização `assets/css`, `js`, `img` | Nova rodada completa após mover os arquivos | Pass |

## Cobertura
- 19 rotas (home, 4 páginas de iPhone, 12 produtos, SE 3 removido e ID inválido). 7 rotas nas 7 resoluções (375×812, 430×932, 768×1024, 1366×768, 1536×864, 1920×1080, 3840×2160); as demais em 1366×768. Total: 61 combinações.
- Em todas: HTTP 200, sem erros de console, sem requisições falhas, sem imagens quebradas e sem overflow horizontal.
- Fluxos: busca "AirPods Pro", ausência do SE 3 e escala proporcional (`flows.log`).

## Achados
- **Nenhum defeito confirmado.** Uma ocorrência isolada de `ERR_CONNECTION_REFUSED` (vision-pro, 375×812) foi do servidor de teste; repetida 3 vezes, sem erro.

## Limites
- Não foram reexecutados nesta rodada: filtros móveis, sacola, frete, cupom e checkout (cobertos em 16/11 e sem código alterado, mas a reorganização de pastas não foi reexercitada nesses fluxos). Sem backend, banco ou pagamento real.
- Capturas conferidas por medições automáticas; não houve revisão visual de cada captura.

## Sugestões (opcionais)
- Adicionar um teste automatizado de sacola e checkout ao `flows.py`.
