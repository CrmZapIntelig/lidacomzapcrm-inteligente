# UNI-04 — Integração na camada de aplicação

Data: 2026-09-30. Projeto principal: LidacomZapCRM Inteligente.
Piloto: Restaurante Prato Mineiro.

## Baseline e checkpoint remoto

- Root Git: `C:/Users/dfant/LidacomZapCRM`.
- Branch: `codex/unificacao-gestao-inteligente`.
- HEAD inicial: `6a92a7824739e568b99fc3f195e342ff02244fb4`.
- Commits UNI-02/03 confirmados: `fd061c5` e `6a92a78`.
- Push inicial para origin realizado antes das alterações UNI-04.
- HEAD local e `origin/codex/unificacao-gestao-inteligente` após checkpoint:
  `6a92a7824739e568b99fc3f195e342ff02244fb4`.
- main local permanece em `60fb91fdf048a8e0d4f9adc29a532be8bf4356dd`.
- `.vscode/extensions.json` e `v1.9.8.4-local-backup.patch` preservados e excluídos.
- Lint inicial: 21 diagnósticos preexistentes nos três arquivos já documentados.

## Camada e coexistência

O projeto existente possui componentes, utils e lib, sem camada de aplicação
ou padrão de feature flags encontrado em src. Os utils atuais combinam regras
específicas e estado de simulação; não foram alterados para inserir novo fluxo.
`src/application/unifiedDomainFacade.ts` cria uma fronteira explícita separada
dessas rotinas e consome os adapters UNI-03, que permanecem intactos.
`unifiedDomainFacade` reúne operações puras sem estado ou inicialização automática.
Nenhuma tela foi conectada nesta fase. A API pode ser consumida por futuros módulos
sem que o legado deixe de funcionar. Não há feature flag porque o uso já é opt-in
por chamada; não foi criado framework nem alteração de comportamento padrão.

Projeções falham com `INVALID_INPUT` e motivo, sem derrubar o modo legado.
Esse resultado não significa que o documento original deva ser corrigido ou excluído.
Os campos source são referências ao registro original para rastreabilidade;
consumidores não devem mutá-las nem gravar a projeção em seu lugar.

## Operações

| Operação | Comportamento |
| --- | --- |
| getUnifiedContact | Adapter Client → Contact e identidades, preservando ID e source |
| getUnifiedConversation | Contexto de conversa explícito e projeções das mensagens via adapters |
| getMarketingCampaign | Campaign → MarketingCampaign; não cria dispatch |
| prepareDispatchCampaignDraft | Marketing + audiência + configuração explícitas → draft puro |
| getDispatchCampaignDraft | Consulta/cópia de draft fornecido em memória, sem armazenamento |
| getUnifiedOrder | Order legado → Order e itens pelo adapter UNI-03 |
| getUnifiedDeliveryOrder | DeliveryOrder → mesmo Order canônico |
| getUnifiedTimeline | HistoryEvent[] → TimelineEvent[] com fontes preservadas |
| getOpportunity | ABSENT sem evidência; projeção validada de Opportunity explícita |
| getFunnelBoundary | NOT_ACTIVATED, sem efeitos ou FunnelEngine executável |
| queryMessagingWindowPolicy | NOT_EVALUATED e canSend=false, mesmo com provider declarado |

### Contatos e canais

Tenant e data de observação são explícitos. Telefone internacional normalizado
pelo adapter; sem DDI resulta em INVALID_INPUT, sem inferir país. Ausência de
telefone mantém Contact.phone vazio e identidades vazias. Canal whatsapp não
gera RCS; canal ausente não gera identidade. `ambos` é indicação legada explícita
para duas identidades; não comprova capability. Availability permanece UNKNOWN.
Bloqueios/preferências permanecem na fonte e elegibilidade é projetada pelo adapter.
GOOGLE_RCS corresponde a RCS no contrato de canal e RCS_GOOGLE no provider;
nenhum provider ou disponibilidade é inventado.

### Conversas

Contexto exige ID da conversa, unreadCount, tenant e observedAt. Canal da conversa
é fornecido separadamente da origem Client.channel. Canal ausente retorna UNKNOWN.
Mensagens com canal explícito divergente são rejeitadas; o chamador deve separar
históricos mistos antes de projetar. Não há seleção automática nem migração.
Mensagens sem canal mantêm sua ausência no domínio. Um contato admite várias
conversas com IDs explícitos. Timestamps e anexos seguem as limitações UNI-03.

### Marketing e Dispatch

Marketing permanece QUEM/POR QUÊ. Consulta não gera dispatch nem altera contadores.
`prepareDispatchCampaignDraft` exige MarketingCampaign, DispatchAudience vinculada
ao mesmo tenant e marketing, ID operacional distinto, template, limite inteiro
positivo, routingMode e data explícita. Contatos duplicados/vazios são rejeitados.
Audience IDs são fornecidos pelo chamador; não há consulta externa de existência,
consentimento ou disponibilidade. Empty audience é draft vazio, nunca envio.
Draft mantém ligação marketingCampaignId, copia IDs e datas e declara:
queue NOT_CREATED e execution NOT_STARTED. Não cria DispatchQueueEntry.

DispatchAudience, DispatchQueue e DispatchExecution são fronteiras locais de
aplicação; não são entidades persistidas importadas da UNI-02. DispatchCampaign
e DispatchQueueEntry permanecem os contratos UNI-02. A consulta do draft disponibiliza
campanha, audiência e ausência de fila/execução real; não consulta backend.
Nenhuma dessas operações é admissão, elegibilidade de envio ou execução.

### Opportunity e funil

Client.stage/status não vira oportunidade. Sem evidência explícita: ABSENT.
Com Opportunity fornecida: valida ID, vínculo ao contato e estágio conhecido,
copia o objeto sem persistir. Tenant não foi adicionado ao contrato UNI-03;
isolamento e vínculo de oportunidade deverão ser definidos antes de armazenamento.
Estágios permanecem RASCUNHO, LEAD, EM_ATENDIMENTO, PEDIDO_GERADO,
AGUARDANDO_PAGAMENTO, PAGO, PRODUCAO, ENTREGUE, FECHADO e POS_VENDA.
Funnel boundary não ativa Event Bus ou efeitos. UI do funil permanece intacta.

### Pedidos e timeline

Pedidos mantêm IDs e modelos originais, com creationMode explícito e regras de
entryPoint/channel da UNI-03. Delivery exige modo válido adicionalmente na facade.
Mesma entidade Order serve chat, menu, POS, QR, manual e IA, sem tipos por canal.
Campos não representados permanecem source; datas e IDs sintéticos dos itens
delivery têm as mesmas limitações documentadas na UNI-03.
Timeline só projeta histórico fornecido; não apaga, grava ou publica eventos.

### Política de mensagens

Consulta recebe a fronteira UNI-03 acrescida de currentCapability opcional:
channel, provider, última entrada/saída, tipo, template, versão da regra,
capability e data de avaliação. Não calcula janela 24h ou valida provider.
Retorna sempre NOT_EVALUATED e canSend=false. Não aceita decisão permissiva
injetada nem libera envio por existência de provider/capability declarados.

## I/O, validação e limites

Nenhum fetch, axios, SDK, write Firestore, localStorage, fila persistente,
env, provider, webhook ou dependência nova. Apenas import de runtime dos adapters;
os demais imports na implementação são de tipos. Teste estrutural verifica a
implementação e os adapters para chamadas externas e imports de runtime inesperados.
Testes comportamentais usam objetos congelados para verificar ausência de mutação.

25 testes específicos de aplicação e 13 UNI-03, total 38, aprovados.
Typecheck estrito isolado da facade e testes (incluindo dependências locais): aprovado.
Um erro intermediário no helper de teste foi corrigido nesta entrega;
nenhum erro antigo foi corrigido. Lint global final e comparação de diagnósticos
registrados abaixo. Script npm test não existe; runner node --test com tsx usado.
Build aprovado com aviso conhecido de bundle maior que 500 kB; saída dos assets
da UI permaneceu igual, pois a facade ainda não é importada por componentes.

Comandos de validação:

```text
node --test --import tsx src/domain/compatAdapters.test.ts src/application/unifiedDomainFacade.test.ts
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler src/application/unifiedDomainFacade.ts src/application/unifiedDomainFacade.test.ts
npm run lint
npm run build
git diff --check
```

Riscos: source mantém referências legadas; projeções não são payloads de escrita.
Contratos reduzidos não preservam todos os campos em suas entidades novas.
Dados nacionais sem DDI exigem contexto numa fase futura. `ambos` não prova
disponibilidade. Audience fornecida não estabelece elegibilidade. Opportunity
não tem tenant no contrato atual. Política permanece não avaliada.

Firestore, layout, tipos antigos, UNI-03, Firebase config/rules e arquivos package
inalterados. Sem migração, envio, deploy, tag de produção ou merge em main.
Próxima fase recomendada: UNI-05, venda ativa offline com desenho de fila,
elegibilidade e idempotência. Não iniciada nesta entrega.

## Resultado final comprovado

- Lint final: 21 diagnósticos, todos preexistentes.
- Comparação pela API TypeScript, com/sem src/application: 21 → 21;
  zero diagnósticos novos ou removidos, comparados por arquivo, posição, código e mensagem.
- Testes: 38 executados e aprovados (25 aplicação + 13 UNI-03).
- Typecheck estrito: aprovado. Build: aprovado, aviso de bundle grande.
- Diff UNI-03, tipos, UI e package: vazio. git diff --check aprovado.
