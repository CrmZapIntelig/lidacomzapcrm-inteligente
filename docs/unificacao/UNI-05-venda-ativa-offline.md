# UNI-05 — Venda ativa offline

2026-09-30. REC-01 aprovada 7abdd0f; CI-PREVIEW 91b6356, Hosting bloqueado.
HEAD inicial desta fase: 91b6356. Branch codex/unificacao-gestao-inteligente.

activeSalesOffline.ts compõe as regras REC-01 sem UI, backend ou provider.
DispatchCampaign, audience snapshot, queue, entries, budgets, drafts e executions
continuam distintos. Marketing não é recalculado nem alterado. Entradas são explícitas
e copiadas; datas fornecidas, identidade de negócio determinística.

prepareActiveSalesDrafts avalia contatos do snapshot em posição crescente,
elegibilidade central atual, capability declarada e conversa única do mesmo
tenant/contact/channel (e provider compatível quando presente). Bloqueio/opt-out
em qualquer evidência do contato bloqueia outros canais. Endereços repetidos de
IDs diferentes não duplicam destinatário no mesmo preparo/snapshot mantido.
Sem evidência, capacidade UNKNOWN, vínculo ambíguo, template não resolvido ou
consentimento ausente: permanece QUEUED com motivo, sem consumo de orçamento.

Daily limit é orçamento comercial de **preparação de drafts** por data/fuso,
acumulado entre chamadas. Sobras continuam no próximo dia por chamada explícita;
não há timer/worker. Novos contatos só entram via extensão explícita com nova revisão,
após posições anteriores. Retry/lease não dispara preparação automática.

ConversationDraft estende PendingOutboundMessage com tenant, canal, chave e
mode=SIMULATION/state=DRAFT/canSend=false. getConversationDraft fornece payload
para futuro abrir-conversa explícito; não cria chat nem Message. Cancelamento mantém
tombstone/idempotência e orçamento conservador, indisponibilizando draft ao operador.
Personaliza {{nome}} em todas as ocorrências; demais placeholders bloqueiam preparo.

Estratégias WHATSAPP, GOOGLE_RCS, RCS_FIRST_WITH_WHATSAPP_FALLBACK e
WHATSAPP_FIRST_WITH_RCS_FALLBACK escolhem uma identidade segura. BOTH significa
avaliar ambos com a seleção única histórica WhatsApp primeiro (BOTH_SMART),
não duplicar contato nem preparar duas mensagens. Não há prova real de suporte;
fixtures MANUAL são apenas evidência offline explicitamente fornecida.

Execuções são SIMULATION/PREPARED_ONLY, com drafts realmente preparados neste estado
offline. Replay sem mudança não cria nova execução. Não existe operação send,
mensagem real SENT, DELIVERY, READ, REPLY, receita/ROI ou evento MESSAGE_SENT.
Janela continua NOT_EVALUATED, canSend=false. Eventos/funil aguardam UNI-07.

Validação: 74/74 testes (15 UNI-05 + 59 anteriores), typecheck estrito e build
aprovados. Baseline 21→21, zero novos. Fingerprint de diagnósticos agora usa
linha/coluna em vez de offset de bytes, para comparar Windows CRLF e CI Linux LF:
1d2ad0f9b2592f2d306e0377df6cb283f0273b414b3bbefc477656d70374957b.
Nenhum diagnóstico foi dispensado. Build mantém aviso de bundle >500 kB; scan
Tailwind pode alterar assets por novas strings, embora nenhum componente seja alterado.

Riscos: caller deve manter snapshots/budget completos entre chamadas; nenhum store
durável ou concorrência distribuída é fornecido. Dados e evidências são entradas
do caller, sem consulta live. Não expor estado offline a escrita no modelo legado.
Preview bloqueado por isolamento; esta fase interna não depende de validação visual.
Gate UNI-06: verde offline. Fontes históricas, modelos legados, Firebase/main preservados.
