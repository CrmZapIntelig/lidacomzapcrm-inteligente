# PILOT-MVP-01 — WhatsApp, Venda Ativa, Cardápio, Pedidos e Impressão

## Checkpoint e classificação

Retomada em 2026-10-06 (America/Sao_Paulo), a partir de `8d40a0ec2eee25f2e3300d50fef36c4e38f29a6a`. Branch `codex/unificacao-gestao-inteligente`, PR #4 draft; main `60fb91fdf048a8e0d4f9adc29a532be8bf4356dd`. Remoto inicial `cf2e3eb15d51f487a50614ff52b8d04c9e2aa6ba`; commits locais bbbefc1/8d40a0e preservados e publicação agora autorizada pelo controlador do piloto. Alterações pessoais não incluídas.

**PREPARATION ONLY / OFFLINE TEST IMPLEMENTED. Não é PILOT READY.** O piloto pago mínimo inclui pedidos de restaurante reais e impressão. Encaminhamento de seleção ao WhatsApp é contingência temporária, não critério final de conclusão. Nenhum novo checkout, cadastro, sender, listener, regra ou endpoint foi conectado à produção nesta preparação.

**PROD-ORDER-01 = PAUSED — PILOT PRIORITIZATION.** O canário canônico não foi executado, quota permanece 0/1 e flag DISABLED. O gate histórico de inventários permanece registrado para futura retomada; não habilitar APIs para resolvê-lo agora. META-01 pode avançar independentemente desse canário, conforme nova autorização. O Cloud Run de teste do AI/Agent Studio permanece descomissionado; não será recriado.

## Matriz de reaproveitamento

Fontes: código versionado em `src/components/PublicCardapioView.tsx`, `CardapioView.tsx`, `src/App.tsx`, `src/types.ts`, adapters e núcleos de aplicação. Nenhuma leitura de pedidos/clientes reais para construir esta matriz. URL histórica informada: `https://project-1300957a-ea82-4645-845.web.app/cardapio/m1`; não foi declarada URL aprovada ou publicação validada nesta fase.

| Capacidade | Público existente | Interno existente | Piloto mínimo | Posterior |
| --- | --- | --- | --- | --- |
| Catálogo | Lê todas as coleções cardapios/productsDigitalMenu; seleciona productIds | Administra os mesmos tipos e produtos | Uma fonte de catálogo; endpoint/projeção pública restrita por menu | Separação comercial SaaS completa |
| Tamanhos | Usa o primeiro tamanho; fallback `price || base` perde preço zero | Personalização e cálculo por tamanho | Seleção validada no servidor; preço zero preservado | Melhorias visuais |
| Adicionais/remoções/utensílios | Arrays vazios no carrinho atual | Personalização implementada | Reaproveitar UX interna no público; validar IDs/remoções pelo catálogo | Sem duplicar catálogo |
| Quantidade/observação | Carrinho simples | Personalização por item | Snapshot completo e limites | — |
| Modalidade | Entrega/endereço | Entrega e mesa no simulador | Entrega/retirada; contexto explícito | Mesa/QR completo |
| Pagamento | PIX/cartão/dinheiro declarados | Mesmos métodos | PENDING; sem inventar recebimento | NOTA real desabilitada, com gate próprio |
| Confirmação | Writes SDK sequenciais em deliveryOrders/clients/messages/history | Setters que chamam persistência App e efeitos CRM | Comando server-side atômico/idempotente e DeliveryOrder compatível | Integração canônica completa |
| Cliente | ID derivado de telefone; totalBought atualizado antes de pagamento | Busca por nome/telefone, fallback primeiro cliente | Identidade exata; dedupe transacional; sem fallback por nome | Conciliação explícita dos clientes legados |
| Pedido contextual | Ausente | Chat genérico usa OrderModal com produtos não gastronômicos | Mesmo catálogo/comando do público, cliente/contexto pré-preenchidos | Automação posterior |
| Central de pedidos | Sucesso local | Lista, detalhes, edição e transições de delivery | Consumidor de pedidos confirmados; ações autorizadas e revisionadas | KDS/delivery/caixa completos |
| Impressão | Sem renderer compartilhado | Modal 58mm e window.print em CardapioView | Renderer central pedido/comanda e CSS térmico; snapshot confirmado | Spooler/driver físico |
| Marketing/Venda Ativa | — | Contratos, eligibility e previews offline preservados | Individual/lote iniciado pelo operador, fila durável autorizada, opt-out | Marketing autônomo agendado |

Os setters do simulador interno **não são isolamento**: chamam handlers App e podem persistir. `handleFinalizeSimulatedOrder` usa ID aleatório curto, incrementa totalBought e registra mensagem/histórico; não reutilizar como executor seguro. `PublicCardapioView.handleSubmitOrder` também cria ID curto aleatório, aceita totais do carrinho e faz writes não atômicos. Retry pode duplicar pedido/estatísticas. `OrderModal` genérico não atende restaurante. Nenhum desses handlers foi alterado nesta preparação; todos continuam necessitando estabilização antes do piloto real.

## Arquitetura escolhida e implementação desta preparação

**Legado-first, DeliveryOrder compatível, comando server-side.** Catálogo existente → seleção de IDs/opções → revisão de versão → validação de preços no servidor → transação → pedido/identidade/idempotência/audit → leitura central → renderer puro. Público e atendente usam a mesma regra. Não escrever simultaneamente Order canônico/DeliveryOrder nem implementar nova operação paralela.

`src/application/pilotMenuCheckout.ts` implementa o núcleo puro: projeção de campos públicos do catálogo, validação de esquema e limites, menu ativo/revisão explícita, pertencimento do produto, tamanho único, opções permitidas, moeda em centavos, taxa do catálogo e modalidades entrega/retirada. O cliente não fornece preço, total, status, recebimento ou clientId. Preço/taxa desconhecidos ou catálogo divergente exigem nova revisão. A projeção pública é um DTO; **não há endpoint publicado** nem alteração nos getDocs atuais.

`services/staging/pilotCheckoutStore.ts` implementa port TEST injetando o `AtomicJsonPort` existente: IDs determinísticos por tenant/idempotencyKey, fingerprint estável, create-only lógico, replay com snapshot original mesmo após mudança posterior do catálogo, conflito explícito para mesma chave com payload diferente. Identidade TEST exata gera um cliente TEST por identidade dentro do agregado, inclusive em concorrência. Nenhum totalBought/lastPurchaseDate/SALE/RECEIPT/mensagem/KDS/caixa é gerado. O port valida flag/ambiente/tenant antes de qualquer acesso. Limites: 100 comandos/clientes e 256 KiB. Flag desabilitável e checada também no callback transacional.

Esta é uma **implementação TEST do contrato**, exercitada com atomic fixture; não é adapter operacional publicado nem probe Firestore novo. Não há factory cloud, credentials, SDK ou fetch neste port. Persistência Firestore transacional existente de ORDER-02 permanece intacta e com sua prova anterior; ela não comprova persistência cloud desta nova preparação. Não misturar o schema `PILOT_CHECKOUT_TEST_V1` com os envelopes ORDER-02/ingress existentes. Factory futura precisa namespace TEST próprio, migração versionada e probe autorizado; não há estrutura nova criada agora.

O snapshot guarda o DeliveryOrder legado e sidecar de origem/conversa/modalidade/revision/payment PENDING/received0/NOTA DISABLED. Retirada usa endereço vazio no legado e modalidade explícita no sidecar; consumidores delivery não podem tratar isso como endereço de entrega. `PEDIDO GERADO` é compatibilidade, não autorização para disparar cozinha. Ativar o fluxo real exige revisar consumidores/triggers antes da publicação. Deduplicação com **clientes legados reais** não foi provada: será necessária identidade confiável/índice por organização e reconciliação antes de escrita real. Cliente público não pode declarar posse de conversationId/identidade; endpoint futuro exige binding/autenticação e proteção antiabuso.

## Impressão centralizada

`pilotOrderPrint` converte snapshot TEST confirmado em PrintSnapshot do renderer existente `operationsFinance.renderPrintSnapshot`. Inclui restaurante, ID/data, cliente/modalidade, itens/tamanho/adicionais/remoções/utensílios/quantidade/observações, método de pagamento pendente, subtotal/taxa/total e endereço quando entrega. Renderer escapa HTML e acrescenta CSS térmico 80mm. Pedido e comanda não alteram status, produzem recebimento, venda, caixa, KDS ou mensagem. Continua DEMO/SIMULAÇÃO sem valor fiscal. Driver físico não implementado; diálogo `window.print` integrado ao consumidor real ainda pendente. Não declarar impressão física operacional pelo sucesso do renderer.

## Venda Ativa e políticas

`pilotPreparation.ts` reutiliza eligibility canônica, restringe WhatsApp Meta oficial, rejeita evidências ambíguas/contatos duplicados no mesmo endereço e incorpora opt-out explícito PARAR/SAIR/NÃO QUERO. Resposta comum não restaura consentimento. Seleção e preview são independentes de iniciar; preparação sintética exige ação do operador. O teto é o menor entre quantidade selecionada, saldo comercial, saldo provider conhecido e limite de risco. Saldo provider desconhecido bloqueia. Configuração prevê 10/25/50/100 e quantidade personalizada; plano comercial não supera provider/policies. Nenhuma queue real é criada por esse helper (`canSend=false`, `canEnqueue=false`).

A [política oficial WhatsApp](https://whatsappbusiness.com/policy/), consultada em 2026-10-06 e atualizada em 2026-09-23, exige consentimento e respeito ao opt-out. Início pela empresa depende de template aprovado; mensagens livres são permitidas dentro da janela de 24 horas da mensagem do usuário. O piloto deverá aplicar essas condições com fatos reais, além de escalonamento humano e privacidade. Aprovação offline de template não comprova aprovação Meta. Quotas comerciais e provider devem ser verificadas no momento da execução; limite numérico provider não foi inventado.

Fila autorizada de envio e execução por lote ainda dependem de provider/credenciais/allowlist/evidência real e **GATE_FIRST_REAL_SEND_READY**. Journal/lease/fencing/retry/audit existentes não autorizam outbound por estarem implementados. RCS DISABLED. Marketing autônomo continua requisito posterior.

## Meta — titularidade confirmada e revisão final do app

**Estado vigente2026-10-07:** reautenticação concluída; painel confirmou **App LidacomZapCRM /1480563193903800 / proprietário1694546150694544 / NÃO PUBLICADO**. Etapa WhatsApp Experimente oferece número TEST para até5 telefones; botão Continuar aceita novos termos WhatsApp Business/Cloud API Hosting e aguarda **GATE_META_TEST_TERMS_ACCEPTANCE_REQUIRED**. Nenhum destinatário/número/subscription/secret configurado ou mensagem enviada. Gate de autenticação resolvido. Checkpoints seguintes históricos; detalhes atuais em ../unificacao/META-01-inbound-staging.md.

**Checkpoint2026-10-07:** confirmação específica recebida e Criar aplicativo acionado uma vez. Meta abriu Digite sua senha novamente. **GATE_META_INTERACTIVE_LOGIN_REQUIRED**, criação ainda não confirmada. Autenticar diretamente no navegador; nenhuma credencial pelo chat, nenhum retry da criação. Revisão descrita abaixo registra a configuração submetida; o gate de confirmação anterior está resolvido. Ainda não há App ID/WABA/phone/secret comprovado criado. Estado detalhado em ../unificacao/META-01-inbound-staging.md.

O usuário confirmou **lidacomdigital / Business ID1694546150694544 / LIDACOM BUSINESS EVOLUTION** como proprietário do app principal SaaS **LidacomZapCRM**. Autenticação e GATE_META_SAAS_BUSINESS_PORTFOLIO_REQUIRED RESOLVIDOS. O portfólio não pertence ao Prato Mineiro: o restaurante é primeiro cliente piloto e deve manter seu próprio Business Portfolio, WABA, número e demais ativos. Futuro onboarding exige **GATE_PRATO_MINEIRO_OWN_META_ASSETS_ONBOARDING_REQUIRED**; não criar ativos do restaurante dentro da Lidacom.

Auditoria anterior: nenhum app visível/adicionado; portfólios144789471002545 e108180028128224 não selecionados. Conta existente **Lidacom Digital Agência**, asset1589099725538820, tipo Aplicativo WhatsApp Business, conta Aprovada/empresa Não verificada, não comprovada TEST Cloud API; **não selecionada nem reutilizada**. Nenhum telefone real consultado ou configurado nesta continuidade. Evidência sanitizada: `evidence/PILOT-MVP-01-meta-assets.json`.

Assistente oficial de criação preparado até **Visão geral**: nome LidacomZapCRM, caso de uso Conectar-se com clientes pelo WhatsApp, empresa lidacomdigital. UI permite conectar empresa não verificada, mostra nenhum requisito identificado atualmente e avisa que verificação será necessária para acesso a dados de outros portfólios/publicação. **Business Verification REJEITADA** permanece pendência própria, sem contorno, nova empresa ou tentativa de reverificação automática. Não confundir isso com aprovação da conta WhatsApp existente.

**GATE_META_APP_CREATION_CONFIRMATION_REQUIRED**: revisão final pronta, botão Criar aplicativo ainda não acionado. O botão cria recurso persistente e aceita Termos da Plataforma da Meta, Políticas do Desenvolvedor e termos aplicáveis. Confirmação na hora da ação conforme política de automação; nenhum App/WABA/test phone/subscription/secret criado. Somente recursos TEST oficiais autorizados após essa etapa; outbound DISABLED.

Documentação técnica atual de Cloud API/webhooks/subscriptions deverá ser verificada antes da configuração; consultas web oficiais tiveram429/inacessível e não foram tomadas como prova técnica atual. Receiver público mínimo e worker privado continuam arquitetura requerida, não configuração Meta concluída. Secret Manager server-side; zero secrets no Git/frontend/logs/chat. Próximos gates conforme necessidade: TEST phone/secret server-side, mensagem inbound TEST manual, primeiro outbound TEST explicitamente autorizado e deploy operacional.

## Segurança, rollout e prontidão

`config/pilot-readiness.json`: PILOT_WHATSAPP_ACTIVE_SALES/PILOT_ORDER_WRITES/PILOT_NOTA DISABLED; canSend false; Meta/RCS DISABLED; origem/menu aprovados null. A URL histórica do menu não se torna binding aprovado automaticamente. Builder de link exige origem HTTPS exata e menu aprovado; não usa origin do preview para link comercial.

SEC-PILOT-01 fez auditoria de listeners SDK, autenticação/claims, writes públicos e candidata de regras. **511/511 casos oficiais SUCCESS**, zero issues, source hash vinculado; não publicada. A candidata não é deploy ready nem corrige a regra global vigente. Detalhes, compatibilidade e gates em [SEC-PILOT-01-firestore-readiness.md](SEC-PILOT-01-firestore-readiness.md).

Antes de go-live: binding/recursos Meta corretos; inbound real; outbound TEST autorizado; número real autorizado; opt-out persistente; policy/consentimento; queue/idempotência/leases; read endpoint público restrito; autenticação/contexto/antiabuso; checkout server-side e cliente legado reconciliados; Orders center integrado sem efeitos financeiros indevidos; print ligado ao snapshot persistido; Rules compatíveis de menor privilégio; testes/probe/CI; publicação operacional com gate. KDS/fullCash/mesas/fullDelivery/RCS/SaaS completo/redesign não bloqueiam escopo mínimo, mas fluxos existentes são preservados.

Nenhuma produção write/deploy, alteração de billing/IAM/API, migração de dados, canonical canary, rollout ou envio real foi feito nesta preparação. Prévia integrada permanece offline/CSP connect-src none. Paleta Emerald/Gold preservada como direção, sem redesenho operacional.

## Validação e publicação

Testes abrangem opt-out/limites/links, catálogo restrito, checkout/preços/opções/quantidades, compatibilidade, versão, pagamento pendente, NOTA proibida, retry/restart/dedupe/concorrência/guard/capacidade e renderer sem side effects. `tools/pilot/pilot-safety.test.mjs` protege defaults, isolamento e candidata não ligada a deployment; suíte de 511 requests reproduzível em `pilot-rules-cases.mjs`, sem credenciais/chamadas cloud. CI inclui esse gate; testes TS novos entram nas suítes existentes.

Comandos: `node --test --import tsx src/application/pilot*.test.ts services/staging/pilot*.test.ts`; `node --test tools/pilot/pilot-safety.test.mjs`; cinco tsconfig strict existentes; check-messaging-safety/check-integrated-isolation/check-baseline; builds operacional/UNI-08/integrado/Functions. Resultado consolidado/SHAs/CI estão no ledger/evidência de fechamento. Push apenas branch autorizada; automação existente pode republicar **somente Hosting staging pr-4**, sem backend nem produção. PR permanece draft. Preparação publicada não equivale a piloto pago disponível.
