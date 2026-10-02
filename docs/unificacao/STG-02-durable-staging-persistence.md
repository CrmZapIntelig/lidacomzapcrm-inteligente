# STG-02 — persistência durável isolada

2026-10-02. Projeto único LidacomZapCRM. STG-01 concluída em d1c4db2 com CI Hosting federada verde; fechamento 23758b7. Default operacional preservado. Nenhum dado real consultado, copiado ou migrado.

## Recurso comprovado

Firestore **projects/lidacomzapcrm-staging/databases/(default)**, Standard/FIRESTORE_NATIVE, **southamerica-east1**, criado às 2026-10-02T23:12:51Z. API retornou **freeTier=true**, PITR disabled; billing consultado novamente: false. Criação teve 403 durante propagação da ativação da API; após confirmar listagem vazia e API habilitada, criação concluída. Nenhuma alternativa operacional foi usada como fallback.

Regras fechadas `allow read, write: if false` publicadas exclusivamente no staging com firebase.firestore.staging.json; nenhum deploy Hosting live ou regras operacionais. O adapter servidor usa IAM; o frontend/preview não importa SDK ou conecta Firestore. A conta federada de Hosting não recebeu permissões de dados. Backend do preview continua NONE e CSP connect-src none.

## Implementação

- AtomicJsonPort é porta assíncrona; core/preview não recebem SDK.
- StagingDurableInboundJournal reaproveita as regras existentes de admissão/worker/projeção/draft de LocalInboundJournal. Extração protegida de restore/transaction mantém o journal local e seus testes. Não há segunda implementação de domínio ou fila por canal.
- FirestoreAtomicJsonPort usa beginTransaction, leitura transacional e commit único. Admission, idempotency, queue, lease, fencing, retry/final failure, projeção e draft/audit são persistidos juntos. Contenção ABORTED/409 repete callback até cinco vezes; falha/ACK incerto não causa retry cego de commit. Reentrada de admission deduplica commit já ocorrido.
- FirestoreHttp é a única fronteira HTTP cloud explícita do servidor. Projeto/path/coleção fixos, fail-closed antes de resolver credential; timeout e erro sanitizado, sem log/cópia de response bodies/tokens. Resolver é fornecido pelo host; nenhum cache anterior ou fallback de credenciais é consultado pelo código.
- Dados continuam **SIMULATION / fixtures TEST**, tenants demo, IDs synthetic e endereços reservados já validados. Contexto real/LIVE é rejeitado. Cloud storage não transforma um draft em envio. canSend=false.

## Prova no Firestore separado

Probe executado com credencial nova somente no staging, tenant demo-staging-TEST-20261002. Duas instâncias concorrentes admitem uma vez; nova instância após restart deduplica. Projeção gera um Message sintético e um draft sem envio. Lease expirado é reclamado por novo worker, token antigo rejeitado; backoff impede reserva prematura e terceira tentativa termina FAILED_FINAL. Audit não contém endereço/texto. Resultado sanitizado: PASS em admission, distributedContention, restartReplay, atomicProjectionDraft, crashRecoveryFencing, retryFinalFailure e auditSanitised.

Sem cópia de coleções reais; somente **stg_inbound_synthetic**, documento com chave SHA-256 do contexto sintético, payload privado. Não expor snapshot em HTTP, logs ou UI. Regras fechadas publicadas; nenhuma conta de usuário operacional criada.

## Limites explícitos

Aggregate único por contexto sintético: limite **200 work items**, **1000 audit events**, **256 KiB**. É persistência durável de staging restrito; não é desenho certificado para volume operacional. Limite falha atomicamente, nunca aceita antes de gravar. Antes de ingestão real: particionar work/projection/audit, testar quota/concorrência/capacidade, política de retenção e reconciliação. Snapshot inválido falha, nunca reinicia estado silenciosamente.

Worker ainda explícito/local; **sem scheduler/worker cloud ou webhook público**. A config staging-worker.json registra workerEnabled=false. Este recurso servidor não muda a execução local offline da UNI-08 ou do preview integrado.

## Validação e continuidade

Oito testes novos: contenção/restart/atomicidade, crash/fencing/retry/final, dados reais rejeitados/audit/receipt não correlacionado, capacidade/rollback/corrupção, projeto/path/write bloqueados antes de credential, erros HTTP sanitizados, commit com ACK incerto e claims concorrentes/retries limitados. CI inclui serviços staging no teste/strict; AST permite rede só nesta fronteira Firestore e rejeita import de serviços pelo frontend. Resultados consolidados/SHAs/CI no ledger.

Após STG-02 verde, STG-03 precisa endpoint HTTPS e execução gerenciada. GATE_STAGING_BILLING_REQUIRED: Functions requer Blaze; não foi vinculado billing nem criado recurso pago. Meta/RCS continuam DISABLED, segredo/configuração externos e primeiro envio são gates posteriores.

Fontes oficiais: [transações REST Firestore](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/beginTransaction), [commit](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit), [planos Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans). Nenhuma validação cloud operacional inferida a partir de testes mock.
