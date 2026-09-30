# UNI-08 — entrada visual local isolada

DATA: 2026-09-30. Opção 2 de GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED autorizada diretamente pelo usuário.

## Resultado e isolamento

Entrada independente em offline-preview/index.html e main.tsx. Usa React e os núcleos puros de domínio/aplicação das UNI-05/06/07. Não importa App.tsx, componentes operacionais, Firebase, Auth, Firestore ou providers reais. Contatos, identidades, capacidades e conversas são fixtures declaradas. Estado só em memória; recarregar/reiniciar descarta a demonstração.

Build: npm run build:offline. Inicialização: npm run preview:offline.
URL local: http://127.0.0.1:4178/. Serve somente dist-offline em loopback, sem API e sem fallback para a SPA operacional. Rotas operacionais retornam 404; POST retorna 405; Host externo retorna 403. CSP bloqueia conexões com connect-src 'none'. Manifesto isolation-report.json registra os módulos incluídos; build falha para módulos fora da lista permitida.

Não executar npm run dev para este preview. Nenhum Hosting/channel Firebase de UNI-08. As declarações React ficam no pacote privado offline-preview, instalado com npm ci --prefix offline-preview; a análise global operacional exclui essa entrada independente. Nenhuma assinatura de erro legado foi alterada.

## Fluxo demonstrado

Marketing seleciona público e justificativa; Dispatch define preparo, limite comercial diário e estratégia. O handoff cria snapshot explícito, sem autorizar envio. A fila preserva posição, elimina duplicação e permite append/cancelamento. Preparo produz somente drafts personalizados; RCS desconhecido usa a alternativa WhatsApp sintética. Bloqueio, opt-out e telefone inválido não avançam nem consomem orçamento. Avançar um dia move somente o relógio de simulação e permite retomar os aptos restantes.

Conversa de exemplo mostra texto personalizado com envio desabilitado. Timeline registra somente fatos de draft; oportunidades permanecem RASCUNHO. Nenhum Lead, pedido, venda, receipt ou resposta real é inventado. canSend=false e janela NOT_EVALUATED permanecem.

## Evidências locais

- 89 testes de domínio/aplicação/cenário + 2 testes de bundle/servidor: 91/91.
- Typechecks estritos do núcleo e preview aprovados; builds operacional e isolado aprovados. Aviso de tamanho do bundle operacional preexistente.
- Baseline global: 21 antes, 21 depois, zero novos; mesmas assinaturas, SHA256 3e5f06e5c2366fb6878ca67c85f70ccdd87d3475579bf98ffa7ce9bf1409b362.
- Navegador: público 6, primeiro preparo 2 drafts (Ana RCS, Bruno WhatsApp), replay sem novos drafts, conversa personalizada e envio bloqueado; dia seguinte prepara Fábio; Gabi adicionada na posição 7 e preparada sem deslocar anteriores. Timeline 4 fatos/4 oportunidades RASCUNHO; envios 0. Console sem erros observados.
- Screenshot externo ao Git: C:/Users/dfant/.codex/visualizations/2026/09/30/01a0f21e-6cda-7eb1-965f-1a3fd5ad8b7b/UNI-08-preview.png.
- Workflow repete cenário, typecheck, build com allowlist e servidor isolado. Resultado remoto deve ser conferido no SHA publicado.

## Limites e próximo gate

Sem persistência, concorrência distribuída, provider, capability real, envio, janela real ou integração às telas operacionais. A demonstração não comprova prontidão de produção. Gate de preview resolvido exclusivamente para esta entrada local. Parada em GATE_LIVE_INTEGRATION_REQUIRED; nenhuma integração real, deploy live ou merge main autorizado.
