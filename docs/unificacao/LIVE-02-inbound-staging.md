# LIVE-02 — ingresso e persistência local sintética preparados

2026-09-30. LIVE-01 818e7c2f35292f7266b82248a34c9fa4230fb057: CI push 36778699714 / PR 36778707362 success, 106 testes acumulados.

## Implementação validável localmente

startSyntheticWebhookRuntime é opt-in e aceita somente adapter MOCK/contexto idêntico ao journal. Listener exclusivamente 127.0.0.1, endpoint /webhooks/meta, Host restrito, corpo JSON limitado e timeout. GET usa challenge validado; POST exige assinatura antes de decode/normalização; admissão persistente antes do ACK. Nada inicia ao importar; nenhum worker ou send automático; nenhuma rota pública/exposição de snapshot.

LocalInboundJournal é referência de persistência **somente SIMULATION**, tenants demo e IDs/endereços sintéticos reservados. Não aceita wamid real, LIVE/STAGING ou telefone real. Lock exclusivo, snapshot gravado em temporário com sync e rename; dedupe/admission/fila na mesma gravação. Worker explícito reserva lease com token único, fencing/expiração, retry com backoff até três tentativas. Projeção Contact/identity/Conversation/Message/timeline e draft são confirmados juntos no snapshot; restart/replay não duplicam. Opt-out bloqueia auto-reply; consentimento precisa de configuração explícita, nunca deriva do inbound. Receipts sem outbound correlacionado ficam UNBOUND_RECEIPT_NOT_APPLIED, sem inventar entrega/Lead/pedido.

Snapshot contém dados sintéticos privados; não exposto via HTTP/audit. .local-messaging ignorado pelo Git. Audit usa apenas referências/mode/reason. Testes usam diretórios temporários controlados, eliminados somente após conferir caminho. Nenhuma credencial real, SDK cloud ou chamada provider.

Limites: lock de processo morto exige inspeção antes de remoção; sem recuperação automática insegura. Commit local validado contra restart de processo, não garantia de power-loss/distributed database. Capacidade 10 mil itens e 1000/batch é política local. Erro/capacidade/lock responde 503, nunca ACK prematuro. Tipo inbound não suportado rejeita batch inteiro; quarentena de conteúdo heterogêneo permanece requisito antes de webhook público.

## Reuso e staging

F1B-10/12/13/15 orientaram batch, dedupe anterior à resolução, lease/retry e porta async. Adapter Firestore histórico é superior para transações distribuídas, mas usa contratos/coleções próprios e SDK @google-cloud/firestore ausente no CRM; não é colado ou conectado sem migração de porta/emulador/IAM. Journal local não o substitui em staging/live. Arquitetura de persistência real permanece Firestore server-side por ADC/managed identity; futura adaptação deverá usar admission/worker assíncronos, transações e fencing.

.firebaserc atual contém somente projeto default; nenhum staging isolado foi comprovado. staging.example.json é configuração não provisionada, DISABLED, sem secrets/IDs reais e allowlist vazia. Nenhum projeto criado, auth CLI consultado, Firestore operacional acessado ou webhook publicado. Próximo gate externo: staging/cloud/Meta/TEST antes de canário.

## Reconfirmação oficial adicional

Após as páginas diretas Meta indisponíveis, consultado o repositório oficial fbsamples/business-messaging-sample-tech-provider-app no commit 14703a3e1fdba9bcf75b2360b00817b6fcc9f79b. CONTRIBUTING.md seção Webhook Verification confirma X-Hub-Signature-256, HMAC SHA256/app secret e rejeição de assinatura inválida. Fonte: https://github.com/fbsamples/business-messaging-sample-tech-provider-app/blob/14703a3e1fdba9bcf75b2360b00817b6fcc9f79b/CONTRIBUTING.md . Isso reconfirma o algoritmo/header em referência oficial; não comprova subscription, configuração da conta ou webhook público. O exemplo antigo whatsapp-api-examples mistura Page/token e possui retorno inconsistente; não usado para promover readiness operacional.

Política e referências de payload: https://whatsappbusiness.com/policy/ ; https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference ; https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object . Protocolos reais devem ser confirmados em staging para a conta/versão escolhida.

Validação local: 112 testes acumulados; strict server/núcleo/preview; baseline 21→21, zero novos; builds operacional/isolado e isolamento aprovados. CI a confirmar no commit. Verde é preparação local; inbound cloud ainda não validado. Avançar LIVE-03/04 PREPARATION sem primeiro envio.
