# Execution ledger — Unificação

Projeto principal LidacomZapCRM. Branch codex/unificacao-gestao-inteligente.
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

## LIVE-01 — provider preparado, transporte fechado

- HEAD inicial: ed493ba3e9807a9a38077e89337646b138c047a6; CI LIVE-00 push 36778176581 / PR 36778181444 success.
- Commit: Prepare disabled server-side Meta messaging adapter.
- Testes: 106 acumulados (104 módulos/cenário + 2 isolamento); strict server/núcleo/preview, ambos builds aprovados; baseline 21 / 21 / 0.
- Arquivos: services/messaging/metaWhatsAppCloudProvider.ts/test.ts, tsconfig.messaging.json, workflow, LIVE-01/ledger.
- Secrets fakes, zero network provider/send/cloud; métodos reais permanecem GATE_OUTBOUND_CANARY_REQUIRED, sem transporte conectado. Reconfirmação técnica Meta pendente, documentada.
- Preview local SIMULATION preservado, PR draft, main 60fb91f, fontes/pessoais intactos.
- Decisão: confirmar CI da fase e avançar LIVE-02 somente local.

## LIVE-02 — ingresso e journal local sintético

- HEAD inicial: 818e7c2f35292f7266b82248a34c9fa4230fb057; CI LIVE-01 push 36778699714 / PR 36778707362 success.
- Commit: Prepare durable synthetic ingress and fenced inbound worker.
- 112 testes acumulados; strict servidor/núcleo/preview e builds aprovados; baseline 21 / 21 / 0.
- Arquivos: localInboundJournal/runtime/test, staging.example.json, .gitignore, inboundProjection/test (validação de estado tenant e cópias), LIVE-02/ledger.
- ACK após gravação, restart/replay, fencing/backoff, projeção + draft atômicos, zero send. Persistência só sintética; não equivale a Firestore staging/distribuído.
- Staging cloud ausente: .firebaserc só default. Algoritmo/header de assinatura reconfirmados em referência oficial Meta pinada 14703a3; configuração da conta/subscription ainda não comprovada.
- PR draft/main intacta; pessoal/fontes preservados; preview isolado sem nova ligação.
- Decisão: CI da fase; continuar LIVE-03/04 PREPARATION antes do gate externo/canário.

## LIVE-03 — PREPARATION apenas

- HEAD inicial: 9ff2c1215b5835a55a03ae26988f7d2278f85159; CI LIVE-02 push 36779490875 / PR 36779494290 success.
- Commit: Prepare gated one-recipient canary and provider receipt facts.
- 116 testes acumulados; strict servidor/núcleo/preview e ambos builds aprovados; baseline 21 / 21 / 0.
- Arquivos: outboundCanaryPreparation/test, providerReceiptProjection, normalized contract e parser/test Meta (context.id), LIVE-03/ledger.
- Um TEST/uma mensagem/allowlist/contexto/readiness; canSend=false sempre. Receipt somente fato explícito, reply correlacionado, sem inventar status/funil/order. Sem primeiro envio.
- Riscos pendentes: staging/secrets/public webhook/store distribuído/intenção transacional/canário. Preparação não equivale a canário concluído.
- PR draft/main/fontes/pessoal preservados; preview local SIMULATION sem providers.
- Decisão: confirmar CI; preparar RCS DISABLED localmente, parar antes de integração externa/primeiro envio.

## LIVE-04 — PREPARATION validada localmente (2026-10-01)

- HEAD inicial: 5c1c531ca49f54f8c565939db45772096f4a5aef; CI LIVE-03 push 36780096773 / PR 36780100689 success.
- Commit funcional: Prepare disabled RCS drafts and safe single-channel fallback.
- 119 testes aprovados (117 módulos/cenário + 2 isolamento); strict servidor/núcleo/preview, builds operacional/isolado e verificação AST aprovados. Baseline 21 / 21 / 0, mesmas assinaturas. Aviso preexistente de bundle operacional acima de 500 kB.
- Arquivos: rcsChannelProvider/test, channelFallbackPreparation, check-messaging-safety, workflow, LIVE-04/gates/ledger.
- RCS DISABLED, capability fornecida e vinculada, drafts MOCK, fallback único sem repetição após aceitação/incerteza. Sem SDK/transporte/consulta real/agente; formato de draft interno, não protocolo Google validado.
- Preview recompilado com 36 módulos, isolamento aprovado; nenhuma nova ligação a App/Firebase/Auth/Firestore/providers. Disponibilidade de uma sessão HTTP anterior não foi presumida.
- Main remoto reconfirmado 60fb91f; PR draft=true/merged=false/auto_merge=null. Pessoais, documentos de outra conversa e fontes históricas não editados.
- Decisão: publicar e validar CI; parar em GATE_STAGING_PROJECT_REQUIRED. Primeiro envio permanece GATE_OUTBOUND_CANARY_REQUIRED. Preparação local concluída, canário/integracão externa não executados.

## Fechamento LIVE PREPARATION — evidência remota

- HEAD funcional: b5f7e9125ad537daa96289021df1abf90fa07816, publicado normalmente na branch.
- CI funcional push: https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/36827648971 — success.
- CI funcional PR: https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/36827655989 — success no mesmo SHA.
- Fechamento exclusivamente documental: Record live preparation validation and staging gate. Nenhum código mudou após os gates funcionais.
- Próximo gate: GATE_STAGING_PROJECT_REQUIRED; exigir autorização de ambiente separado antes de criar cloud. Não confundir essa autorização com autorização do primeiro envio.
- Resultado: preparação local LIVE-00–04 concluída e validada; prontidão cloud/produção e canário real não comprovados. PR #4 draft, main 60fb91f preservada.

## Auditoria corretiva do estado canônico — 2026-10-01

- HEAD auditado: ad30da8e657723c4a9da6cf913c235078c169ba4. Um único projeto LidacomZapCRM; arquitetura/funcionalidades do Gestão incorporadas pertencem ao CRM. O outro checkout é repositório histórico LidacomZap Gestão Inteligente.
- Mapa solicitado: CANONICAL-UNIFICATION-STATE.md, com roadmap original versus fases/commits reais, classificações e gaps. Numeração e commits históricos preservados.
- Validação repetida nesta auditoria: 119 testes, strict servidor/núcleo/preview, baseline 21/21/0, verificação AST e ambos builds aprovados. Aviso de bundle preexistente.
- App/components/lib/types legados iguais ao checkpoint a69aba9 anterior à UNI-02. Diferenças de campanhas anteriores contra main não são atribuídas à unificação.
- PR #4 draft, sem merge/auto-merge; main remoto 60fb91f. Working tree preexistente preservado: .vscode/extensions.json, AGENTS.md, docs/FONTES-CHATS.md e backup.patch. Nenhum staging local novo encontrado.
- Regressão encontrada: NÃO no escopo auditado. Rollback necessário: NÃO. Alteração somente documental, sem remover ou reverter código.
- Decisão: auditoria corretiva concluída; não continuar staging neste pedido. Gates de ambiente e primeiro envio permanecem vigentes.

## PREVIEW-01 — produto integrado, somente visual (2026-10-02)

- HEAD inicial e3c80db7b38fef1b78739b17d108d7539f8ae270; branch codex/unificacao-gestao-inteligente. Commit funcional identificado por Add isolated integrated CRM product preview.
- 129 testes aprovados (117 existentes módulos/cenário, 7 integrados, 2 isolamento UNI-08, 3 integrado). Strict servidor/núcleo/UNI-08/integrado, AST e três builds aprovados; baseline 21 / 21 / 0.
- 19 módulos navegáveis; Marketing/Dispatch separados, drafts/budget/timeline conhecidos, pedidos legados versus projeções canônicas. Providers/staging/live continuam bloqueados; operação legada apenas ilustrada.
- URLs verificadas no Chrome: UNI-08 http://127.0.0.1:4178/ e integrado http://127.0.0.1:4180/. Listeners 127.0.0.1. Screenshots externos em PREVIEW-01-integrated-product.md.
- Arquivos funcionais: integrated-preview, config/build/typecheck, servidor estático/check/test integrado e CI; documentação PREVIEW-01/canônico/ledger. Sem nova dependência runtime/lockfile.
- Preservação comprovada por diff contra HEAD inicial: offline-preview e App/components/lib/types sem alterações. .vscode/extensions.json, AGENTS.md, FONTES-CHATS e backup.patch excluídos.
- Risco/limite: só representação sintética; não certifica integração operacional. CI remota será confirmada no commit publicado antes do encerramento.
- Decisão: concluir e PARAR para revisão humana. Não iniciar STG-01, não criar staging, não mergear main, não fazer deploy ou envio real.

## PREVIEW-01 — fechamento funcional comprovado

- HEAD funcional publicado: b5ca1542a9446755fd7ec97f3e72572ffe24254c (Add isolated integrated CRM product preview).
- CI push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37038618163 e PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37038625456 — ambos success nesse SHA, incluindo os novos gates integrados.
- Encerramento documental: Record integrated preview evidence and review stop. Nenhuma alteração funcional após os gates e Browser QA registrados.
- PR #4 atualizado e mantido draft; próximo passo somente revisão humana do preview. GATE_STAGING_PROJECT_REQUIRED e GATE_OUTBOUND_CANARY_REQUIRED permanecem pendentes, sem início de STG-01.

## STG-01 — preparação local / gate de reautenticação (2026-10-02)

- FASE: STG-01 PARTIAL, preparação local implementada; provisionamento Firebase não executado. Requisitos UX-OPS registrados, não implementados operacionalmente.
- AUTORIZAÇÃO: novo controlador contínuo permite staging gratuito exclusivo e preview isolado; não permite billing, produção, merge ou envio.
- HEAD INICIAL: 7ae486ff99d33e4f9c9a589748a0a0a957e3c772.
- HEAD FINAL / COMMIT: commit identificado por `Prepare isolated staging guards and approved operations roadmap`; SHA e CI confirmados em fechamento posterior.
- COMMIT FUNCIONAL: c081e81, `Prepare isolated staging environment and guarded preview deployment`, 8 arquivos / 247 linhas adicionais; configuração/testes/CI sem alterar operação.
- PRE-FLIGHT: root/branch/origin/HEAD/main remotos confirmados; PR #4 draft, base main 60fb91f; CI inicial push 37038932006 e PR 37038937351 success. 129 testes e baseline 21 → 21 reexecutados, três builds/strict/AST verdes.
- TESTES: 138/138 aprovados em execução consolidada (129 preservados + 9 staging); nenhum teste consulta cloud/credenciais. CI registrada no fechamento.
- BUILD: operacional, UNI-08 e integrado aprovados nesta retomada; aviso bundle operacional preexistente. Mudanças posteriores limitadas a scripts/config/docs/CI, sem código dos bundles.
- BASELINE: 21 / 21 / 0 no pre-flight e antes do commit; stricts núcleo/servidor/UNI-08/integrado, AST e sintaxe dos scripts aprovados.
- CI: job offline preservado e acrescido de guarda/testes; staging-preview condicionado à PR #4/branch/repo e ativação explícita, provisionamento e WIF. Deployment não ativado/validado cloud; skipped não significa STAGING READY.
- ARQUIVOS: config/staging-environment.json, firebase.staging.json, guardas/testes/deploy wrapper, scripts package, ignore de credenciais temporárias, workflow, STG-01/UX-OPS/canônico/gate/ledger. .firebaserc e firebase.json operacionais intactos.
- STAGING URL / FIREBASE / FIRESTORE / WEBHOOK / WORKER: nenhuma URL; ID lidacomzapcrm-staging apenas preferência; nenhum recurso provisionado; journal local permanece referência sintética.
- WHATSAPP / RCS: DISABLED, zero envio. Order canônico permanece contrato/projeção, operação incompleta. UX-OPS é backlog aprovado sem alteração financeira/UI.
- GATE: GATE_FIREBASE_REAUTH_REQUIRED; nenhum login:list/tokens/session antiga usados. Interação necessária apenas para login seguro no navegador.
- NEXT: reautenticar após autorização, criar/verificar projeto gratuito segregado e IAM/Hosting, adicionar alias staging preservando default, publicar preview pr-4 e validar URL/CI; só então avançar STG-02 e STG-03. Gates billing/Meta/RCS/primeiro envio permanecem.
- PRESERVAÇÃO: .vscode/extensions.json, backup.patch, AGENTS.md e FONTES-CHATS não relacionados excluídos; operação original, UNI-08, main e fontes históricas intactas.
