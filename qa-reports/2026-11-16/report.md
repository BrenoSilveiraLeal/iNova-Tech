# Relatório de QA — iNova Tech

**Data:** 16/11/2026  
**Ambiente:** servidor estático local (`127.0.0.1:8000`)  
**Método:** skill `ultimate-website-qa` com Playwright e inspeção visual.

## Escopo e cobertura

- 19 rotas: página inicial, quatro páginas dedicadas de iPhone e 14 páginas de produto (incluindo identificador inválido).
- 61 combinações de rota e viewport: 7 páginas representativas em 375×812, 430×932, 768×1024, 1366×768, 1536×864, 1920×1080 e 3840×2160; demais rotas em 1366×768.
- Verificadas respostas HTTP, erros de console e de execução, imagens quebradas, carregamento, largura horizontal e apresentação em capturas.
- Fluxos exercitados: busca e sugestões, categoria, ordenação crescente, filtros em tela móvel, sacola, cálculo de frete, cupom, validação do checkout, confirmação simulada e recarga com retorno ao topo.

## Resultado

- As 19 rotas responderam e renderizaram; a página de produto com ID inválido mostrou o estado de produto inexistente.
- A matriz visual não encontrou overflow horizontal nas combinações verificadas; as imagens locais carregaram após percorrer a página para ativar o lazy load.
- Busca por “AirPods Pro” retornou AirPods Pro 3; filtro Mac apresentou três itens; ordenação crescente colocou MacBook Air 13" em primeiro.
- Frete para 01310-100, cupom BEMVINDO10 e validações do checkout funcionaram. O pagamento foi apenas simulado; nenhuma transação real foi feita.
- A recarga a partir do final da página voltou para `scrollY = 0` (antes: 3670 px).

## Defeito encontrado e corrigido

No celular, o painel de filtros ficava preso no contexto de empilhamento da vitrine, atrás do menu fixo. Isso impedia tocar no botão de fechar. Ao abrir, o painel agora é temporariamente movido para o `body` e restaurado ao fechar. O fluxo móvel de abrir e fechar foi repetido com sucesso.

## Observação de console

A página de iPhone 17 Pro Max solicita `/iphone-17-pro-max.glb`, que responde 404. O modelo é opcional: a página apresenta uma versão 3D procedural de reserva e continua funcionando. É um recurso ausente esperado, não uma falha de carregamento da página.

## Limites

Esta rodada verificou o front-end local. Não foi localizada uma consulta/arquivo SQL de QA Suprema no repositório, e os fluxos de checkout usam dados fictícios e confirmação simulada; banco de dados, backend hospedado e pagamento real não foram exercitados.

## Evidências

Capturas da matriz e dos fluxos estão em `screenshots/` (diretório ignorado pelo Git). Os scripts usados nesta rodada são `capture.js`, `diagnose.js` e `flows.js`.
