# Execution ledger — Unificação

## ORDER-02 — persistência operacional controlada em staging (2026-10-03)

- HEAD INICIAL: 6f4ac41c863fb8fabb3719a30adc30c641d7eff4. Branch canônica/origin/main60fb91f/PR #4 draft confirmados. CI inicial PR37143328495/push37143324591/dinâmico37143325201 success; 164 testes e baseline21→21 reexecutados.
- AUTORIZAÇÃO: persistência/probe exclusivamente staging TEST. Gate anterior superado só para este escopo. META trusted-device pausado, nenhuma tentativa. Sem produção/main/envio/cadastro real/dual-write.
- IMPLEMENTAÇÃO: OperationalOrderPersistencePort/core sem SDK, snapshot completo, CREATE/GET/CONFIRM/UPDATE/CANCEL/pagamento/NOTA/produção/delivery/rollback. StagingOperationalOrderStore transacional sobre port HTTP existente; namespace stg_operational_orders, aggregate por tenant TEST, records/cache/events/audit/projections/cash atômicos. Flag DISABLED default; TEST_ONLY exige staging+projeto exato+tenant demo-TEST antes de credencial/write. Ingress mantém namespace default e regras anteriores.
- IDEMPOTÊNCIA / CONCORRÊNCIA: commandId+key+revision/context hash; replay sem segunda mutação lógica; 409 retried com revisão verificada; actor/context/financial evidence protegidos. Campos/desvios de schema/test/estado/totais/audit recusados; nunca overwrite/reset silencioso.
- TESTES: **182/182** (164 preservados + 18), stricts núcleo/messaging/UNI-08/integrado/Functions, AST e baseline **21/21/0**, mesmas assinaturas. Builds operacional/UNI-08/integrado/Functions verdes. Fechamento em 2026-10-04 reexecutou os 182 testes (zero skipped), cinco stricts, AST/isolation, baseline e quatro builds. O executor PowerShell foi interrompido por warning nativo do build; os builds foram executados diretamente e passaram, sem correção funcional.
- CLOUD PROBE: somente lidacomzapcrm-staging/(default)/stg_operational_orders; create/read/restart/retry/concurrent confirm+update/SALE+CREDIT_RECEIPT/round-trip/KDS+Delivery/cash closing/rollback+recreate PASS. Probe final em 2026-10-03T19:48:41.499Z, posterior à última alteração funcional; nenhuma nova chamada Firestore no fechamento. Zero pedidos ativos restantes; audit/cache TEST preservados e replays antigos fenced. Nenhum novo IAM/rules/billing/resource/endpoint/provider. Auth somente nova fresh-config/preload; saída sanitizada, prova versionada sem credentials em evidence/ORDER-02-staging-probe.json.
- ROUND-TRIP: envelope TEST com snapshot autoritativo, JSON/date restoration; cliente/vínculos/origem/itens/opções/valores/estado/NOTA/refs preservados. Legacy gaps de NOTA/débito/desconto/contexto explícitos; old adapter intacto. FECHADO TEST não gera recebimento. Caixa TEST separa SALE/RECEIPT/CREDIT_RECEIPT e gaveta; fundo/movimentos/contagem são inputs do consumer, não sessões operacionais portadas.
- ROLLBACK: revisão por fixture, remove ativos/projeções/fatos financeiros selecionados; mantém outros pedidos e audit/tombstones, permite nova criação por comando novo. disable() recusa chamadas antes do port. Sem collection delete ou dado real.
- COMMITS / HEAD FINAL / CI: commits pequenos da fase e evidências finais registrados no fechamento abaixo; push exclusivamente codex/unificacao-gestao-inteligente, PR #4 draft.
- PRESERVAÇÃO: App/components/lib/types/compatAdapters/UNI-08/listeners/operacional e quatro arquivos pessoais intactos. Preview offline recebe somente badge da prova TEST, sem backend/conexão. MemoryRegistrationPort/renderer preservados, sem cadastro/driver real. Runtime Functions antigo continua privado e sem port de pedidos habilitado.
- GATE / NEXT: **GATE_OPERATIONAL_PRODUCTION_WRITE_REQUIRED** antes de primeira escrita real em orders/deliveryOrders/caixaSessions. Requer autorização humana específica; revisar consumers, persistência/cash sessions/reconciliação/rules/IAM/volume/rollback operacional antes de rollout. META só retoma após usuário informar liberação.

## ORDER-01 / OPS-01 — continuidade local após gate Meta (2026-10-03)

- HEAD INICIAL: 29dd5e5f990b6f6ef6142312e9b248a63731fbae. Pre-flight confirmou branch/origin/PR #4 draft/main 60fb91f; CI inicial push 37091397844 e PR 37091400883 success. 153 testes reexecutados; baseline 21→21.
- META-01: GATE_META_TRUSTED_DEVICE_REQUIRED, restrição informada pelo usuário. Pausa mantida; nenhuma tentativa Meta/asset/credencial/subscription nova. Retomar somente após informação humana de liberação.
- AUDITORIA: equivalências Order/DeliveryOrder/Order canônico, origem/vínculos, pagamento/produção/entrega/cancelamento, coleções e consumidores documentados em ORDER-01-incremental-offline.md. FECHADO dispara venda no caixa legado; nova visão conservadora não fabrica comprovante de recebimento. Adapter anterior intacto.
- EXECUÇÃO: fundação Order/OrderItem com snapshots/eixos, revisão/port de confirmação memória idempotente/revisionado SIMULATION. NOTA aprovação/recusa/troca; fatos venda/recebimento separados; fechamento de cinco métodos; renderer único/versionado/escape; port de cadastros demo. OPS contextual no preview isolado, produto fixture, sem port operacional.
- TESTES: 164/164 no conjunto consolidado após adaptar segurança dos inputs: somente cinco números de fechamento demo nas áreas Pedidos/Conversas; proibidos texto livre/backend/persistência. Testes novos de estados/evidência/contexto/replay/revisão/dinheiro/NOTA/recebimento/fechamento/impressão/cadastro/isolation. Stricts núcleo/messaging/offline/integrado/Functions e AST verdes; baseline 21/21/0 com SHA de diagnósticos preservado.
- BUILDS: operacional, UNI-08, integrado e Functions verdes; chunk operacional acima de 500 kB já existente. Browser local validou abertura/revisão, NOTA bloqueada, recusa→PIX, impressão escapada, confirmação memória e cinco valores manuais/diferença zero. Não consultou nem escreveu Firestore/cloud/Meta.
- PRESERVAÇÃO: App/components/lib/types/compatAdapters/UNI-08 intactos contra HEAD inicial; quatro arquivos pessoais excluídos. Nenhuma migração, envio, produção, main ou nova infraestrutura/billing. CI existente pode atualizar exclusivamente Hosting preview sintético da PR #4; nenhum deploy de backend nesta fase.
- COMMITS / HEAD FINAL / CI: commits pequenos identificados por `Add incremental offline order operations and financial evidence` e `Demonstrate contextual orders and record Meta trusted-device pause`; SHAs/CI confirmados no fechamento abaixo.
- ESTADO: ORDER-01 e OPS-01 OFFLINE/VISUAL, integração operacional parcial/pending. Cadastros completos, crédito real, catálogo operacional, persistência, KDS/Delivery/Caixa e impressão física pendentes.
- GATE / NEXT: GATE_OPERATIONAL_ORDER_PERSISTENCE_REQUIRED antes de conectar novos comandos às coleções/dados reais; preparar integração transacional/round-trip e rollback em fase autorizada. META trusted-device, first-send/produção/main permanecem independentes.

### Fechamento funcional ORDER-01 / OPS-01

- COMMITS: b792875b81666e80c7e52b3ee02f5bb776bb640e (fundação offline) e d18ac293fc6e269f5a06092778a3e85f9477e7e0 (preview/gate/documentos), ambos publicados somente na branch autorizada.
- CI comprovada no HEAD funcional d18ac29: push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37143173711 e PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37143176776 success; check dinâmico 37143174119 success. PR #4 atualizada, draft=true/merged=false/base60fb91f.
- Ajuste final: mapa visual corrigido para STG-03 IAM privado somente TEST já comprovado; remove gate billing obsoleto e mostra pausa Meta trusted-device. Guardas de status permitem STAGING READY somente nas capacidades staging/fixture-store/gateway e exigem limite TEST/privado no gateway. 11 testes integrados/isolation e build integrado revalidados; nenhuma fonte operacional ou servidor modificada.
- HEAD FINAL: commit de fechamento `Align preview with verified synthetic staging and close offline operations checkpoint` (SHA resolvível no Git; CI deste fechamento verificada antes do relatório final). Validação consolidada 164, baseline 21→21, builds/stricts verdes permanecem; ajustes finais restritos a mapa/teste visual e ledger.
- URL local http://127.0.0.1:4180/; Hosting pr-4 permanece somente demo (CI autorizada existente). Nenhum novo recurso cloud ou backend conectado. Próximo gate real: integração das novas escritas com persistência operacional, ainda sem autorização para dados reais. META-01 só retoma após liberação informada pelo usuário.

## STG-03 — receiver/worker TEST gerenciados e readiness operacional

- HEAD INICIAL: **2ff066280023ff9e2f8b527fee851a7619d8fcd0**. Branch canônica, PR #4 draft; main **60fb91fdf048a8e0d4f9adc29a532be8bf4356dd**. Trabalho STG-03 não commitado do checkpoint preservado; arquivos pessoais excluídos.
- CLOUD: billing staging já habilitado na execução autorizada anterior; retomada verificou vínculo e budget existente BRL 10/mês, 50/90/100%, não hard cap. Nenhum novo projeto/budget/vínculo. Functions v2 Node22/Cloud Run southamerica-east1 ACTIVE, endpoint privado https://stagingingress-frefvtfoya-rj.a.run.app . Runtime crm-staging-runtime separado, custom role com quatro permissões get/create/update/transação; zero USER_MANAGED keys. Escala 0–1/concurrency1/60s/256MiB/body65536/batch10. Artefatos com retenção 1 dia.
- FIRESTORE / WORKER: journal/queue/ports STG-02 mantidos. Receiver ACK após persistência; worker explícito por invocação; lease/fencing/retry/backoff/final/crash recovery e projeção/draft/audit atômicos. Apenas TEST/SIMULATION/demo/allowlist fechada, sem scheduler/backend no preview ou segunda fila.
- TESTES: **153/153** (147 preservados + 5 ingress + 1 configuração). Stricts núcleo/servidor/UNI-08/integrado/runtime, AST/source+bundle isolation e baseline **21/21/0**, SHA de diagnósticos inalterado. Builds operacional/UNI-08/integrado/Functions aprovados. Warning de chunk operacional preexistente.
- PROBE HTTPS FINAL: IAM anônimo 403, challenge/signature, malformed, dados reais/perfis/texto arbitrário/LIVE rejeitados, body/batch413, admission/replay/dedupe, nova instância journal, draft canSend=false, lease recovery/retry/fencing/final PASS. Logs amostrados 89 entradas sem corpo/telefone/Bearer/JWT; audit sanitizado. Restart é de journal/cliente, não kill do container.
- DEPLOY: primeiro timeout discovery antes de recurso; FUNCTIONS_DISCOVERY_TIMEOUT=90 resolveu. Primeiro deploy ACTIVE com erro CLI de cleanup pós-deploy; policy oficial configurada, deploy final success. Private IAM inicial vazio corrigido com invocador único runtime; jamais público. Policy manteve bloqueio de draft futuro quando relógio local adiantado; fixture corrigida sem mudar regra.
- COMMITS: funcional **90bf10daa057918654a8100b18e47d3e6ff9133e** (`Deploy private synthetic staging receiver and journal worker`); evidências/readiness **b74cf041e265089aa16e0aa4a408520f79f447ad** (`Record verified STG-03 and operational readiness gaps`). HEAD FINAL do bloco identificado por `Close STG-03 with verified CI evidence`; resolver SHA pelo Git. Nenhuma mudança runtime após validação final/deploy.
- CI COMPROVADA em b74cf04: push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37091217537 success; PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37091220554 success, jobs offline e staging-preview executados/success; dynamic 37091217901 success. PR #4 draft, merged=false; main remoto 60fb91f confirmado. CI do commit exclusivamente documental de fechamento é verificável pelos checks da PR, sem inferir estado futuro.
- DEPENDÊNCIAS: auditoria do pacote Functions: zero high/critical, duas moderate transitivas gaxios/uuid; advisory de buffers v3/v5/v6, trecho gaxios consultado chama v4(). Não houve override major ou saneamento indiscriminado do pacote operacional; limitação/fonte em STG-03-webhook-worker-staging.md.
- CI: gates runtime strict/build/test adicionados ao job offline. WIF/Hosting permanece segregado à PR #4/branch/environment, sem nova permissão Functions, main auto-deploy ou auto-merge.
- PRESERVAÇÃO: App/Firebase/components/types/offline-preview/default/operacional/main e .vscode/extensions.json/AGENTS.md/FONTES-CHATS/backup pessoal intactos. Hosting pr-4 respondeu 200 com CSP connect-src none.
- ORDER / OPS / UX-OPS: readiness local documentado, gap financeiro FECHADO→PAID destacado; contratos/adapters existentes não promovidos a operação. NOTA/caixa/impressão/paleta continuam requisitos, sem cliente/pedido/crédito real.
- GATE / NEXT: **GATE_META_CREDENTIALS_REQUIRED** para configuração de teste real após infraestrutura TEST verde. RCS DISABLED; gate agente separado. Primeiro outbound exige gate obrigatório, nunca automático. Zero envio/merge/produção/migração real.

## Encerramento comprovado STG-01/02 — STG-03 billing gate

- HEAD INICIAL da retomada: 1c44e7e3a75a469d28b0815aafa76798f6fca169. Commits: d1c4db2 (provisionamento/alias), 23758b7 (Hosting/WIF/preview), **6424df719d0e3f58b7ccdd0f4006d9f18a603da4** (persistência/ports/regras). HEAD FINAL de fechamento: commit `Close verified staging persistence at managed webhook billing gate` (resolver Git).
- CI funcional STG-02: push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37077640270 e PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37077644182 no 6424df7; PR/job offline e staging-preview success comprovados. Push/fechamento documental a conferir nos checks da PR; nenhum verde inferido de skipped.
- VALIDAÇÃO LOCAL: **147/147** testes (139 preservados + oito staging), quatro stricts/AST/source+bundle isolation, baseline **21 / 21 / 0**, mesmas assinaturas; três builds aprovados. Warning chunk operacional preexistente. Probe cloud TEST de contenção/recovery/projeção atômica aprovado. Regras deny-all staging publicadas. Manifesto Hosting registra Firestore existente como metadata, sem habilitar backend no preview.
- ESTADO: STG-01 CONCLUÍDA; STG-02 CONCLUÍDA para persistência sintética limitada; STG-03 NÃO PROVISIONADA / GATE_STAGING_BILLING_REQUIRED. Billing permanece false. Firebase/Auth/Firestore operacionais, dados reais, main e arquivos pessoais intactos; zero envio/deploy produção/merge. Meta/RCS DISABLED; UX-OPS/Order operacional ainda backlog.
- URL: https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app , preview temporário renovado somente por PR #4. Modo OFFLINE PREVIEW preservado; catálogo visual distingue Hosting/store TEST comprovados de integrações ainda pendentes.
- NEXT / AÇÃO MÍNIMA: autorização explícita de billing/Blaze somente staging para Functions HTTPS/worker. Retomar STG-03 e parar em credencial externa/Meta/RCS/primeiro envio quando necessário. Não iniciar ORDER-01/OPS-01 neste gate.

## STG-02 — store distribuído de fixtures / STG-03 gate

- HEAD INICIAL: 23758b73a72e82956881e598b575e2a97521377f. COMMIT/HEAD FINAL: `Persist synthetic staging ingress with atomic Firestore ports` (resolver Git; CI do commit será confirmada no fechamento).
- FIRESTORE: lidacomzapcrm-staging/(default), southamerica-east1, Standard/FIRESTORE_NATIVE, freeTier=true, billing=false, PITR disabled. Regras deny-all publicadas explicitamente neste projeto; nenhum backend operacional, UI Firebase ou coleção real acessado.
- IMPLEMENTAÇÃO: porta AtomicJsonPort + Firestore transacional + fronteira HTTP única. Reaproveita journal/regras existentes, mantendo filesystem/journal/tests locais. Queue/admission/claim/lease/fencing/retry/final/crash recovery e projection/draft/audit em commit atômico. SIMULATION/TEST only; capacidade 200 work/1000 audit/256 KiB; sem scheduler/worker cloud.
- PROBE CLOUD: concorrência/admission/replay/restart/atomicProjectionDraft/crashRecoveryFencing/retryFinalFailure/auditSanitised PASS, um contexto fixture separado, canSend=false. Saída sanitizada; credential nova somente em cache privado, nenhuma chave duradoura.
- TESTES: oito casos staging adicionados aos 139; consolidação/strict/baseline/build e CI final a registrar no fechamento. Guards mantêm APP_ENV/project fail-closed; novo store servidor não habilita backend no bundle de Hosting.
- STG-01 CI comprovada: push 37076090694 / PR 37076094664 success no d1c4db2, incluindo deployment WIF. Novos commits mantêm o job limitado à PR #4/branch/environment.
- GATE / NEXT: GATE_STAGING_BILLING_REQUIRED na STG-03; Functions HTTPS requer Blaze, Cloud Run não disponível em Spark. Nenhum billing/Functions/Run/Build/Artifact Registry ou endpoint público criado. Autorizar billing somente staging antes de continuar. Meta/RCS DISABLED; primeiro envio continua gate independente; Order/UX-OPS sem escrita real.
- PRESERVAÇÃO: default/main/operacional/UNI-08, pessoal e fonte histórica intactos. Sem merge, produção, envio ou migration operacional. Hosting continua preview temporário pr-4; URL https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app .

## STG-01 — provisionamento isolado comprovado (2026-10-02)

- HEAD INICIAL: 1c44e7e3a75a469d28b0815aafa76798f6fca169. COMMIT de provisionamento d1c4db2; fechamento visual/documental `Record verified isolated Hosting and federated staging deployment` (resolver HEAD FINAL pelo Git).
- AUTH: login oficial novo em perfil privado, sem reutilizar sessão anterior ou imprimir tokens; acompanhamento pausado após sucesso.
- CLOUD: lidacomzapcrm-staging, número 854899277909, billing=false. Default operacional preservado; alias staging adicionado. Hosting exclusivamente dist-integrated/pr-4; URL https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app ; expiração inicial 2026-10-09T23:01:43Z; canal live sem release.
- CI: push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37076090694 e PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37076094664 success em d1c4db2. Job staging-preview success via WIF; IAM trust PR #4/repository IDs/workflow/environment. Sem chave duradoura, auto-merge ou deploy main.
- TESTES: 139/139; quatro stricts, AST, baseline 21 → 21 / zero novos; três builds verdes. HTTP 200/CSP connect-src none e navegação Pedidos no navegador, sem erros de console.
- PR: #4 draft; main 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd intacta. Alterações pessoais e App/Firebase/UI/UNI-08 preservados. Providers DISABLED; zero mensagens; preview permanece OFFLINE, sem backend.
- GATE: reautenticação resolvida. NEXT: STG-02, persistência distribuída somente fixtures TEST atrás de ports; STG-03 depois dos gates desta persistência.

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

## STG-01 — correção de contexto do workflow

- HEAD inicial: 0740d0dd04a2bae8e49d557bf484213c25bb4667 (documentação/UX-OPS); funcional c081e817ead96122e71bafec7254ee3aa7f028bd.
- CI push 37066900336 falhou antes de criar jobs. Revisão encontrou uso de runner.temp em jobs.env, contexto não disponível nesse ponto conforme documentação oficial GitHub.
- Correção: definir FIREBASE_CLI_ROOT por RUNNER_TEMP em etapa do job. Job de preview segue condicionado/bloqueado; sem credential/cloud/send.
- HEAD final / COMMIT: `Fix staging workflow runner context availability`. Testes locais 138 e baseline/builds permanecem válidos; nenhuma fonte runtime modificada. CI corrigida a confirmar no fechamento.
- GATE / NEXT: GATE_FIREBASE_REAUTH_REQUIRED / login autorizado e depois provisionamento segregado; STG-01 ainda parcial.
- CI corrigida confirmada: push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37067056547 e PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37067060902 success em 62ecbf2. Gates offline executados; job staging-preview condicionado/skipped, sem deploy.

## STG-01 — bloquear entrada operacional sob APP_ENV staging

- HEAD inicial: 62ecbf2ac0289d475f0ed7196b376ffaa82234fa. Commit: `Reject operational Vite entry in staging environment`.
- Proteção adicional: vite.config.ts recusa APP_ENV=staging antes de bundlar/servir App.tsx; nenhuma modificação no App/Firebase/componentes/tipos/UNI-08. Configs isoladas mantidas.
- TESTES: 139/139 aprovados em execução consolidada (129 preservados + 10 staging). Baseline 21 → 21, stricts, AST e os três builds revalidados; configuração normal preservada. CI no SHA desta proteção a confirmar no fechamento.
- GATE / NEXT: GATE_FIREBASE_REAUTH_REQUIRED / provisionamento isolado após login; nenhuma consulta cloud ou envio.

## STG-01 — fechamento local comprovado / cloud bloqueado

- HEAD funcional final: 075d0c09bcc910234a53b79fbfc6cb825bb5cd9e. Commits deste bloco: c081e81 (guardas/CI), 0740d0d (docs/UX-OPS), 62ecbf2 (correção workflow), 075d0c0 (proteção Vite).
- CI funcional: push https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37067438240 e PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37067443177 — success no SHA funcional. Job offline success; staging-preview skipped por não estar ativado/provisionado. Isso não comprova deploy.
- TESTES / STRICT / AST / BUILD / BASELINE: 139/139; stricts e AST aprovados; operacional/UNI-08/integrado verdes; 21 / 21 / 0, mesmas assinaturas. Sem mudança de código após essas validações.
- HEAD final documental / COMMIT: `Record staging preparation evidence and Firebase reauthentication gate` (resolver SHA pelo Git). CI desse fechamento a confirmar após push; sem cloud.
- PR #4 atualizada e draft; main remoto 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd; pessoal/fontes/operacional/UNI-08 preservados. Busca de padrões sensíveis no diff novo sem ocorrências; credenciais temporárias/cache ignorados.
- ESTADO: STG-01 PARTIAL LOCAL_PREPARED; ID somente reservado em config, alias default intacto. Sem URL/projeto staging confirmado, Firestore staging, endpoint público, worker distribuído, billing ou envio. Meta/RCS DISABLED; Order operacional incompleto; UX-OPS registrado, crédito/impressão/UX reais não implementados.
- GATE: GATE_FIREBASE_REAUTH_REQUIRED. AÇÃO MÍNIMA: Autorize o login Firebase no navegador. NEXT: agente reautentica com logs sanitizados e provisiona staging gratuito isolado; STG-02 somente após publicação/isolamento comprovados. Não há pedido antecipado de credenciais Meta/RCS.

### Publicação funcional ORDER-02 — fechamento 2026-10-04

- COMMIT FUNCIONAL: 346011a38ab6ff9d63d620739e5c7fcc24b5c030, publicado somente na branch autorizada.
- CI funcional push: https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37217079042 success; check dinâmico 37217079357 success. CI PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/actions/runs/37217081946 success; jobs offline e staging-preview executados success.
- Validação local final: 182/182, zero skipped; cinco stricts, isolamento, baseline 21→21/zero novos e quatro builds verdes. Evidência cloud final anterior suficiente, sem novo probe/billing/recurso.
- STATUS: STAGING READY — TEST ONLY. Flag default DISABLED; produção/main/Meta/outbound preservados. Documentação e badge estático publicados no commit de fechamento, cujo SHA é identificável no Git pelo título abaixo.


- COMMIT DOCUMENTAL/VISUAL: ed2b68d549ad2d48c303bdd4cfa2dd41ea6dfb22 publicado; PR #4 atualizada e permanece draft=true/merged=false. HEAD final é o commit de fechamento deste ledger, resolvível pelo título Record published ORDER-02 closure and successful functional CI. CI do HEAD final conferida antes do relatório.

## PREVIEW-01 — atualização visual Firebase (2026-10-04)

- HEAD INICIAL: 891ce9c05412df61a1d6e442e7aa48caf8f4da65; branch canônica/PR4 draft/main preservados.
- ESCOPO: apenas preview isolado/documentação/teste; 21 áreas, ORDER-02 STAGING READY — TEST ONLY, NOTA/caixa/renderer, infraestrutura TEST e gates produção/Meta. Nenhum port real conectado.
- PUBLICAÇÃO: CI existente autoriza exclusivamente Hosting lidacomzapcrm-staging/pr-4/dist-integrated, CSP connect-src none; sem backend/deploy operacional/produção/main/Meta.
- TESTES: 183 testes consolidados aprovados, zero skipped; strict integrado/AST/baseline21→21/zero novos e build integrado. CI revalida todos os stricts e quatro builds no HEAD publicado.
- URL esperada: https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app/ ; HEAD final/CI/expiração confirmados no relatório e PR após publicação, commit identificável por Refresh integrated preview with verified ORDER-02 state and blocked gates.
- NEXT: parar após validação visual. GATE_OPERATIONAL_PRODUCTION_WRITE_REQUIRED e GATE_META_TRUSTED_DEVICE_REQUIRED preservados.

### Validação Firebase publicada

- HEAD visual e2a9da3099333edce462b49cbb1b3ee0a9da7a2c: CI push37218109455/PR37218112411/dinâmico37218110473 success; jobs técnico e Hosting executados.
- Browser Firebase confirmou Dashboard 21 áreas, Conversas → revisão cliente Demo → NOTA bloqueada sem aprovação → aprovação/confirm memória, Pedidos ORDER-02 TEST ONLY, Caixa cinco métodos e Estado do Produto com ambos os gates.
- QA identificou tabela estática NOTA com esperado zero enquanto cálculo financeiro já esperava4000; correção apenas visual para R$40 e diferença coerente, sem alterar regra financeira. Strict/build/testes integrados reexecutados; CI final republica exclusivamente o mesmo pr-4.
- URL: https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app/ . Release verificado 2026-10-04T16:50:17.773Z; expiração então 2026-10-11T16:50:15.887688145Z, renovada pela republicação final. CSP connect-src none confirmada na configuração Hosting. HEAD final resolvível pelo commit Align NOTA cash table with verified closing and record Firebase QA; CI/HTTP/expiração definitivos verificados antes do relatório e na PR.

## PROD-ORDER-00 — production readiness (2026-10-04)

- HEAD INICIAL: 6bfb38ec921627a08713dc273329fc4c643a6fd1; origin/branch/main60fb91f/PR4 draft confirmados. Mudanças pessoais4 preservadas.
- ESCOPO: auditoria versionada de creators/updates/listeners/schema/caixa/KDS/delivery/menu/QR/chat/history; nenhuma leitura ou escrita de documentos cloud.
- DECISÃO: A legado-first, exatamente1 orders TEST/Pendente/total0/Pix sem recebimento; projeção canônica memória, sem segundo pedido. Auditoria futura atômica; sem executor/IAM/rules/runtime habilitado.
- RISCOS: caixa legacy dedupe local e currentBalance independente de método; FECHADO gera venda sem evidência; handlers têm múltiplos writes não atômicos e caches/fallbacks. Primeiro canário exclui financeiro/NOTA/KDS/delivery/client/messages; exige quiescência e verificação de triggers/regras/identidade.
- BACKUP/ROLLBACK: manifesto create-only de ausência/digest/versão, rollback somente alvo exato com precondição e audit/tombstone; conflito/efeito financeiro HALT. Backup remoto inexistente/não comprovado; custo novo exige GATE_OPERATIONAL_BACKUP_REQUIRED.
- TESTES: 188/188 (183 preservados +5 dry-run/guards/replay/no-I-O/rollback), zero skipped; baseline21→21/zero novos, stricts/isolamento e quatro builds revalidados antes de publicação. Evidências no documento e evidence/PROD-ORDER-00-dry-run.json.
- COMMITS/CI: pacote publicado na branch canônica; commit funcional identificável por Plan production order readiness with non-writing canary and rollback dry run. CI final/HEAD publicados confirmados na PR e relatório antes de conclusão. CI existente pode republicar apenas Hosting preview sintético; nenhum deploy backend/operacional autorizado.
- NEXT: GATE_OPERATIONAL_CANARY_WRITE_REQUIRED. Readiness completo como plano, produção não pronta para executar sem pré-requisitos; flagDISABLED/canWritefalse/META pausada. Parar sem canário.
