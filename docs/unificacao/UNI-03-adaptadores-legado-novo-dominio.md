# UNI-03 — Adaptadores legado → novo domínio

Data: 2026-09-30. Projeto principal: LidacomZapCRM. Piloto: Restaurante Prato Mineiro.

## Estado inicial comprovado

Root: `C:/Users/dfant/LidacomZapCRM`. Branch: `codex/unificacao-gestao-inteligente`.
HEAD inicial: `a69aba98f1444cf72c0946474572c8d4c529a4c0`.
`main` e a referência local `origin/main`: `60fb91fdf048a8e0d4f9adc29a532be8bf4356dd`.
Referências remotas não foram atualizadas pela rede; não representam verificação do servidor.
Remoto: `https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente.git`.

UNI-02, relatório de auditoria, adaptadores, sete testes e documento anterior de
UNI-03 estavam locais e sem commit. `.vscode/extensions.json` modificado e
`v1.9.8.4-local-backup.patch` não rastreado foram preservados e excluídos do checkpoint.
Os 39 aliases/interfaces dos dois arquivos de contratos correspondem, pelo parser
TypeScript com comentários removidos, ao commit `0b13ef1` do Gestão Inteligente.
Esses contratos não incluem ainda Event Bus, FunnelEngine ou provider executável.

## Projeções e compatibilidade

Implementação: `src/domain/compatAdapters.ts`. Nenhum consumidor React foi alterado.

| Legado preservado | Projeção | Adapter |
| --- | --- | --- |
| Client | Contact e identidades | adaptClientToContact |
| Client e contexto explícito | Conversation | adaptClientToConversation |
| Message | Message | adaptCrmMessageToDomainMessage |
| Campaign | MarketingCampaign | adaptCampaignToMarketingCampaign |
| Campaign e solicitação explícita com limite diário | DispatchCampaign | adaptCampaignToDispatchCampaign |
| Order | Order e itens | adaptCrmOrderToDomainOrder |
| DeliveryOrder | Order e itens | adaptDeliveryOrderToDomainOrder |
| HistoryEvent | TimelineEvent | adaptHistoryToTimelineEvent |

Cada projeção mantém `source` como referência ao registro original; não é cópia
para gravação. Não substituir documentos com essas projeções. Arrays de Contact
são copiados. Nenhum adapter escreve na fonte ou executa I/O.

Telefone: remove separadores de número internacional explícito, converte prefixo
00 para +, valida 8–15 dígitos. Ausência produz string vazia e nenhuma identidade;
número nacional ambíguo falha, sem inferir DDI. Canal ausente/desconhecido não gera
identidade. `ambos` permite duas identidades do mesmo Contact, sem duplicar cliente.
RCS do contrato corresponde a GOOGLE_RCS; provider RCS_GOOGLE só será atribuído
quando houver evidência. Nenhum provider é inferido pelo adapter de contato/conversa.
Disponibilidade permanece UNKNOWN; bloqueio e opt-out prevalecem. Consentimento
operacional isolado não autoriza marketing. ELIGIBLE é projeção do consentimento,
não aprovação da janela, disponibilidade ou envio.

Conversas legadas são mensagens agrupadas por cliente em App.tsx, sem entidade
Conversation persistida. ID da conversa e unreadCount devem vir do chamador;
canal desconhecido permanece undefined. Contato pode participar de várias conversas.
Anexos permanecem no source, pois o contrato Message não contém todos seus campos.

Pedidos: IDs existentes preservados. `entryPoint`, `channel` e `creationMode`
continuam separados. Modo de criação é obrigatório no contexto. Origem ausente
exige entryPoint explícito. DIGITAL_MENU, POS e TABLE_QR correspondem a delivery,
balcao e mesa_qr; mensagens usam WHATSAPP/RCS. MANUAL é representado pelo modo
HUMAN_OPERATOR; AI_ASSISTED pelo modo homônimo, sem inventar novo canal.
`ambos` significa origem CHAT sem canal determinado (NONE).
Itens delivery não possuem ID próprio: recebem ID sintético documentado
`orderId:item:posição`, somente para projeção; reordenação altera esses IDs.
Preço unitário delivery é subtotal dividido pela quantidade; quantidade zero falha.
FECHADO mapeia para PAID conforme o fluxo existente de registro no caixa em App.tsx.
Estados de produção e entrega permanecem no source, sem equivalentes no Order reduzido.

Marketing continua QUEM/POR QUÊ; Dispatch COMO/QUANDO. A chamada de marketing não
gera disparo. A projeção operacional exige chamada separada, limite e ID derivado
`dispatch:campaignId`. Segmento, template vinculado, status e resultados permanecem
no source: MarketingCampaign importado só comporta nome, ID, tenant e datas.

## Ausências e fronteiras

Client não possui datas de criação/atualização. observedAt é obrigatório e representa
data da projeção, não histórico comprovado. Datas inválidas falham. updatedAt ausente
em Campaign e pedidos usa createdAt como baseline da projeção, sem alegar atualização.
tenantId deve ser fornecido explicitamente; nenhum tenant novo é provisionado.
Notas, endereço, adicionais, frete, preferências e estados sem correspondência
continuam no source. Não há adapter reverso nem migração.

`integrationBoundaries.ts` define fronteiras locais de TimelineEvent, Opportunity
e entrada de OutboundMessagingPolicy, sem reivindicar que foram copiadas da UNI-02.
Client.stage não cria Opportunity automaticamente. Política recebe canal, provider,
última entrada/saída, tipo, template, versão da regra e data de avaliação; não executa
regra Meta nem implementa provider. Domain Event → Event Bus → Timeline → FunnelEngine
permanece arquitetura futura, sem efeitos nesta etapa.
DispatchAudience, DispatchQueue e DispatchExecution aguardam desenho explícito
na fase offline; DispatchQueueEntry e PendingOutboundMessage já são contratos UNI-02.
Não é criada fila, execução ou audiência por inferência de Campaign.

## Validação

Baseline sem src/domain: 21 diagnósticos. Antes dos ajustes, com UNI-02 e adaptadores
locais: os mesmos 21, comparados por arquivo, posição, código e mensagem.
Erros conhecidos: backend/dispatch-admission/src/index.ts, src/lib/supabase.ts e
src/utils/campaignDispatchContract.ts. Não corrigidos por estarem fora do escopo.
Lint do projeto é `tsc --noEmit`; não existe script npm test nem typecheck separado.
Testes isolados usam `node --test --import tsx src/domain/compatAdapters.test.ts`.
Há testes de IDs, telefone, bloqueio, ausências, canal conhecido/desconhecido,
campanhas, mensagens, pedidos/delivery, datas, fonte congelada, histórico e ausência
de imports de runtime/chamadas de I/O na implementação. Nenhuma dependência adicionada.

Resultado final dos comandos registrado ao fim deste documento.

## Limites e próximo passo

Firestore, layout, modelos legados e dados permanecem inalterados. Nenhum envio,
provider live, webhook, fila persistente, Supabase, secrets, deploy ou merge.
Risco principal: projeções reduzidas não servem para sobrescrever documentos;
normalização de números nacionais exige contexto antes da futura integração.
Próxima etapa recomendada: auditar a integração na camada de aplicação (UNI-04),
com políticas e ligação Marketing/Dispatch explícitas. Não iniciada automaticamente.

## Resultado final comprovado

- 13 testes isolados aprovados.
- Typecheck estrito dos cinco arquivos da camada: aprovado.
- npm run lint: reprovado pelos mesmos 21 diagnósticos, zero novos erros.
- npm run build: aprovado; aviso de bundle acima de 500 kB.
- git diff --check: aprovado.
- npm test: não executado, script inexistente.
- Sem dependências novas, I/O, persistência ou consumidores UI adicionados.
