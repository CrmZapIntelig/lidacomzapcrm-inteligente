# UX-OPS — requisitos aprovados do LidacomZapCRM

Data: 2026-10-02. Fonte: controlador contínuo autorizado diretamente pelo usuário após PREVIEW-01. Classificação: REQUISITO APROVADO / IMPLEMENTAÇÃO OPERACIONAL PENDENTE. Registrar não significa ter implementado os fluxos. A referência Google AI Studio orienta UX; nenhum projeto, componente ou backend daquele protótipo foi importado.

## Um produto e uma operação

Evoluir o LidacomZapCRM preservado, usando os contratos/adapters já incorporados. Não construir operação paralela nem Order por canal. Fluxo futuro OPS-01: Conversation → Contact → Order canônico → KDS → Delivery → Caixa → Timeline. Antes de escritas operacionais: ORDER-01 deve auditar e fechar diferenças entre Order legado, DeliveryOrder e Order canônico, com mapa explícito de status, pagamento, produção e entrega. Não presumir que CREATED/PAID/CANCELED representam toda a operação.

## Ações contextuais na conversa

- + Novo Pedido;
- Editar Cliente;
- Ver Pedidos;
- Adicionar Nota;
- Criar Oportunidade;
- Timeline.

Adicionar Nota como anotação de atendimento e NOTA como venda a prazo são conceitos distintos; a interface deverá deixar o contexto claro. Não criar crédito por adicionar uma anotação.

Novo Pedido: conversa → cliente pré-preenchido → produtos → modalidade → pagamento → revisão → confirmação. O cliente deve derivar de vínculo Contact/Conversation validado, sem criar duplicações ou pedido real ao abrir o formulário. Cancelar revisão não grava pedido. Reenvio/retry da confirmação deve ser idempotente. São critérios de projeto para ORDER-01/OPS-01, não funcionalidades já entregues nesta fase STG.

## Cadastros operacionais

Novo Cliente, Editar Cliente, cadastro rápido em conversa, Novo Entregador, Editar Entregador, produtos, mesas e formas de pagamento. Reusar identidade/cadastros do CRM e adapters; validar compatibilidade e permissões antes de integrar consumidores. Preservar dados e operação existente, sem migração implícita.

## Impressão centralizada

Arquitetura proposta: uma fronteira de impressão com modelos/contexto versionados, renderer compartilhado e saída para impressão/exportação; não múltiplos sistemas desconectados. Tipos: Pedido, Comanda, Cozinha, Recibo, Abertura de Caixa, Fechamento de Caixa e Mesa/Comanda. O modelo deve derivar do mesmo snapshot operacional confirmado e manter identificação do documento. Impressão não cria venda, recebimento ou mudança de status. Seleção de impressora/compatibilidade entra em fase própria; nenhum driver/spooler foi configurado aqui.

## NOTA — venda a prazo

Termo visual oficial: **NOTA**. Não apresentar “FIADO” ao cliente. NOTA significa venda a prazo; crédito real exige fase específica, regras de autorização, limite e histórico, sem implementação financeira automática durante staging.

No pedido: cliente solicita NOTA → **NOTA — aguardando aprovação** → operador **ACEITAR NOTA** ou **RECUSAR NOTA**. Recusa permite trocar a forma de pagamento e não cancela o pedido automaticamente. Distinguir estado da aprovação de crédito, estado do pedido e estado do pagamento; não substituir status legados sem mapeamento aprovado.

No cliente: Nota habilitada/bloqueada, limite, saldo em aberto, compras em aberto e histórico. Esses campos são requisitos futuros e não uma alteração já aplicada ao Client/Contact ou às coleções atuais.

## Caixa, venda e recebimento

NOTA conta no **Total de Vendas** e não conta como dinheiro físico recebido em **Dinheiro em Gaveta**. Portanto venda e recebimento são fatos diferentes. Quitação futura registra recebimento/baixa de crédito e não uma segunda venda. Relatórios devem impedir dupla contabilização e correlacionar a quitação à venda original.

No fechamento, o operador informa manualmente Dinheiro, PIX, Cartão Débito, Cartão Crédito e NOTA. Para cada forma: **Esperado / Informado / Diferença**. NOTA é reconciliada como venda a prazo/saldo correspondente e não somada ao numerário da gaveta. Recebimento posterior entra no movimento financeiro do dia do recebimento, sem duplicar o faturamento da venda. A definição detalhada de lançamentos, estornos, pagamentos parciais, autorização e consistência transacional pertence à fase financeira específica.

Critérios futuros: pedido recusado conserva possibilidade de revisão; aprovação auditável; limites consistentes; crédito não recebido não aumenta caixa físico; recebimento futuro não cria venda nova; retry não duplica venda/recebimento; fechamento mostra diferenças por meio. Nenhum teste de dinheiro real ou concessão de crédito ocorreu neste registro.

## Direção visual aprovada

Emerald & Gold Luxury SaaS: #059669, #0D9488, #F59E0B, #064E3B, #134E4A, #18181B, #34D399, #FFFFFF. Direção registrada para backlog visual próprio. Preservar sidebar, densidade e fluxos existentes; não redesenhar a aplicação durante STG. Layouts/fluxos/nomenclatura/interações aprovados são requisitos, não prova de funcionamento real.

## Sequência e gates

Continuidade local 2026-10-03: ORDER-01/OPS-01 possuem agora fundação offline e demonstração no preview integrado (ORDER-01-incremental-offline.md). Pedido contextual com produto fixture, modalidade/pagamento/revisão/confirmação em memória; NOTA aceita/recusada com troca de pagamento; contabilidade pura de venda versus recebimento; fechamento manual de cinco métodos; contrato central de impressão e cadastros demo. Isso não implementa crédito, cadastro completo, impressão física ou operação real. Ações contextuais restantes (edição do cliente, pedidos, anotação, oportunidade/timeline operacional) continuam backlog, preservando implementações anteriores. Paleta registrada, sem redesign operacional.

STG-01 → STG-02 → STG-03 → ORDER-01 → OPS-01 → UX-OPS → Messaging Canary. UX-OPS é registrado agora; implementação após bases operacionais. A ordem só muda com justificativa técnica documentada. Meta e RCS permanecem DISABLED. Primeiro envio exige GATE_FIRST_REAL_SEND_READY, mesmo para TEST. Crédito real, clientes reais, migração operacional, produção e merge têm autorização/gates próprios.
