# STG-03 — receiver e worker sintéticos gerenciados

Concluído no projeto **lidacomzapcrm-staging**, região **southamerica-east1**, Functions v2 / Node.js 22 sobre Cloud Run. Deploy somente do codebase `staging-fixtures`, sem main/produção. HEAD inicial `2ff066280023ff9e2f8b527fee851a7619d8fcd0`; commits e CI no ledger.

## Endpoint e funcionamento

Base privada: https://stagingingress-frefvtfoya-rj.a.run.app . `/webhooks/meta` suporta GET challenge de fixture e POST com HMAC do raw body, formato fechado de fixtures e validação do provider existente. `/worker` suporta comandos TEST explícitos, uma etapa por invocação. Não há scheduler automático ou trabalho depois do ACK.

Fluxo: IAM → raw body/signature → fixture allowlist → durable admission → journal Firestore STG-02 → ACK; invocação worker → claim/lease/fencing → projeção/draft/audit atômicos. Reutiliza exatamente a fila e os ports existentes. Nenhum sender, transporte Meta/RCS, webhook público de cliente real ou vínculo ao frontend foi criado.

Contexto único `demo-staging-TEST-managed`, account fixture `100`, phoneNumber fixture `200`, números reservados +12025550100 a +12025550106. IDs exigem `synthetic-TEST-`. Textos permitidos: `TEST fixture only` e `TEST managed HTTPS fixture`. Perfis/contacts/campos desconhecidos, contexto LIVE, referências não TEST e texto arbitrário são rejeitados. Material público HMAC/challenge está explicitamente identificado como TEST; **não é segredo Meta nem autenticação de acesso**. IAM privado limita quem pode invocar.

## IAM e limites

Runtime/invocador único: `crm-staging-runtime@lidacomzapcrm-staging.iam.gserviceaccount.com`, separado da identidade Hosting. Role customizada `stagingSyntheticJournal`: somente datastore.databases.get e datastore.entities.get/create/update no projeto staging. Sem delete/list/admin/Owner/Editor para runtime. O port restringe caminhos à coleção `stg_inbound_synthetic`; IAM desses privilégios é no projeto, não uma ACL de documento. Regras client deny-all preservadas. Zero USER_MANAGED keys confirmado.

A sessão humana nova pode gerar apenas ID tokens temporários dessa identidade para probes (`serviceAccountOpenIdTokenCreator`); tokens ficam em memória. Sem JSON key, secrets Meta/RCS, tokens no Git/logs ou credenciais operacionais. WIF de Hosting mantém seu escopo; CI não ganhou permissão de Functions nem deploy main.

minInstances=0, maxInstances=1, concurrency=1, CPU=1, memória=256MiB, timeout=60s, body=65536 bytes, lote=10, lease=30s. Journal mantém limite STG-02: 200 work/1000 audit/256KiB. Não é prontidão de volume operacional. Limites/alertas não garantem custo zero nem hard cap financeiro.

Blaze habilitado somente staging na execução autorizada anterior; retomada apenas verificou o vínculo e o orçamento existente **BRL 10/mês, 50/90/100%, destinatários IAM padrão**. Nenhum novo budget/projeto/vínculo na retomada. Artifact Registry `gcf-artifacts` southamerica-east1 com limpeza de imagens após 1 dia, configurada pela ferramenta oficial. [Custos e retenção de artefatos](https://firebase.google.com/docs/functions/manage-functions).

## Build e deploy

```powershell
npm ci --prefix staging-functions --ignore-scripts
npm run build --prefix staging-functions
node node_modules/typescript/bin/tsc -p tsconfig.staging-functions.json
```

Deploy explícito autorizado: Firebase CLI 15.19.1, `--project lidacomzapcrm-staging --config firebase.functions.staging.json --only functions:staging-fixtures --non-interactive --json`. Executado por host privado com `XDG_CONFIG_HOME` novo e preload de logs sanitizados, sem consultar sessão antiga. Não executar contra alias default. CI testa/builda o pacote separado; deploy Functions não foi automatizado com identidade Hosting.

CLI discovery inicial excedeu 10s antes de provisionar função; `FUNCTIONS_DISCOVERY_TIMEOUT=90` resolveu. Primeiro deploy criou função ACTIVE, mas CLI retornou erro no pós-deploy por falta de cleanup policy; estado cloud foi verificado antes de qualquer repetição. Configuração explícita da política resolveu. Revisões seguintes/deploy final retornaram success. Invocador privado inicial vazio foi substituído por allowlist de uma service account; nenhuma revisão pública.

## Evidência

153 testes locais (147 preservados + cinco ingress + um configuração/IAM) aprovados; strict núcleo/servidor/previews/runtime; AST/isolation; baseline 21→21, zero novos; operacional/UNI-08/integrado e pacote Functions buildados. CI final consta no ledger.

HTTPS na revisão final: 403 sem identidade; challenge TEST 200/valor correto; challenge/signature inválidos 403; malformed, identidade real, perfil, texto fora da allowlist e ação LIVE 400; body/lote excedidos 413; POST TEST/replay 200 com uma admissão; worker/projeção/draft sem send; nova instância de journal conserva dados/dedupe; crash lease, retry/backoff, fencing de token antigo e final failure passaram no Firestore staging. Isso comprova restart de cliente/journal e recuperação de lease, não um kill controlado do container gerenciado.

Diferença de relógio local de cerca de 14s fez policy bloquear draft de fixture futura; fixtures corrigidas para um minuto no passado, sem relaxar policy. Resposta worker declara projeção sem envio e não promete draft quando policy impede.

Amostra pós-probe de 89 logs Cloud Run: sem corpo de fixture, telefone, Bearer ou JWT. Código não registra payload/headers/erro bruto. É evidência limitada da amostra e revisão, não garantia absoluta de todas as futuras entradas. Auditoria de domínio também sanitizada.

Auditoria npm do pacote Functions: zero high/critical, duas moderate transitivas (`gaxios`/`uuid`). [Advisory de uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq) afeta buffers externos em métodos v3/v5/v6; gaxios consultado chama v4() sem buffer externo, e o domínio usa node:crypto randomUUID. Essa análise limita a exposição observada, não certifica todas as dependências; upgrade transitivo compatível continua backlog, sem override major automático.

Hosting preview existente respondeu 200, CSP connect-src none preservado. Aplicação operacional/App/Firebase/components/types e offline-preview não foram alterados. Zero dados reais, mensagens enviadas, merge main, migração operacional ou deploy produção.

## Próximos gates

GATE_META_CREDENTIALS_REQUIRED para configuração Meta de teste real, subscription/challenge/signature real e futura política de exposição do callback. RCS permanece DISABLED até GATE_RCS_AGENT_REQUIRED. Primeiro outbound sempre exige GATE_FIRST_REAL_SEND_READY, além de destinatário TEST autorizado. ORDER-01/OPS-01 readiness auditado separadamente; escrita operacional e migração ainda não implementadas nem autorizadas por esta fase.
