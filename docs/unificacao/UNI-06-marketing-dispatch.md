# UNI-06 — Marketing → Dispatch explícito

2026-09-30. UNI-05 6389d42, correções de portabilidade CI 067dc67/7473b37.
HEAD inicial de implementação 6389d42; publicação após confirmar CI corrigida.

marketingDispatchBridge.ts exige MarketingCampaign, MarketingAudience explícita
(tenant/campaign/rationale), configuração dispatch e revisão da audiência.
Marketing define QUEM/POR QUÊ; template/limite/estratégia/fuso/frequência vêm da
configuração operacional explícita. Campaign.id distinto e contexto igual obrigatórios.

Captura público deduplicado e copiado com sourceAudienceId, revision, capturedAt e
marketingCampaignId. Não executa segmentação, não consulta contatos, não altera a
campanha legada nem seus contadores. Handoff possui chave de negócio estável; uma
nova configuração deve usar nova operação/revisão explicitamente e preservar estado
anterior no caller. Não existe repository que sobrescreva ou persista essa operação.

Cria estado de Dispatch com fila QUEUED; drafts e executions vazios. Pertencer ao
público não torna elegível: o núcleo UNI-05 ainda exige evidências atuais para preparar.
Não prepara mensagens automaticamente, envia ou produz métricas de resultado.

79/79 testes locais (4 da ponte + 1 regressão de endereço + 74 anteriores), typecheck estrito e build aprovados;
baseline 21→21 zero novos. Testes provam separação, vínculo, snapshot, idempotência,
cópias/datas independentes e rejeição de contexts/rationale inválidos.
Sem UI, Firestore/provider/rede. Preview BLOCKED, URL nenhuma, PR #4 draft.
Gate UNI-07: verde offline após CI. Detalhes contínuos no EXECUTION-LEDGER.md.

Revisão complementar da UNI-05: ConversationDraft mantém recipientAddress transitório
no próprio snapshot offline. Impede duplicação quando uma chamada posterior omite
o contato anteriormente preparado; a lista atual não precisa reconstruir esse endereço.
Não é persistido remotamente, escrito em logs ou usado como identidade de negócio.
CI anterior corrigida verde: push 36742248293 e PR 36742255718 (7473b37).
