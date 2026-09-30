# LIVE-03 — PREPARATION, primeiro envio bloqueado

2026-09-30. LIVE-02 9ff2c1215b5835a55a03ae26988f7d2278f85159: CI push 36779490875 / PR 36779494290 success, 112 testes acumulados.

prepareOutboundCanary é puro e gera somente plano/reasons/idempotencyKey para revisão. canSend=false sempre. Exige TEST/allowlist por tenant/contact/identity/provider/endereço/data, exatamente um destinatário/uma mensagem/zero tentativas, sem cliente real na audiência. Não promove draft SIMULATION a STAGING/LIVE. Policy/elegibilidade/contexto/capability provider são avaliados; manual/unknown não se tornam autorização real. Flags de readiness são evidências a serem fornecidas por serviço confiável futuro, não permissões de UI; antes de send deverão ser revalidadas no servidor.

ProviderReceiptProjection guarda apenas fatos explícitos correlacionados por tenant/account/provider/channel/mode/providerMessageId/dispatchEntry/conversation/contact. READ não inventa SENT/DELIVERED. Eventos fora de ordem ficam preservados; replay é idempotente e colisão rejeitada. REPLIED exige inbound com context.id explícito correspondente e mesmo endereço, sem correlacionar contato sozinho. Parser Meta preserva essa referência. Não altera Opportunity/Order/Marketing nem cria receita/conversão.

Nenhuma reserva/envio canário executado. Adapter Meta continua sem transporte. Conta/versão/credential/subscription/webhook/staging real não configurados; allowlist em staging.example vazia. Nenhum número do usuário ou cliente escolhido. Testes usam nomes/IDs/endereço e evidências fabricadas somente dentro do teste, não config real. Projeção de receipts não ligada ao runtime/cloud.

GATE_OUTBOUND_CANARY_REQUIRED é obrigatório: faltam staging isolado, secrets seguros, configuração Meta, webhook externo validado, store distribuído e TEST allowlist. Primeiro envio continua exigindo parada. Preparação local pode avançar à LIVE-04; isso não declara canário realizado. Persistência de intenção/resultado canário, fencing/distributed budget, tratamento UNCERTAIN e aprovação do primeiro envio devem estar fechados antes de ligar transporte.

Testes acumulados: 116; strict server/núcleo/preview, baseline 21→21, ambos builds e isolamento. CI a confirmar no commit da fase. Rollback sem efeito operacional: não consumir o plano e manter provider DISABLED.
