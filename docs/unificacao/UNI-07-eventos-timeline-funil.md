# UNI-07 — Eventos, timeline e funil offline

2026-09-30. HEAD inicial db0b8ec1ac071bb83fa858e5126ee7148601633e.
UNI-06 CI verde: push 36742541837 e PR 36742548511.

Origem semântica: Gestão src/events/EventEngine.ts e src/domain/types.ts, 0b13ef1.
Não copiado emitEvent acoplado ao repository/log/relógio/IDs. src/domain/offlineEvents.ts
define eventos tipados, reducer puro e journal idempotente. dispatchEventBridge.ts
conecta explicitamente drafts reais do snapshot offline ao reducer, sem execução no import.

MESSAGE_DRAFT_CREATED / SIMULATION cria ScopedOpportunity RASCUNHO e TimelineEvent
“Rascunho de venda ativa (simulação)”, com texto explícito de nenhuma mensagem enviada.
ScopedOpportunity estende a fronteira UNI-03 com tenant/datas/mode, sem substituir
Opportunity reduzida, Client.status/stage, History, Order ou contratos legados.
Se já existe oportunidade, não regride nem sobrescreve estágio/orderId.

FIRST_OUTBOUND_MESSAGE_SENT → LEAD é política declarada. O reducer offline rejeita
esse fato LIVE_EVIDENCE com GATE_LIVE_INTEGRATION_REQUIRED antes de qualquer efeito.
Nenhum simulado vira MESSAGE_SENT real. Esta fase não implementa receipt, resposta,
conversão/pagamento, eventos de pedidos ou todas as transições de funil operacional.
Essas extensões exigem fatos explícitos e fase própria; Order permanece domínio separado.

Eventos carregam IDs/contexto e datas, sem conteúdo/endereço do draft. Deduplicação por
ID e assinatura detecta colisão; replay não duplica timeline/opportunity. Estado é copiado,
inclusive datas; falha é atômica porque não há escrita no input. Timeline anterior é mantida.
Draft cancelado não emite novo evento; timeline já emitida não é apagada.
Tenant e associação campaign/queue/contact/draft são validados antes de publicar no modelo.

86/86 testes locais (7 novos + 79 anteriores), typecheck estrito e build aprovados;
baseline antes/depois exatamente 21, zero novos. Teste integrado percorre Marketing →
audience → Dispatch → preparation → evento → timeline → oportunidade offline.
Sem UI, Firebase/Firestore/provider/network, sem bus global/subscribe/worker/storage.

Gate UNI-08: **BLOQUEADO** por GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED. Não existe
preview/mock local isolado comprovado para abrir a SPA conectada ao ambiente operacional.
Conforme seções 21/25/38 do controlador, execução para antes da fase visual. PR #4 draft;
preview URL nenhuma, Firebase project/channel de preview nenhum. Main e fontes preservadas.
