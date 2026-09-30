# Execution ledger — Unificação

Projeto definitivo LidacomZapCRM Inteligente. Branch codex/unificacao-gestao-inteligente.
Data de execução 2026-09-30. Fontes históricas read-only. Main protegida em 60fb91f.
Commits/HEAD finais de cada fase são identificados pela mensagem única abaixo e
confirmados na entrada seguinte; evita incluir no próprio commit um hash impossível
de conhecer antes de criá-lo. Histórico Git é a resolução canônica desses marcadores.

## REC-01

- HEAD inicial: 5403790a60154bcd3f19718108d2bc9373946294.
- HEAD final / COMMIT: commit com mensagem `Recover offline active sales prerequisites from Gestao`.
- TESTES: 59/59 (21 novos + 38 anteriores), typecheck estrito aprovado.
- BUILD: aprovado; aviso de bundle grande preexistente.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0, mesmos diagnósticos.
- ARQUIVOS: src/domain/{offlinePrimitives,routing,dispatchPrerequisites}.ts,
  dispatchPrerequisites.test.ts; REC-01, SOURCE-AUDIT, relatório principal e este ledger.
- PREVIEW STATUS / URL / PR / FIREBASE PROJECT / CHANNEL: pendente pré-flight CI-PREVIEW; nenhuma publicação.
- RISCOS: capability explícita de fixture não é evidência live; snapshots exigem caller;
  orçamento offline não é quota de provider. Nenhum send/receipt real.
- DECISÃO DE GATE: verde offline; UNI-05 pode começar.

## CI-PREVIEW

- HEAD inicial / REC-01 final: 7abdd0fcc5a3c5a3259aeb45bc38218ef5e57be2.
- HEAD final / COMMIT: `Add offline CI and record preview isolation gate`.
- TESTES / BUILD: gates locais REC-01 59/59 e build verde; configuração CI sem deploy.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0; fingerprint 765fceec…fecd.
- ARQUIVOS: .github/workflows/unification-offline.yml, tsconfig.offline.json,
  tools/unification/check-baseline.mjs, CI-PREVIEW-preflight.md, ledger.
- PR: #4 draft, sem auto-merge. PREVIEW STATUS: BLOCKED; URL: nenhuma;
  FIREBASE PROJECT / CHANNEL: não selecionados.
- RISCOS / DECISÃO: GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED. Conforme seção 25
  do controlador, continuar fases internas e parar antes da UNI-08.

## UNI-05

- HEAD inicial / CI-PREVIEW final: 91b6356.
- HEAD final / COMMIT: `Implement deterministic offline active sales drafts`.
- TESTES / BUILD: 74/74; typecheck estrito e build aprovados, aviso bundle preexistente.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0. Comparação por linha/coluna
  (portável CRLF/LF), fingerprint 1d2ad0f9…74957b.
- ARQUIVOS: activeSalesOffline.ts/test.ts, UNI-05, check-baseline.mjs, ledger e relatório principal.
- PR: #4 draft. PREVIEW STATUS: BLOCKED; URL: nenhuma; FIREBASE PROJECT/CHANNEL: nenhum.
- RISCOS: caller mantém snapshots e budget; preparo não é send; capability somente declarada offline.
- DECISÃO: UNI-06 verde offline; GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED permanece.

## CI — correção de comparação portável

- HEAD inicial: 6389d42. HEAD final / COMMIT: `Make baseline diagnostic comparison platform independent`.
- TESTES: 74 remotos aprovados no run 36741628525; falha exclusiva de comparação hash.
- BUILD: local aprovado; remoto anterior não executado após falha do gate.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0, mesmas assinaturas explícitas.
- ARQUIVOS: tools/unification/check-baseline.mjs, baseline.json, CI-PREVIEW e ledger.
- PREVIEW: BLOCKED; URL nenhuma; PR #4 draft; Firebase/channel nenhum.
- DECISÃO: revalidar CI corrigida antes de publicar próxima fase. Sem deploy.

## CI — fechamento e UNI-06

- CI final: 7473b374de3956a3cac1baf15af95adb3e2b827b.
  Correção anterior 067dc67b1cbedda23a7cd7992dc91e555c026afe.
- RUNS CI: push 36742248293 e PR 36742255718, ambos success (testes/strict/baseline/build).
- UNI-06 HEAD inicial: 6389d42479da7ecce21c537d3db82f202c37fd26;
  HEAD publicação: 7473b37. HEAD final / COMMIT: `Bridge explicit marketing audiences to offline dispatch`.
- TESTES / BUILD: 79/79 locais; strict e build aprovados, aviso bundle conhecido.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0, assinaturas relativas idênticas.
- ARQUIVOS: marketingDispatchBridge.ts/test.ts, UNI-06, activeSalesOffline.ts/test.ts
  (regressão de endereço entre chamadas), relatório principal e ledger.
- PR: #4 draft. PREVIEW STATUS: BLOCKED; URL nenhuma; Firebase/channel nenhum.
- RISCOS: handoff é snapshot e não recalcula marketing/eligibility; endereço permanece
  apenas transitório em draft offline. Caller mantém operações/revisões distintas.
- DECISÃO: UNI-07 verde offline; gate de isolamento visual permanece.
