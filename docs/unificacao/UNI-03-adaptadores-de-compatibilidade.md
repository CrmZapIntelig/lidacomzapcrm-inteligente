# UNI-03 - Adaptadores de compatibilidade

Data: 2026-09-30.

## Base e entrega

- Projeto principal: LidacomZapCRM.
- Branch: `codex/unificacao-gestao-inteligente`.
- Base CRM: `a69aba98f1444cf72c0946474572c8d4c529a4c0`.
- Fase anterior: UNI-02, contratos de dominio incorporados em `src/domain/types.ts`
  e `src/domain/omnichannel.ts`.

UNI-03 adiciona adaptadores puros em `src/domain/compatAdapters.ts` para projetar
registros atuais do CRM nos contratos incorporados do Gestao Inteligente, sem
alterar telas, Firestore, Firebase, colecoes ou fluxo visual.

## Adaptadores adicionados

| Origem CRM | Projecao de dominio | Funcao |
| --- | --- | --- |
| `Client` | `Contact` + `ContactChannelIdentity[]` | `adaptClientToContact` |
| `Client` | `Conversation` | `adaptClientToConversation` |
| `Campaign` | `MarketingCampaign` | `adaptCampaignToMarketingCampaign` |
| `Campaign` | `DispatchCampaign` | `adaptCampaignToDispatchCampaign` |
| `Message` | `Message` de dominio | `adaptCrmMessageToDomainMessage` |
| `Order` | `Order` + `OrderItem[]` canonicos | `adaptCrmOrderToDomainOrder` |
| `DeliveryOrder` | `Order` + `OrderItem[]` canonicos | `adaptDeliveryOrderToDomainOrder` |

## Regras preservadas

1. `tenantId` e obrigatorio em toda projecao nova.
2. Datas de dominio sao `Date`; strings legadas invalidas falham explicitamente.
3. Clientes nao sao duplicados por canal. Um `Client` pode gerar identidades
   WhatsApp e RCS vinculadas ao mesmo contato.
4. `MarketingCampaign` e `DispatchCampaign` continuam entidades diferentes.
5. `DispatchCampaign` recebe ID derivado (`dispatch:{campaignId}`) para nao
   colidir com a campanha de marketing original.
6. `campaignId` operacional de disparo continua significando DispatchCampaign.
7. Pedido CRM e pedido delivery viram `Order` canonico, preservando origem:
   `entryPoint`, `channel` e `creationMode` continuam dimensoes separadas.
8. Os adaptadores retornam o registro `source` original para preservar
   rastreabilidade e evitar gravar projecoes por cima dos documentos existentes.

## Limites

UNI-03 nao cria repositories, nao grava em Firestore, nao altera telas, nao muda
collections e nao cria envio real. Tambem nao implementa regras de janela 24h,
fila persistente, gateway, provider live ou event bus.

Os adaptadores sao uma ponte de compatibilidade para as proximas fases. Eles
permitem que a interface atual continue usando os modelos legados enquanto novos
servicos passam a trabalhar com os contratos de dominio incorporados.

## Verificacao

- Checagem estrita da nova camada:
  `npx tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler src/domain/types.ts src/domain/omnichannel.ts src/domain/compatAdapters.ts src/domain/compatAdapters.test.ts`
- Testes de comportamento:
  `node --test --import tsx src/domain/compatAdapters.test.ts`

Resultado: 7 testes aprovados.

## Proxima entrega

UNI-04 deve conectar a separacao Marketing/Disparador na camada de aplicacao/UI
sem disparo real:

- expor campanha comercial como planejamento;
- criar caminho explicito para gerar DispatchCampaign a partir de MarketingCampaign;
- manter a fila e o envio ainda offline;
- nao alterar provider real;
- nao misturar campanha de marketing com campanha de disparo.

## Revisão posterior em 2026-09-30

Este documento descreve a versão local inicial. A validação e as regras atuais
estão em [UNI-03 — legado → novo domínio](UNI-03-adaptadores-legado-novo-dominio.md).
O adapter de conversa agora exige ID e contador explícitos; origem e modo de
criação de pedidos não são inferidos quando ausentes. Telefone internacional é
normalizado, provider permanece desconhecido e consentimento operacional isolado
não habilita marketing. Foram acrescentados histórico e fronteiras locais.
Validação atual: 13 testes, typecheck estrito e build aprovados; lint mantém 21
erros anteriores, zero novos. Nenhuma fase seguinte foi iniciada.
