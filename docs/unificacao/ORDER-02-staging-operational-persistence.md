# ORDER-02 — persistência operacional controlada em staging

Data: 2026-10-03. Produto único LidacomZapCRM. HEAD inicial: 6f4ac41c863fb8fabb3719a30adc30c641d7eff4; branch codex/unificacao-gestao-inteligente, PR #4 draft; main 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd.

## Escopo autorizado e estado

Persistência Firestore **STAGING READY somente TEST**, comprovada por probe real no projeto **lidacomzapcrm-staging**, database `(default)`. Nenhuma escrita em project-1300957a-ea82-4645-845. Não é integração operacional de clientes/pedidos/caixa reais. META-01 permanece pausada em GATE_META_TRUSTED_DEVICE_REQUIRED, sem tentativas novas.

## Arquitetura e schema

Revisão/snapshot → OperationalCommand → OperationalOrderPersistencePort → StagingOperationalOrderStore → AtomicJsonPort → FirestoreAtomicJsonPort → StagingFirestoreHttp. Núcleo puro em src/application, sem Firebase SDK, credentials, network ou storage. Port servidor e HTTP existentes foram estendidos com namespace fechado; namespace default do ingress não mudou. Nenhum segundo journal/worker/provider.

Coleção única **stg_operational_orders**. Documento por tenant TEST, chave SHA-256 de tenant+account lógico 200. Aggregate schema=1 com records, command cache/tombstones, events, audit, projections e cash. Pedido, resultado idempotente, eventos, auditoria e projeções são commitados juntos. Isso evita dual-write entre coleções e fornece projeções KDS/Delivery/Caixa TEST no mesmo snapshot transacional. Não são listeners ou sessões operacionais reais.

Limites intencionais: 30 pedidos, 300 comandos/eventos/audit, 256 KiB por tenant; 20 itens/pedido e opções limitadas. Não é desenho validado para volume de produção; requer particionamento/índices/retenção em fase futura. AtomicJsonPort preserva limites anteriores do ingress e utiliza até cinco tentativas de transação em conflito HTTP409; callback sem efeitos externos.

Snapshot reutiliza o **Order canônico existente**, acrescentando revisão e evidência operacional: customer/contact TEST, Conversation opcional vinculada, origem/canal/creationMode, modalidade, itens com tamanho/preço unitário/adicionais/remoções/utensílios/observação/quantidade/subtotal, taxa/desconto/total em centavos, endereço TEST/mesa, estados financeiros/NOTA/produção/entrega, timestamps e legacy refs com coleção+ID. Não cria Order por canal. Dados e campos desconhecidos são recusados; nomes/endereço/textos aceitam vocabulário fechado Demo/TEST/Exemplo. Telefone real não existe no schema; projeção delivery usa string TEST.

## Flag e guards

**OPERATIONAL_ORDER_WRITES=DISABLED por padrão**, representado por operationalOrderWrites ausente/DISABLED. Config exemplo versionada mantém DISABLED. Apenas chamada server-side explícita com appEnv=staging, projectId=lidacomzapcrm-staging, operationalOrderWrites=TEST_ONLY e tenant/actor/order/command/evidence IDs demo-TEST-* é aceita. Guard executa antes da construção HTTP, resolução de credencial ou write. HTTP permite exclusivamente o namespace selecionado; instância do ingress não pode escrever no namespace de pedidos e vice-versa. Qualquer projeto operacional, production, namespace comum orders ou flag desconhecida falha fechado.

Nenhum endpoint novo ou secret/credential foi publicado. Functions/STG-03 continuam privadas, sintéticas e sem ligação com este port; preview permanece backend NONE/CSP connect-src none. Nenhuma flag global/runtime operacional foi habilitada. Host do probe habilitou TEST_ONLY apenas no processo de teste e no tenant sintético exclusivo. Sessão Firebase nova/fresh-config e preload de logs seguros; nenhuma sessão antiga, login:list, chave JSON, token versionado ou raw auth log.

## Comandos, idempotência e concorrência

CREATE/UPDATE/CONFIRM/CANCEL/CHANGE_PAYMENT/NOTA_APPROVE/NOTA_REJECT/RECEIVE/REFUND/PRODUCTION/DELIVERY/ROLLBACK_TEST. GET e snapshot para leitura. commandId+idempotencyKey+tenantId+orderId+expectedRevision+actor TEST+timestamp obrigatório. Fingerprint SHA-256 sobre JSON ordenado, incluindo revisão/contexto. Mesmo comando retorna resultado lógico original, sem novo evento/audit/revisão; alteração de payload/key/actor conflita. Mesmo pedido por outro comando CREATE não sobrescreve. Resultados e snapshots são copiados; alterações do chamador não afetam armazenamento.

Transação Firestore lê e valida agregado antes do commit. Dois operadores com a mesma revisão não podem confirmar/editar/pagar/cancelar/aprovar silenciosamente; um vence e o outro exige nova revisão. IDs de evidência financeira não podem reaparecer em outro comando. Corrupt schema/contexto/revisão/snapshot/audit causa erro, nunca reset automático. Identidade, origem e legacy refs não são reatribuídas pela edição. UPDATE exige pedido DRAFT e novo snapshot revisado, sem estados financeiros forjados.

Leituras e retry podem executar commit físico do mesmo agregado, pois a port existente é transacional read-modify-write. **Idempotência é lógica**: não adiciona pedido/venda/receipt/audit/revisão. Não se afirma ausência absoluta de writes faturáveis no Firestore. Não há ação de mensagem, pedido operacional ou caixa real.

## Estados e contabilidade

| Eixo | Estados implementados |
| --- | --- |
| Pedido | DRAFT / CONFIRMED / CANCELED |
| Pagamento | PENDING / RECEIVED / REFUNDED; método separado, evidência TEST explícita |
| Produção | WAITING → PREPARING → READY |
| Delivery | NOT_APPLICABLE → READY → ASSIGNED → IN_TRANSIT → DELIVERED |
| NOTA | NOT_REQUESTED / REQUESTED / APPROVED / REJECTED / OPEN / PARTIALLY_PAID / PAID / VOIDED |

Confirmar emite **SALE** uma vez. Não presume recebimento. NOTA precisa aprovação; confirmação abre crédito. Recusa mantém DRAFT e permite troca de método, sem cancelar. Quitação parcial/final emite **CREDIT_RECEIPT**, reduz saldo aberto e não emite outra SALE. RECEIPT registra recebimento de outros métodos; PAID canônico exige total recebido explícito. CANCEL sem recebimento/progressão é permitido; venda anteriormente confirmada recebe SALE_VOID, sem apagar seu histórico. Cancelamento depois de recebimento/produção/entrega ou refund exige reconciliação e é bloqueado. REFUND implementado somente integral de pagamento não-NOTA, com evidência distinta; estorno de crédito e refund parcial continuam gaps explícitos.

Cash TEST persistido projeta vendas líquidas, recebimentos por método, saldo NOTA e gaveta. Função de fechamento usa eventos persistidos, fundo inicial e movimentos TEST fornecidos ao consumer: **fundo + receipts dinheiro + suprimentos − sangrias**. PIX/cartões/NOTA não entram em gaveta. Fechamento exige cinco valores manuais: Dinheiro/PIX/Débito/Crédito/NOTA, com esperado/informado/diferença. Fundo, suprimentos/sangrias e contagem são entradas do consumer TEST de fechamento; **não são sessões de caixa duráveis próprias nesta fase**. Não há rotina de fechamento real, calendário financeiro ou relatório fiscal.

## Projeções e round-trip

Envelope TEST versionado contém snapshot completo, projeção Order legado, KDS e Delivery. KDS: WAITING→PEDIDO GERADO, PREPARING→PRODUÇÃO, READY→PRONTO. Somente CONFIRMED entra no KDS TEST. Delivery exige sequência explícita e entregador demo; DELIVERED pode projetar FECHADO, mas continua com financialState separado. FECHADO nunca produz PAID/receipt na nova lógica. Adapter legado anterior permanece intacto.

NOTA não existe nos tipos legados; projeção legada correspondente retorna null + LEGACY_PAYMENT_UNSUPPORTED, sem coerção para dinheiro/cartão. Débito do Order CRM também exige gap explícito; Delivery distingue débito/crédito no snapshot embora seu campo antigo seja Cartão. Desconto/contexto/estados demandam sidecar, identificado em legacyGaps. A projeção legada sozinha **não** é round-trip suficiente. O reader TEST exige envelope completo e restaura datas; testes também passam por serialização JSON. Preço/itens/total/origem/cliente/modalidade/pagamento/produção/entrega/NOTA/refs permanecem no snapshot. Consumers operacionais antigos não foram ligados a esses envelopes.

Impressão usa renderer central puro do snapshot TEST persistido; não muda estado, não tem driver e não é documento fiscal. MemoryRegistrationPort permanece local; nenhum cadastro real portado.

## Auditoria e rollback

Mutação aplicada registra commandId, actor TEST, orderId, tenant, operação, previousVersion/newVersion/revision, timestamp e resultado. Audit sanitizado só metadata/valores TEST, sem customer/address/body/tokens. Não há logs de payload. Replays não duplicam audit. Falhas lançam código explícito ao caller; não são gravadas como mutation APPLIED.

Rollback TEST com revisão correta remove somente o pedido selecionado, seus eventos financeiros ativos e projeções; preserva outras fixtures, audit e cache com tombstone. Retry antigo recebe ORDER_COMMAND_ROLLED_BACK, evitando ressurreição; novo commandId pode recriar fixture e reprocessar projeções. O documento de teste mantém metadados/cache histórico; zero pedidos ativos não significa collection apagada.

Procedimento: interromper consumer TEST/desabilitar store via disable() ou remover TEST_ONLY; consumidor operacional já permanece no legado. Para limpeza, invocar host autorizado com TEST_ONLY exclusivamente no tenant/ID criado pelo probe e executar ROLLBACK_TEST com revisão atual; depois desabilitar novamente. Não usar delete em coleção, reset geral ou recurso operacional. Audit/reprocessamento são transacionais, sem nova venda por retry. Nenhuma mudança de rules/IAM/billing/infra.

## Prova e validação

Pre-flight: 164/164, baseline 21→21, HEAD/main/PR draft/CI confirmados. Novos 18 testes: CRUD/retry/restart, confirmação/edição/cancelamento/pagamento/NOTA concorrentes, estado/refund/evidência, round-trip JSON/projeções, caixa, rollback, flag/environment/project/path rejeitados, campos reais/desconhecidos, impressão e ensaio integral do probe. Conjunto local **182/182**, stricts/AST/isolation e quatro builds verdes; evidências finais/CI no ledger.

Probe real: create/read/restart/retry, concorrência confirm/update, SALE/CREDIT_RECEIPT, round-trip, KDS/delivery sem pagamento implícito, fechamento financeiro TEST, rollback/recreate e flag-disable **PASS**. Projeto lidacomzapcrm-staging, namespace stg_operational_orders, restante **zero pedidos ativos** após rollback. Relatório sanitizado em evidence/ORDER-02-staging-probe.json. Nenhum envio, dado real ou produção. Processo não habilita endpoint ou consumer.

Fontes oficiais consultadas em 2026-10-03: [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) e [REST commit](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/commit). Fundamentam a transação/commit atômico; resultados da implementação vêm dos testes/probe, não apenas da documentação.

## Próximo gate obrigatório

**GATE_OPERATIONAL_PRODUCTION_WRITE_REQUIRED** — primeira escrita real em orders/deliveryOrders/caixaSessions. ORDER-02 comprova somente persistência e consumidores TEST limitados. Não ultrapassar este gate automaticamente. Antes de produção: IAM/runtime de pedidos dedicado, sizing/particionamento/retention, regras reais de crédito/autorização/refund/reconciliação, round-trip dos consumers reais, sessões de caixa duráveis e plano de rollout/rollback aprovados. Não merge main, deploy produção, migration/dual-write real ou outbound.

Fechamento retomado em 2026-10-04: evidência final do probe de 2026-10-03T19:48:41.499Z, posterior à última alteração funcional. Nenhum novo probe ou recurso cloud no fechamento; pedidos ativos restantes: zero, metadados de auditoria/cache preservados. Publicação e CI registradas no EXECUTION-LEDGER.md.
