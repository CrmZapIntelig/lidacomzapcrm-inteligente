# ORDER-01 / OPS-01 — auditoria de readiness

Auditoria local do checkout iniciado em `2ff066280023ff9e2f8b527fee851a7619d8fcd0`. Não altera pedidos, UI, Firestore operacional, caixa, delivery ou adapters existentes. LidacomZapCRM permanece um produto único.

## Evidência e gaps

| Área | Implementado comprovado | Gap antes de escrita operacional |
| --- | --- | --- |
| Order CRM | `src/types.ts:153`: Pendente/Pago/Cancelado e meios legados | Não representa aprovação NOTA, recebimento separado ou produção |
| DeliveryOrder | `src/types.ts:868`: PEDIDO GERADO/PRODUÇÃO/PRONTO/EM ENTREGA/FECHADO | Endereço, taxa, modalidade e fulfillment não estão integralmente no Order canônico |
| Order canônico | `src/domain/types.ts:127`: CREATED/PAID/CANCELED, origem/canal/modo/Contact | Status financeiro não substitui os cinco estágios de delivery |
| Adapters | `src/domain/compatAdapters.ts:202` e `:232`: projeções com source preservado | Projeção não é comando de escrita, migração ou novo fluxo operacional |
| Pagamento | `compatAdapters.ts:354`: FECHADO → PAID | Fechamento de delivery não comprova recebimento; não conectar esse mapeamento ao caixa sem evidência financeira explícita |
| KDS/delivery | `src/components/CozinhaView.tsx` consome DeliveryOrder e estágios legados | Consumidores continuam legados; port operacional ainda não implementado |
| Atendente | `UX-OPS-approved-requirements.md`: novo pedido contextual e cadastros aprovados | Conversation → Contact → revisão → confirmação idempotente ainda não implementado operacionalmente |

Os fatos acima vêm do código acessível. Chats históricos sem transcrição verificável não foram tratados como evidência de execução.

## Sequência segura proposta

1. Definir um mapa explícito que mantenha separados estado comercial, pagamento/recebimento, produção e entrega. Preservar source legado e IDs com tenant; não criar um Order por canal.
2. Acrescentar contratos/ports de comando idempotente, snapshot de revisão, validação de Contact/Conversation e autorização. Implementar primeiro em memória, fixtures e testes; nenhum dual-write automático.
3. Projetar dados de modalidade, endereço, taxa, produto/preço e identidade legada sem perda; recusar entrada ambígua. Auditar concorrência, confirmação duplicada, edição, cancelamento e estorno.
4. Somente em fase específica ligar um port operacional existente aos consumidores KDS/Delivery/Caixa/Timeline, com plano de compatibilidade/rollback e autorização antes de dados reais/migração.
5. OPS-01 reutiliza essa operação consolidada: conversa → pedido com cliente pré-preenchido → produtos → modalidade → pagamento → revisão → confirmação. Abrir/cancelar formulário não grava pedido.

## Requisitos financeiros preservados

NOTA é venda a prazo: aprovação separada do pedido/pagamento; recusa permite trocar meio sem cancelamento automático. Total de Vendas inclui NOTA; dinheiro em gaveta exclui NOTA. Recebimento futuro quita o crédito e não cria segunda venda. Fechamento compara Esperado/Informado/Diferença por Dinheiro/PIX/Débito/Crédito/NOTA. Crédito, quitação e impressão centralizada permanecem requisitos, sem implementação financeira real nesta auditoria.

Emerald & Gold e protótipo AI Studio continuam referência UX; nenhum código do protótipo foi copiado e não houve redesign.

## Estado honesto

ORDER-01: **READINESS AUDITADO; integração operacional pendente**. OPS-01: **REQUISITOS APROVADOS; implementação operacional pendente**. Esta auditoria não promove adapters para operação completa. Próximos contratos podem ser feitos localmente; escrita real, migração, produção, merge e primeiro envio continuam gates humanos.
