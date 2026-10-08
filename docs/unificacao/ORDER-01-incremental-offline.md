# ORDER-01 / OPS-01 — fundação incremental offline

Data: 2026-10-03. Checkout único LidacomZapCRM, branch codex/unificacao-gestao-inteligente. HEAD inicial 29dd5e5f990b6f6ef6142312e9b248a63731fbae. Estado: **ADAPTER / OFFLINE IMPLEMENTADO**, demonstração OPS **VISUAL IMPLEMENTADO**; integração operacional não concluída.

## Auditoria antes da ligação operacional

Fontes: src/types.ts (Order/DeliveryOrder/ComandaLocal/CaixaSession), src/domain/types.ts, compatAdapters.ts, App.tsx handlers de pedidos/caixa/delivery, OrderModal.tsx, CardapioView.tsx, CozinhaView.tsx, CaixaView.tsx. Leitura local, sem consulta a dados Firestore. Os links históricos em FONTES-CHATS não forneceram transcrição verificada.

| Aspecto | Order legado | DeliveryOrder legado | Decisão incremental |
| --- | --- | --- | --- |
| Status | Pendente/Pago/Cancelado | PEDIDO GERADO/PRODUÇÃO/PRONTO/EM ENTREGA/FECHADO | Eixos distintos; não substituir status existentes |
| Pagamento | Pago é afirmação legada | FECHADO aciona registro de venda no caixa em App.tsx | Preservar handler; afirmação não cria prova de recebimento na nova camada |
| Produção | Sem estado dedicado | PRODUÇÃO/PRONTO | PREPARING/READY; estado desconhecido onde não há fato explícito |
| Entrega | Sem confirmação | EM ENTREGA/FECHADO | IN_TRANSIT/LEGACY_CLOSED; fechamento não fabrica entrega comprovada |
| Cancelamento | Cancelado explícito | Sem estado de cancelamento tipado | Não inventar cancelamento delivery; CRM preserva CANCELED |
| Origem | channel opcional | channel; QR mesa criado no CardapioView | CHAT/POS/DIGITAL_MENU/TABLE_QR via adapters existentes; origem ambígua exige opção explícita |
| Identidade | clientId | clientId/clientPhone | contactId explícito; conversation/contact/tenant coerentes para novas revisões |
| Itens | preço/quantidade | tamanhos/adicionais/utensílios/remoções/observação/subtotal | Snapshot integral preservado; OrderItem sozinho não suporta round-trip |
| Valores | total | subtotal/taxa/total | Não recalcular ou regravar fonte; comandos novos calculam centavos inteiros |
| Persistência | orders no Firestore operacional | deliveryOrders no Firestore operacional | Nenhuma escrita nova; port apenas memória SIMULATION |

O adapter antigo FECHADO→PAID permanece intacto para compatibilidade. `projectOperationalOrder` reaproveita esse adapter e cria uma visão de evidência conservadora (CREATED/UNKNOWN/LEGACY_CLOSED), com origem/coleção/snapshot explícitos. Não substitui a projeção anterior nem os consumidores. Mesmo ID em duas coleções não deve ser conciliado automaticamente; a referência à fonte inclui coleção, e a consolidação requer mapeamento explícito antes de qualquer port operacional.

App.tsx registra vendas de Order Pago e DeliveryOrder FECHADO; dedupe local usa orderId+source. currentBalance soma a venda independente do método. Fechamento legado soma dinheiro/cartão/PIX/notaFiado e compara saldo agregado, sem separação débito/crédito. Isso é um gap auditado; código preservado. Os novos cálculos não são aplicados retroativamente às sessões reais.

KDS consome DeliveryOrder e seus estados; Cardápio/QR gera DeliveryOrder, com dados de mesa nas notas. ComandaLocal é outro contrato legado e não prova uma persistência unificada. Chat usa OrderModal/handlers existentes; geração de texto/mensagem de pedido em App.tsx não foi acionada. Nenhuma mudança nesses componentes, coleções, caixa, KDS, delivery ou QR.

## Implementação e limites

`orderOperations.ts`: contexto explícito, revisão calculada em centavos, Order/OrderItem existentes, criação HUMAN_OPERATOR/CHAT, aprovação/recusa NOTA e troca de método sem cancelamento. Port de confirmação revisionada/idempotente, cópias independentes, escopo demo/SIMULATION. Nenhum SDK/network/storage. Revisão/cancelamento não confirmam; confirmação local não recebe dinheiro nem envia mensagem.

`operationsFinance.ts`: fatos SALE e CREDIT_RECEIPT separados, dedupe por fato, recusa conflito/segunda venda/recebimento sem NOTA/excesso. NOTA entra em venda e saldo a receber, não gaveta; recebimento futuro reduz crédito e adiciona método financeiro sem segunda venda. Fechamento exige valores manuais dos cinco métodos. Escopo: cenário fechado de vendas/recebimentos, sem sangrias, estornos, chargebacks ou limites de crédito reais. Não substitui a contabilidade operacional.

Impressão centralizada: snapshot versionado, renderer puro com escape HTML e sete tipos; sem driver/dispositivo/documento fiscal. UI exibe documento HTML gerado exclusivamente pelo renderer com escape de todos os campos, preservando CSP frame-src none; não executa scripts ou window.print. Integração de impressão física ainda pendente.

Cadastros: MemoryRegistrationPort para CLIENT/COURIER/PRODUCT/TABLE/PAYMENT_METHOD, namespace demo, tenant/tipo/revisão, sem backend. Não cria cadastros operacionais ou duplica identidades reais. Formulários completos, validações cadastrais comerciais e vínculo ao catálogo estão pendentes.

OPS preview: Conversas ou Pedidos → + Novo Pedido Demo → cliente/produto sintéticos pré-preenchidos → modalidade/pagamento → revisão → confirmação em memória. NOTA recusa permite trocar pagamento. Produto fixo ilustra o contrato; não é editor de catálogo completo. Cenário de fechamento é fixture independente, explicitamente separado das confirmações. Refresh/navegação descarta simulação. Preview continua OFFLINE, sem mensagens/dados reais.

## Próximo gate operacional

**GATE_OPERATIONAL_ORDER_PERSISTENCE_REQUIRED**: antes de ligar o port a orders/deliveryOrders/caixaSessions reais, é necessária autorização específica da integração operacional, com estratégia de atomicidade/idempotência entre coleções, fonte de pagamento, round-trip completo e rollback. Não fazer dual-write implícito. Port operacional, conciliação de IDs/status, reversão/estorno e consumidores KDS/Delivery continuam pendentes.

META-01 não depende desta autorização e permanece pausada no gate trusted-device. Primeiro outbound, produção e main continuam proibidos.

## Validação

Pre-flight: 153/153 testes e baseline 21→21. Novos testes verificam estados, revisão/contexto, idempotência/revisões, dinheiro inválido, NOTA, recebimento futuro, fechamento, escape de impressão e cadastros. Resultados finais e CI no EXECUTION-LEDGER.md. Comandos preservados: npm run build, build:offline, build:integrated-preview; execução integrada local em http://127.0.0.1:4180/.
