# LIVE-00 — readiness estrutural, sem envio

2026-09-30. Autorização: controlador fase live fornecido pelo usuário. Baseline inicial 62cfde5c8741c23922ab626aab682fe8ba2dac0b; main 60fb91f preservada, PR #4 draft. Pre-flight: root/branch/origin/PR/CI confirmados, 91 testes e baseline exato 21→21. Arquivos pessoais e AGENTS/FONTES-CHATS excluídos.

## Auditoria e decisão

| Fronteira | Evidência / conclusão |
| --- | --- |
| Provider | CRM sem implementação; contrato MessagingProvider introduzido, adapter Meta server-only na LIVE-01. Não criar Evolution concorrente. |
| Janela/template | Facade UNI-04 continua NOT_EVALUATED para compatibilidade. Política opt-in messagingPolicy.ts distingue reply dentro de 24h, iniciativa comercial/template, status/contexto/variáveis/evidência; canSend permanece false. |
| Elegibilidade/opt-out/consentimento | dispatchPrerequisites.ts protege preparo. messagingPolicy aplica bloqueio/opt-out/consentimento antes da janela. Inbound não concede consentimento comercial. |
| Inbound | Histórico F1B possui raw/HMAC, batch/admission, lease/worker/resolution. Contratos assíncronos introduzidos; projeção pura idempotente para Contact/identity/Conversation/Message/timeline, sem I/O. Runtime/assinatura na LIVE-01/02. |
| Fila/retry/lease | Núcleo outbound offline existente. Porta async de admission exige dedupe/work atômicos e fencing. Persistência distribuída não pronta. |
| Outbound | contrato request/result separa MOCK/ACCEPTED/FAILED/UNCERTAIN; aprovação de policy não autoriza transporte. Primeiro envio depende de gate canário. |
| Auto-reply | apenas DRAFT, fonte/mode/contexto/horário correlacionados; exige caminho de atendimento humano. |
| Receipts/read/reply | normalizados em contrato; somente fato autenticado poderá atualizar estado. Aceite de API não é delivery/read. Não se projeta LEAD/pedido fictício. |
| Secrets/audit/logs | resolver injetado server-side, sem segredo frontend; AuditPort só referências/reason codes. Sem consultas CLI de credenciais. |
| Staging/rollback | staging cloud não comprovado. Default DISABLED; desligar runtime/remove import opt-in é rollback local. Nada conectado à SPA operacional. |

## Fontes e limites

Comparados diretamente em C:/Users/dfant/lidacomzap-gestao-inteligente/services/channel-gateway: metaOfficialProtocol.ts, metaWebhookSecurity.ts, whatsapp-meta.ts, ingress.ts, inboundWorker.ts, resolution.ts. Assinatura sobre bytes brutos, contexto, batch, idempotência antes de resolution e lease/retry são preservados como referência; sem copiar o registry/runtime completo e dependências Firestore síncronas/assíncronas incompatíveis. Fontes não editadas. Os chats registrados em FONTES-CHATS continuam sem transcrição acessível; nenhum requisito inferido deles.

Documentação oficial consultada em 2026-09-30:

- https://whatsappbusiness.com/policy/ (atualizada 23/09/2026): janela de resposta 24h aberta/resetada por mensagem do usuário; início por template aprovado, opt-in e opt-out; automação precisa escalonamento humano.
- https://www.postman.com/meta/whatsapp-business-platform/overview e /request/8gvd47s/send-text-message (coleção oficial Meta): endpoint messages parametrizado por versão/phone id. Nenhuma versão API presumida.
- https://developers.google.com/business-communications/rcs-business-messaging/guides/integrate/webhooks : autenticação, processamento assíncrono e separação agente de teste.
- https://firebase.google.com/docs/emulator-suite/connect_firestore : projetos demo/emulador como alternativa local; não usar projeto operacional como staging.
- developers.facebook.com documentação técnica direta retornou indisponível nesta consulta. Protocolo de assinatura histórico não é reconfirmação atual; nova verificação técnica é pré-requisito de canário.

## Critério e avanço

Readiness estrutural inclui provider boundary, policies, contratos inbound/outbound e drafts seguros. Validação local: 100 testes acumulados (98 núcleo/cenário + 2 isolamento), strict núcleo/preview, baseline 21→21 e builds aprovados. Sem tokens, rede provider, send ou alterações cloud. Resultado CI deve ser confirmado no commit da fase antes de LIVE-01. Verde estrutural não significa readiness operacional: persistência, cloud, secrets, webhook público e canário permanecem bloqueados.
