# REC-01 — Pré-requisitos de venda ativa offline

2026-09-30. Branch codex/unificacao-gestao-inteligente. HEAD inicial 5403790.

## Checklist da seção 17 do SOURCE-AUDIT

- [x] routing.ts: seleção única, WhatsApp primeiro/fallback RCS, UNKNOWN bloqueado; contexto tenant e ambiguidade reforçados em src/domain/routing.ts.
- [x] omnichannel.ts: factories recuperadas em offlinePrimitives.ts, compatibilidade provider/canal, defaults UNKNOWN, cópias independentes de datas/arrays. Contratos UNI-02 preservados.
- [x] stateMachines.ts: grafo outbound exato recuperado em dispatchPrerequisites.ts, separado dos status comerciais. Nenhuma função produz receipt ou mensagem real.
- [x] retryPolicy.ts: backoff limitado e determinístico, validação adicional de NaN/Infinity, sem scheduler.
- [x] outboundQueue.ts: dedupe, reserva, lease, owner, retry, cancelamento e snapshot de modelo offline adaptados como operações imutáveis. Colisões rejeitadas. Não recuperado ack→DELIVERED, pois fabricava entrega simulada.
- [x] contracts.ts/errors.ts: recorte transitivo reduzido aos estados e parâmetro retryable; sem importar PreparedOutboundMessage (exige provider) nem stack gateway/erros de ingress. Transporte futuro continua separado.
- [x] omnichannel-foundation.test.ts: casos UNKNOWN, provider compatível, preferência/fallback, isolamento, determinismo adaptados ao runner atual.
- [x] meta-live-prerequisites-offline.test.ts: estados, lease, owner, retry limitado, cancelamento e idempotência extraídos sem importar suite gateway.
- [x] core.test.ts e Actions/IRepository/MockRepository: posição crescente, dedupe campaign/contact, draft≠sent usados como referência; não portados singletons/relógio/IDs/eventos.
- [x] docs omnichannel-contact-messaging-foundation e meta-live-prerequisites-offline: invariantes de núcleo sem SDK, capability explícita, preparação separada de transporte e fila process-local preservadas aqui.

Origem: C:/Users/dfant/lidacomzap-gestao-inteligente, tree 0b13ef1
(equivalente ao produto em db3c585). Nenhuma fonte histórica foi alterada.

## Gaps novos resolvidos para o desenho UNI-05

MarketingAudience descreve público/rationale; DispatchAudienceSnapshot captura seleção explícita,
revisão, vínculo e data. Snapshot não recalcula segmentação nem confere elegibilidade.
Eligibility central avalia telefone internacional já normalizado, grupo/bloqueio/opt-out,
consentimento, preferência de canal, duplicação de preparo, frequência, contexto,
identity/capability explícitos e template aprovado para simulação. UNKNOWN não prova suporte.
eligibleForPreparation não é autorização de envio: canSend=false, window=NOT_EVALUATED.

DispatchBudgetPolicy acumula chaves por tenant/campanha/dia/fuso IANA; repetir chamada
não abre outro lote. O default histórico 250 era fixture comercial, não quota oficial;
o núcleo exige dailyLimit explícito, sem default. Não permite mudar fuso após consumo.
Budget de preparação é conservador: cancelamento não devolve consumo automaticamente.

Fila usa identidade de negócio tenant/campaign/contact com partes prefixadas por tamanho,
não requestId/posição. Novos contatos são acrescentados após a última posição, sem deslocar
os anteriores; replay não duplica. Snapshot é serializável e reidratável por caller.
“Persistente em modelo offline” significa estado completo exportável/retomável, não gravação
automática em disco/browser/Firestore. Leases/retries só avançam por chamadas explícitas.

Binding contact/conversation/channel será consumido pela UNI-05 com conversas explícitas;
REC-01 não cria conversas, drafts nem fluxo de campanha. Simulação deve reavaliar eligibility
no preparo e manter send bloqueado. Publicar eventos de draft é responsabilidade UNI-07.

## Evidência e gate

59 testes aprovados (21 REC-01 + 38 anteriores); typecheck estrito isolado aprovado.
Build aprovado, aviso preexistente de bundle >500 kB. Lint global antes/depois:
21 → 21, mesmos diagnósticos nos arquivos anteriores, zero novos.
Zero dependência externa nos módulos, zero I/O/Firestore/provider/fetch.
UI, persistência, Firebase, package e contratos anteriores preservados.

UNI-05 pode começar com esta camada? **SIM, exclusivamente offline**.
Código, testes e desenho agora cobrem os pré-requisitos da seção 17. Gate não libera
provider, janela real, persistência de produção, migração, main ou deploy.
