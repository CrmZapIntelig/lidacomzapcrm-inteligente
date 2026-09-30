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

## UNI-07

- UNI-06 HEAD final / COMMIT: db0b8ec1ac071bb83fa858e5126ee7148601633e.
- CI UNI-06: push 36742541837 e PR 36742548511, success.
- HEAD inicial: db0b8ec1ac071bb83fa858e5126ee7148601633e.
- HEAD final / COMMIT: `Integrate offline draft events timeline and scoped opportunities`.
- TESTES / BUILD: 86/86; strict e build aprovados; aviso bundle preexistente.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0; assinaturas explícitas idênticas.
- ARQUIVOS: offlineEvents.ts, dispatchEventBridge.ts/test.ts, UNI-07, ledger e relatório principal.
- PR: #4 draft; PREVIEW STATUS: BLOCKED; URL: nenhuma; FIREBASE PROJECT / CHANNEL: nenhum.
- RISCOS: reducer só aplica fatos de drafts offline; primeiro envio real permanece gate;
  sem generic bus, order handlers, storage ou integração à UI existente.
- DECISÃO: UNI-07 verde local; validar CI final. UNI-08 não iniciada por isolamento.

## Fechamento comprovado e gate UNI-08

| Fase / marco | HEAD final / commit publicado | Testes locais acumulados |
| --- | --- | --- |
| SOURCE-AUDIT inicial | 5403790a60154bcd3f19718108d2bc9373946294 | histórico 38 |
| REC-01 | 7abdd0fcc5a3c5a3259aeb45bc38218ef5e57be2 | 59 |
| CI-PREVIEW pré-flight | 91b6356569ce8ff79b88a2756ec44dc1b343f04f | 59 |
| UNI-05 | 6389d42479da7ecce21c537d3db82f202c37fd26 | 74 |
| CI correção 1 | 067dc67b1cbedda23a7cd7992dc91e555c026afe | 74 remotos |
| CI correção paths | 7473b374de3956a3cac1baf15af95adb3e2b827b | 74 remotos, CI verde |
| UNI-06 | db0b8ec1ac071bb83fa858e5126ee7148601633e | 79 |
| UNI-07 | 73a1f886d8b2bb482d89f13954d0060020a1f248 | 86 |

Todos os commits acima tiveram push normal na branch de unificação. Nenhuma fase
alterou main (60fb91f), fontes históricas ou arquivos pessoais. Não houve deploy.

- FASE: fechamento documental / gate UNI-08; DATA: 2026-09-30.
- HEAD inicial: 73a1f886d8b2bb482d89f13954d0060020a1f248.
- HEAD final / COMMIT: `Record continuous execution results and visual isolation gate`.
- TESTES / BUILD: 86/86 locais e remotos no HEAD funcional final; strict/baseline/build success.
- CI UNI-07: https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/36743034767
  (push); https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/36743037336 (PR).
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0, mesmos diagnósticos nas assinaturas registradas.
- ARQUIVOS: GATE-PREVIEW-BACKEND-ISOLATION.md, CI-PREVIEW, ledger, relatório principal.
- PREVIEW STATUS / URL: BLOCKED / nenhuma. FIREBASE PROJECT / CHANNEL: nenhum de preview.
- PR: #4 draft, sem merge/auto-merge. RISCOS: conexão operacional na SPA atual;
  incidente login:list documentado sem material sensível no Git.
- DECISÃO DE GATE: parar antes de UNI-08; opções/recomendação/estado Git no relatório GATE.
- Fontes: fingerprints SOURCE-AUDIT reconferidos idênticos (G 293, S 317, W 181, R 49, B 3).

## UNI-08 — entrada visual local isolada (2026-09-30)

- AUTORIZAÇÃO: opção 2 do GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED, dada diretamente pelo usuário.
- HEAD inicial: cfe7c26d6d2f59bddefa389d2a57b2d952f28736.
- HEAD final / COMMIT: `Add isolated local active sales preview` (SHA no log Git; não se autorreferencia o commit).
- TESTES / BUILD: 91/91 locais; strict núcleo e preview; builds operacional/isolado aprovados. Aviso de bundle operacional preexistente.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0; mesmas assinaturas.
- ARQUIVOS: offline-preview (entrada, cenário, CSS, testes, pacote de tipos e lock), vite.offline.config.ts, tsconfig.preview-offline.json, tsconfig.json, package.json, .gitignore, workflow, servidor/testes de isolamento e relatórios UNI-08/gates/ledger/principal/CI.
- PREVIEW STATUS / URL: LOCAL_AVAILABLE / http://127.0.0.1:4178/. FIREBASE PROJECT / CHANNEL: nenhum.
- EVIDÊNCIA VISUAL: preparo, fallback, replay, conversa personalizada, próximo dia, append posição 7, timeline/RASCUNHO; zero envio. Screenshot externa ao Git registrada na UNI-08.
- RISCOS: cenário só sintético/memória; não comprova provider, persistência ou prontidão live.
- PRESERVAÇÃO: main 60fb91f; App/components/lib e fontes históricas sem alterações desta fase. .vscode/extensions.json, backup.patch, AGENTS.md e docs/FONTES-CHATS.md excluídos.
- DECISÃO: gate preview resolvido somente local; validar CI no commit publicado e parar em GATE_LIVE_INTEGRATION_REQUIRED. PR #4 draft, sem deploy/merge/integração real.

## UNI-08 — fechamento remoto comprovado

- HEAD funcional final / COMMIT: 949a77b76d9a4b0ae3645bba28c7247805a50b21 (Add isolated local active sales preview), push confirmado.
- CI: push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/36770447171 e PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/36770460665, ambos success no SHA funcional final.
- Testes remotos: 86 núcleo + 3 cenário + 2 isolamento; strict/baseline/build operacional/preview success.
- PR #4: draft=true, merged=false, auto_merge=null; base main 60fb91f preservada.
- PREVIEW LOCAL_AVAILABLE: http://127.0.0.1:4178/; nenhuma URL Hosting/channel.
- Encerramento documental: commit Record UNI-08 validation and live integration stop; nenhum código adicional após validação funcional.
- DECISÃO FINAL: UNI-08 concluída no escopo local; parada em GATE_LIVE_INTEGRATION_REQUIRED, sem integração real/deploy/merge.

## LIVE-00 — readiness estrutural (2026-09-30)

- HEAD inicial: 62cfde5c8741c23922ab626aab682fe8ba2dac0b; final identificado por commit Prepare fail-closed messaging readiness and inbound projection.
- 100 testes locais acumulados; strict núcleo/preview e builds operacional/isolado aprovados; baseline 21 / 21 / 0.
- Arquivos: messagingPolicy, messagingReadiness, inboundProjection e testes; LIVE-00/ledger. Fonte histórica HEAD 0b13ef1 auditada somente leitura, incluindo pasta LidacomZap não rastreada preservada.
- Provider boundary/policy/template/auto-reply DRAFT/projeção idempotente prontos; runtime/adapter e persistência ainda ausentes. Nenhum envio/rede provider/cloud.
- PR #4 draft; main 60fb91f intacta; preview http://127.0.0.1:4178/ continua SIMULATION isolado.
- Decisão: validar CI antes da LIVE-01; bloqueios cloud/canário não impedem próxima implementação local.
