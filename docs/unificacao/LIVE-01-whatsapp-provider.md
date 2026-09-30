# LIVE-01 — adapter Meta preparado, transporte bloqueado

2026-09-30. LIVE-00 ed493ba3e9807a9a38077e89337646b138c047a6: CI push 36778176581 / PR 36778181444 success, 100 testes acumulados. Nenhum envio.

MetaWhatsAppCloudProvider em services/messaging é server-only, sem import na UI. Config default DISABLED; MOCK produz resultado SIMULATION sem providerMessageId; STAGING/LIVE consultam resolver seguro e bloqueiam em GATE_OUTBOUND_CANARY_REQUIRED. Não existe transporte conectado ou flag de ativação. Métodos sendText/sendTemplate validam policies/serialização; não chamam API. Endpoint exige versão explícita e fixa host graph.facebook.com.

parseWebhook normaliza batch de texto/status, valida WABA/phone id/tenant/mode, UTF-8 estrito e tamanho local 1 MiB/1000 eventos. Um item não suportado rejeita o batch inteiro sem ACK; essa política conservadora local exige evolução para quarentena antes de tráfego externo heterogêneo. normalizeStatus aceita somente sent/delivered/read/failed; sucesso API significa ACCEPTED, nunca DELIVERED. Timeout/5xx são UNCERTAIN, sem retry cego; 429 retryable, outros erros finais. Não se transmite corpo de erro, token ou headers ao resultado/log.

verifyWebhook usa app secret via resolver, HMAC SHA256 e comparação constante sobre RAW BODY; challenge valida token/subscribe/campo numérico. Adaptado da segurança F1B-09 auditada, sem importar runtime/registry legado. Protocolo técnico permanece PENDING_CURRENT_META_RECONFIRMATION: developers.facebook.com indisponível na pesquisa atual. Seguro para testes locais; não é prova live.

Serialização template suporta apenas parâmetros posicionais text BODY em MARKETING/UTILITY, sem media/buttons/named/authentication. A coleção oficial Meta consultada confirma fronteira messages/versão/phone id; página de template não expôs o corpo completo. Subconjunto permanece preparo local e exige reconfirmação antes de canário. Referências: https://www.postman.com/meta/whatsapp-business-platform/overview ; https://www.postman.com/meta/whatsapp-business-platform/request/0arw2jw/send-text-message-with-preview-url ; https://www.postman.com/meta/whatsapp-business-platform/request/o65u5m5/send-message-template-text . Política atual: https://whatsappbusiness.com/policy/ .

Testes: disabled, missing secret, gate mesmo com secret fake, texto/template, opted-out/template pausado, assinatura/challenge/bytes adulterados, payload inválido, contexto/mode, status, erro final/rate limit/timeout/resultado incerto. Todos usam fixtures e secrets sintéticos; nenhuma chamada network provider. tsconfig.messaging.json e CI adicionam testes/typecheck do servidor. Não há armazenamento de secrets, login cloud ou backend operacional.

Readiness verde significa adapter/protocolo testável localmente, não transporte ativado. Próxima LIVE-02 prepara admission/runtime com persistência local, sem endpoint público. Rollback: modo DISABLED e não instanciar runtime; sem alteração operacional para reverter.
