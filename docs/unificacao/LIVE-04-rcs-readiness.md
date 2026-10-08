# LIVE-04 — RCS PREPARATION

Data: 2026-10-01. Retomada da preparação interrompida em 2026-09-30.

O provider RCS permanece DISABLED por padrão. Não há agente provisionado, credenciais, SDK, consulta de capability, transporte ou scraping. Os métodos de envio retornam bloqueio mesmo quando configurados como STAGING/LIVE.

`RcsChannelProvider` aceita evidência fornecida e vinculada a tenant, agente, destinatário e modo. Ausência, UNKNOWN, fonte incompatível, data futura ou evidência antiga mantêm a capability desconhecida. A validade de cinco minutos é uma política local conservadora, não um TTL garantido pelo Google.

Texto, rich card e suggested replies existem apenas como DRAFT SIMULATION com fixtures em MOCK. Rich card exige RICHCARD_STANDALONE. Esses objetos e limites são internos: não constituem serialização validada do protocolo Google. Nenhum rascunho autoriza envio.

O fallback prepara no máximo um canal com disponibilidade conhecida, elegibilidade e política permitidas. BOTH exige configuração explícita e ainda seleciona um único canal. ACCEPTED ou UNCERTAIN impedem fallback; uma rejeição definitiva anterior à aceitação exige identificar o canal anterior. A seleção continua canSend=false.

A auditoria histórica registrou o adapter RCS offline como referência de separação de capabilities e fallback; não foi ligado ao frontend ou copiado como integração operacional. A verificação AST adicionada à CI inspeciona imports literais do App/preview e chamadas/dependências proibidas nos arquivos do servidor. É uma proteção estática delimitada, não uma prova geral contra toda forma de I/O.

Referências oficiais consultadas durante a preparação:

- https://developers.google.com/business-communications/rcs-business-messaging/guides/build/capabilities
- https://developers.google.com/business-communications/rcs-business-messaging/guides/learn/rich-cards
- https://developers.google.com/business-communications/rcs-business-messaging/guides/integrate/webhooks

A ativação exige agente e ambiente autorizados, credenciais gerenciadas, confirmação do protocolo, capability real e gate de canário. Webhook RCS não foi implementado; o runtime local atual é somente Meta sintético.

Validação local: 119 testes aprovados (117 de módulos/cenário e 2 de isolamento); strict servidor/núcleo/preview e ambos builds aprovados; baseline global 21 → 21, zero diagnósticos novos. PR #4 permanece draft; nenhuma integração externa, primeiro envio, merge ou deploy.
