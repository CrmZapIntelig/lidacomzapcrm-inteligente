# UNI-02 - Contratos de dominio

Data: 2026-09-30.

## Base e entrega

- Projeto principal: LidacomZapCRM.
- Branch: `codex/unificacao-gestao-inteligente`.
- Base CRM: `a69aba98f1444cf72c0946474572c8d4c529a4c0`.
- Fonte Gestao: `0b13ef1f2bfb741ff22dad9fcf7613a0c8dc40ba`.
- Fontes consultadas: `src/domain/types.ts` e `src/domain/omnichannel.ts` do Gestao.

UNI-01 concluida com a branch de trabalho. UNI-02 adiciona contratos TypeScript
em `src/domain/types.ts` e `src/domain/omnichannel.ts`. Os campos, tipos, nomes e
opcionalidade dos contratos selecionados correspondem aos da fonte Gestao.
Funcoes de criacao, roteamento e idempotencia do Gestao ainda nao foram migradas.

Os tipos antigos em `src/types.ts` continuam sendo usados pelas telas e pelo
Firestore. Os contratos novos nao sao uma migracao de dados nem um novo banco.
Nao ha mudanca visual nesta entrega.

## Correspondencia e pontos de integracao

| CRM atual | Dominio incorporado | Tratamento necessario na UNI-03 |
| --- | --- | --- |
| `Client` | `Contact` + `ContactChannelIdentity` | Preservar ID, preferencias e notas; exigir tenant e origem das datas |
| `Campaign` | `MarketingCampaign` | Preservar segmento, template, status e resultados no registro original |
| Preparacao operacional | `DispatchCampaign` | Criacao explicita com limite diario e politica de canal; nao converter toda campanha em disparo |
| Mensagens na tela | `Conversation` + `Message` | Mapear remetente, data, conversa e canal sem descartar anexos |
| Rascunho de envio | `PendingOutboundMessage` + `DispatchQueueEntry` | Vincular contato, conversa e campanha operacional; validar empresa atraves dos pais |
| `Order` / `DeliveryOrder` | `Order` + `OrderItem` | Preservar itens e entrega; origem, canal e modo de criacao sao dimensoes diferentes |

Os modelos do Gestao sao menores que alguns registros do CRM. Os adaptadores
devem produzir uma projecao para uso operacional e preservar o registro de origem;
nao podem gravar essa projecao por cima dos documentos existentes.

## Regras preservadas

1. Marketing define planejamento; DispatchCampaign define a operacao de envio.
   O Gestao ainda nao possui um campo de ligacao entre essas duas entidades.
   Essa ligacao sera implementada explicitamente ao conectar os fluxos.
2. `campaignId` de fila e rascunho significa ID de DispatchCampaign.
3. Um contato pode ter identidades WhatsApp e RCS, com disponibilidade separada
   da elegibilidade. `UNKNOWN` nao autoriza envio.
4. `BOTH_SMART` representa escolha de um canal; nao significa enviar duas vezes.
5. O contrato de pedido usa `entryPoint`, `channel` e `creationMode` separados.
   `NONE` e canal de pedido sem mensageria, nao um canal de comunicacao.
6. Datas do dominio sao `Date`; varios campos do CRM sao strings. A conversao
   deve validar datas e exigir contexto ausente, sem inventar tenant ou historico.
7. Tipos TypeScript nao validam dados externos em execucao. Regras de janela 24h,
   opt-out, roteamento, fila e respostas automaticas ainda precisam de servicos.
8. Os nomes Message, Order e OrderItem existem nos dois modelos. Consumidores
   futuros devem usar imports explicitos, com aliases quando precisarem de ambos.

## Limites e continuidade

UNI-02 nao inclui gateway, SDK, credenciais, colecoes, envio, deploy ou alteracao de
Firebase. Nao estabelece prontidao para envio real. Os contratos de importacao
representam apenas uma pre-visualizacao; nao buscam contatos de fontes externas.

Proxima entrega: UNI-03, adaptadores puros de compatibilidade com testes para
IDs, datas, preferencias, dados ausentes e preservacao do registro original.
Depois: ligacao das telas (UNI-04), venda ativa offline (UNI-05), janela 24h
(UNI-06), pedidos/respostas (UNI-07) e preparacao de provider real (UNI-08).

## Verificacao

- Verificacao estrita dos dois arquivos de dominio: aprovada com
  `tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler src/domain/types.ts src/domain/omnichannel.ts`.
- Comparacao por parser TypeScript: 39 interfaces/aliases correspondem aos da
  fonte Gestao, desconsiderando apenas comentarios e formatacao.
- `npm run build`: aprovado; aviso de bundle acima de 500 kB (sem bloqueio).
- `npm run lint`: mesmos 21 diagnosticos antes e depois da entrega; nenhum nos
  arquivos novos. Pendencias em `backend/dispatch-admission/src/index.ts`
  (export de tipo), `src/lib/supabase.ts` (`ImportMeta.env`) e
  `src/utils/campaignDispatchContract.ts` (readonly e comparacoes de status).
- `git diff --check`: aprovado para as alteracoes rastreadas.

Nao foram adicionados testes de comportamento porque esta etapa inclui apenas
declaracoes de tipos; os adaptadores da UNI-03 exigirao testes de execucao.
Entrega local, sem commit, push ou deploy nesta etapa.
