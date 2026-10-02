# Estado canônico da unificação — LidacomZapCRM

Auditoria corretiva de 2026-10-01, solicitada antes de qualquer staging. Checkout: C:/Users/dfant/LidacomZapCRM. Branch: codex/unificacao-gestao-inteligente. HEAD auditado: ad30da8e657723c4a9da6cf913c235078c169ba4.

## Um único projeto

### STG-02 — persistência staging comprovada / STG-03 billing gate

| Capacidade nova comprovada | Fase | Estado | Limite/gap |
| --- | --- | --- | --- |
| Hosting do preview integrado isolado | STG-01 | STAGING READY / VISUAL IMPLEMENTADO | Backend NONE; não é SPA operacional |
| Persistência servidor somente fixtures TEST | STG-02 | STAGING READY limitado | Aggregate bounded, sem inbound/cliente real |
| Endpoint HTTPS e worker cloud | STG-03 | STAGING PENDENTE | Billing/Blaze gate; não provisionados |

Firestore default separado em southamerica-east1, Standard/freeTier=true e billing=false. Ports assíncronas reaproveitam regras do journal local: admissão/idempotency/fila/claim/lease/fencing/retry/failure/crash recovery e projeção+draft/audit atômicos. Probe real exclusivamente fixtures TEST no staging passou; regras fechadas publicadas. Oito testes locais adicionais. STAGING READY **somente persistência de fixtures limitada** (200 work/1000 audit/256 KiB); nenhum claim de volume operacional ou inbound real. Firestore em React/preview continua ausente; backend do preview NONE.

STG-03 não provisionada: Functions HTTPS exige Blaze, ausente. **GATE_STAGING_BILLING_REQUIRED**. Não foi habilitado billing nem recurso pago; webhook público e worker cloud ausentes. Providers DISABLED, zero mensagens, main/operacional intactos. ORDER-01/OPS-01/UX-OPS continuam backlog aprovado. Fontes e limites: STG-02-durable-staging-persistence.md e STG-03-webhook-worker-gate.md. Resultados finais de testes/CI e SHAs no ledger. As seções datadas anteriores são registros históricos.

### Estado mais recente — STG-01 autenticada (2026-10-02)

STG-01 concluída: projeto isolado lidacomzapcrm-staging / 854899277909, billing=false, default operacional preservado. Hosting exclusivo dist-integrated/pr-4 em https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app ; CSP sem backend. CI push 37076090694 e PR 37076094664 success em d1c4db2, incluindo deploy federado comprovado. IAM/WIF limitado ao staging/PR #4, sem chave duradoura. Reautenticação nova em cache privado, sem usar sessão anterior. Integrações operacionais continuam bloqueadas; o mapa histórico abaixo não é promovido por hospedar o preview.

LidacomZapCRM reúne a operação original preservada e a arquitetura/funcionalidades do Gestão incorporadas ao LidacomZapCRM. Os arquivos novos de domínio, aplicação, preview e serviços pertencem ao CRM unificado; não são um segundo sistema nem contratos descartáveis.

C:/Users/dfant/lidacomzap-gestao-inteligente é o repositório histórico LidacomZap Gestão Inteligente, utilizado para auditoria e recuperação seletiva. Sua condição histórica não reduz o que já foi incorporado ao CRM a mera referência. Esta auditoria não editou nem retomou desenvolvimento naquele repositório.

Nenhum commit UNI/LIVE foi resetado, renomeado ou revertido. A numeração executada é preservada; o mapa abaixo relaciona capacidades, não tenta reescrever o roadmap histórico.

## Classificação

CONTRATO: declaração de domínio. ADAPTER: projeção compatível de modelo legado. OFFLINE IMPLEMENTADO: comportamento executável local/sintético. VISUAL IMPLEMENTADO: demonstração isolada dessa capacidade. STAGING READY: integração externa isolada comprovada. LIVE READY: requisitos reais e autorização de canário comprovados. OPERACIONAL COMPLETO: fluxo operacional integrado e validado.

As classificações podem coexistir. Neste estado, nenhuma capacidade nova é declarada STAGING READY, LIVE READY ou OPERACIONAL COMPLETO. PREPARATION não equivale a essas três condições.

## Mapa de capacidades e roadmap

| Capacidade | Roadmap original | Fase/commit real | Status comprovado | Gap restante |
| --- | --- | --- | --- | --- |
| Contact/ChannelIdentity e Omnichannel | UNI-04 Omnichannel Core | UNI-02 fd061c5; UNI-03 6a92a78; REC-01 7abdd0f | CONTRATO, ADAPTER, OFFLINE IMPLEMENTADO | Consumidores operacionais, identidade persistida/concorrente e capability real |
| Conversation/Message | UNI-04 Omnichannel Core | UNI-02/03; UNI-04 3fbadec; LIVE-00 ed493ba | CONTRATO, ADAPTER, OFFLINE IMPLEMENTADO, VISUAL IMPLEMENTADO na UNI-08 | Conversas operacionais ainda legadas; inbound real não conectado |
| Camada de aplicação compatível | UNI-04 Omnichannel Core | UNI-04 3fbadec | ADAPTER, OFFLINE IMPLEMENTADO | Fachada opt-in não substitui consumidores legados |
| Eligibility | UNI-05 Venda Ativa | REC-01 7abdd0f; UNI-05 6389d42 | CONTRATO, OFFLINE IMPLEMENTADO, VISUAL IMPLEMENTADO | Consentimento/capability/policy com evidência real e persistência |
| Dispatch Queue, daily budget e idempotência | UNI-05 Venda Ativa | REC-01 7abdd0f; UNI-05 6389d42 | CONTRATO, OFFLINE IMPLEMENTADO, VISUAL IMPLEMENTADO | Fila/budget/intenção outbound transacionais distribuídos, quotas reais |
| Drafts e Venda Ativa | UNI-05 Venda Ativa | UNI-05 6389d42; UNI-08 949a77b | OFFLINE IMPLEMENTADO, VISUAL IMPLEMENTADO | Execução operacional autorizada; drafts não enviam |
| MarketingCampaign → DispatchCampaign | UNI-06 Marketing | UNI-02/03; UNI-06 db0b8ec | CONTRATO, ADAPTER, OFFLINE IMPLEMENTADO, VISUAL IMPLEMENTADO | Handoff persistido e ligação às campanhas operacionais |
| Opportunity, eventos e Timeline | UNI-07 Funil/Event Bus/Timeline | UNI-02/03/04; UNI-07 73a1f88 | CONTRATO, ADAPTER, OFFLINE IMPLEMENTADO, VISUAL IMPLEMENTADO | Bus genérico, persistência e handlers operacionais; estágio de Client não vira Opportunity automaticamente |
| Order canônico e OrderItem | UNI-08 Pedidos unificados | UNI-02 fd061c5 | CONTRATO | Não é o modelo usado por toda a operação |
| Projeções Order/DeliveryOrder | UNI-08 Pedidos unificados | UNI-03 6a92a78; UNI-04 3fbadec | ADAPTER, OFFLINE IMPLEMENTADO | Escritas, status de produção/entrega, telas e storage não migrados |
| Preview dos domínios incorporados | Visualização transversal; não substitui Pedidos unificados | UNI-08 949a77b; fechamento 62cfde5 | VISUAL IMPLEMENTADO | Cenário sintético de Venda Ativa; não é uma UI completa de pedidos canônicos |
| Meta provider boundary | UNI-09 Gateway/Worker/Inbound; UNI-10 Integrações reais | LIVE-00 ed493ba; LIVE-01 818e7c2 | CONTRATO, OFFLINE IMPLEMENTADO | Sem transporte conectado; credenciais/configuração da conta e staging não comprovados |
| Inbound e projeção idempotente | UNI-09 Gateway/Worker/Inbound | LIVE-00 ed493ba; LIVE-02 9ff2c12 | CONTRATO, OFFLINE IMPLEMENTADO | Endpoint público autorizado, subscription e store distribuído |
| Ingress/journal/worker | UNI-09 Gateway/Worker/Inbound | LIVE-02 9ff2c12 | OFFLINE IMPLEMENTADO | Loopback/MOCK e journal sintético; não é worker operacional cloud |
| Janela de mensagens e templates | UNI-10 Integrações reais | LIVE-00 ed493ba; serializer LIVE-01 818e7c2 | CONTRATO, OFFLINE IMPLEMENTADO | Evidência real, templates aprovados/verificados e integração explícita à operação |
| Automações/respostas automáticas | Venda Ativa/integrações, sem fase exclusiva no mapa fornecido | LIVE-00 ed493ba; LIVE-02 9ff2c12 | OFFLINE IMPLEMENTADO | Somente draft com escalonamento humano; não há auto-send nem integração de regras operacionais ao worker |
| Canary e receipts | UNI-10 Integrações reais | LIVE-03 5c1c531 | CONTRATO, OFFLINE IMPLEMENTADO | Um TEST/uma mensagem apenas revisável, canSend=false; nenhum canário real |
| RCS provider boundary e fallback | UNI-04 Omnichannel Core; UNI-10 Integrações reais | REC-01 7abdd0f; LIVE-04 b5f7e91 | CONTRATO, OFFLINE IMPLEMENTADO | DISABLED; agente, capability real, protocolo, credentials, webhook e canário ausentes |

Os SHAs abreviados resolvem no histórico local da branch. Commits documentais e correções de CI permanecem no log e no EXECUTION-LEDGER.md.

## Pedidos — status exato

`src/domain/types.ts` contém Order com id, tenantId, contactId, entryPoint, channel, creationMode, total, status, paymentMethod, createdAt/updatedAt e vínculos opcionais de conversation/dispatch/queue. OrderItem é separado. Status canônicos atuais: CREATED, PAID e CANCELED.

`src/domain/compatAdapters.ts` contém adaptCrmOrderToDomainOrder e adaptDeliveryOrderToDomainOrder. Preservam ID, total e referência à fonte; projetam itens. Origem delivery/balcão/mesa QR/chat é mapeada para entryPoint; origem desconhecida exige fallback explícito. Pago vira PAID, Cancelado vira CANCELED e FECHADO do delivery vira PAID na projeção atual. Item de delivery calcula preço unitário por subtotal/quantidade. A fachada `getUnifiedOrder`/`getUnifiedDeliveryOrder` oferece consumo opt-in e valida modo de criação, sem writes ou migração de fonte.

`src/App.tsx` continua importando Order de `src/types.ts`, mantendo orders e deliveryOrders separados e listeners Firestore próprios. Nenhum consumidor de App/componentes foi ligado à fachada canônica. Logo: contrato e projeções implementados; pedidos unificados operacionalmente incompletos.

Faltam desenho e validação explícitos da equivalência de status de produção/entrega/pagamento, identidade/vínculos, estratégia de persistência e compatibilidade, handlers de escrita, consumidores de caixa/cozinha/delivery/menu/QR/chat e testes do fluxo completo. Não substituir FECHADO/PRONTO ou outros estados legados apenas por existirem três status canônicos.

## Omnichannel — status exato

Contact/ChannelIdentity, canais, Conversation e routing foram incorporados e são exercitados localmente. O inbound pode projetar um contato com conversas separadas por canal/provider e rejeita tenant/binding/identidades ambíguas. Elegibilidade e capability UNKNOWN permanecem bloqueadas. Isso não demonstra inbox operacional compartilhada, sincronização real de canais ou disponibilidade RCS de destinatários.

## Gateway/worker/inbound — status exato

Os módulos vivem em `services/messaging` e `src/application`, dentro do CRM. Há normalização Meta, verificação de assinatura/challenge, runtime explicitamente iniciado em loopback, admissão antes do ACK, journal sintético local, dedupe/restart/replay, lease com fencing/backoff e projeção + draft atômicos no arquivo local. O journal recusa LIVE/STAGING e identidades fora do namespace sintético. Não há SDK Firestore ligado ao worker, store distribuído, endpoint público provisionado ou worker cloud operacional. Importar módulos não inicia listener nem envio.

## Janela, automações e respostas automáticas

`messagingPolicy.ts` implementa avaliação conservadora da janela de 24 horas a partir de inbound verificado, bloqueios/opt-out/consentimento e templates vinculados à evidência/modo. Outbound não renova a janela. Mesmo policy permitida retorna canSend=false. A consulta antiga da fachada UNI-04 conserva NOT_EVALUATED; não foi silenciosamente ligada à policy nova.

`prepareAutoReplyDraft` e o worker sintético preparam somente DRAFT, com contexto e escalonamento humano. Regras de automação existentes do CRM foram preservadas, mas sua presença não comprova scheduler, geração automática live ou ligação ao novo worker. Não existe envio automático nesta preparação.

## WhatsApp — status exato

Meta boundary server-only existe no CRM: serializer conservador de texto/template, HMAC raw, challenge, normalização inbound/status e classificação de erros. DISABLED é padrão; MOCK não inventa entrega. STAGING/LIVE continuam bloqueados antes do transporte. Receipt exige mensagem outbound explicitamente vinculada; READ não fabrica SENT/DELIVERED e REPLIED exige context.id correlacionado. São regras/testes locais, não recibos reais recebidos nesta execução.

## RCS — status exato

Boundary server-only DISABLED. Capability fornecida exige tenant/agente/destinatário/modo/fonte/data coerentes; drafts de texto/rich card/suggested replies existem somente em MOCK. São objetos internos, sem serialização Google validada. Fallback prepara no máximo um canal e recusa duplicação após ACCEPTED/UNCERTAIN. Não há agente, consulta remota, credentials, transporte, webhook RCS ou scraping.

## CRM original preservado e working tree

A comparação `git diff a69aba9 HEAD -- src/App.tsx src/components src/lib src/types.ts` não apresenta alterações: esses arquivos mantêm o estado anterior à UNI-02. A branch já incluía trabalho de campanhas anterior à unificação; diferença contra main não deve ser confundida com regressão UNI/LIVE. A operação existente de UI/Firestore/pedidos/delivery permanece no CRM. Isso comprova preservação de código nesse recorte, não auditou documentos remotos ou toda a operação em produção.

Working tree inicial: .vscode/extensions.json modificado; AGENTS.md, docs/FONTES-CHATS.md e v1.9.8.4-local-backup.patch não rastreados. São alterações preexistentes, preservadas e excluídas desta correção. Não havia novos arquivos/configuração de staging deixados pelo último prompt. staging.example.json é um exemplo DISABLED versionado na LIVE-02, não um ambiente criado.

Não foi encontrada orientação no código preparado para manter um segundo sistema Gestão funcional fora do CRM. Referências históricas no ledger/gates designam a origem auditada; as implementações presentes pertencem ao CRM. O cabeçalho do ledger foi alinhado ao nome principal LidacomZapCRM, preservando textos e nomes históricos de commits/repositórios.

## Verificação e decisão

PR #4 verificado: draft=true, merged=false, auto_merge=null, head ad30da8, base main 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd. Refs remotas confirmam a branch e main nesses SHAs. Nenhuma main foi alterada nesta execução.

Validação atual: 119 testes aprovados (117 módulos/cenário + 2 isolamento), strict servidor/núcleo/preview aprovados, baseline global 21 → 21 com mesmas assinaturas, verificação AST aprovada e ambos builds aprovados. O build operacional mantém o aviso preexistente de chunk acima de 500 kB. Nenhuma verificação fez chamadas reais ao provider ou ao Firestore.

Alguma regressão encontrada? **NÃO no escopo auditado**: código/testes e preservação de arquivos operacionais. Não é certificação de produção.

Algum rollback necessário? **NÃO**. Correção de contexto/documentação somente; nenhum arquivo removido ou implementação revertida.

Nenhum staging, credencial, envio, merge ou deploy foi criado/executado. A auditoria corretiva termina antes de retomar qualquer configuração externa. GATE_STAGING_PROJECT_REQUIRED e GATE_OUTBOUND_CANARY_REQUIRED continuam vigentes; este pedido não os autoriza.

Fontes utilizadas: código atual, histórico Git, docs UNI/REC/LIVE e ledger. docs/FONTES-CHATS.md informa que os chats vinculados não forneceram transcrição verificável; nenhum conteúdo desses links foi inferido nesta auditoria.

## PREVIEW-01 — visão integrada (2026-10-02)

A entrada integrated-preview/ acrescenta VISUAL IMPLEMENTADO para representação transversal do produto: 19 áreas, estado canônico local, clientes/conversas sintéticos, Marketing/Dispatch, funil/timeline, comparação de pedidos, operação legada ilustrativa, WhatsApp/RCS e gateway/configurações/status. Nenhuma classificação de integração operacional/staging/live da tabela anterior foi promovida.

offline-preview/ (UNI-08) permanece intacto e funcionando. O novo preview reutiliza seu helper puro de fixtures e os núcleos/adapters já incorporados, sem criar arquitetura de negócio paralela ou importar UI operacional/providers. Fonte do mapa visual: estado auditado em e3c80db.

129 testes acumulados, stricts, baseline 21 → 21 e três builds aprovados localmente; navegação/preparo verificados no Chrome. URL integrada http://127.0.0.1:4180/; UNI-08 http://127.0.0.1:4178/. Ambas estáticas, sintéticas e loopback. Evidências remotas e commit da fase no EXECUTION-LEDGER.md; detalhes em PREVIEW-01-integrated-product.md.

Capacidade visual não significa capacidade operacional. Próxima ação: revisão humana do preview. Nenhum STG-01, ambiente cloud, merge, deploy ou envio autorizado/executado nesta fase.

## STG-01 — preparação após nova autorização (2026-10-02)

O controlador contínuo posterior autoriza staging Firebase gratuito exclusivo e Hosting somente do preview isolado. A parada anterior de PREVIEW-01 foi superada para esse escopo; produção, merge e primeiro envio continuam proibidos.

Configuração e guardas locais de STG-01 implementadas; **provisioned=false**. lidacomzapcrm-staging é ID preferencial, não projeto confirmado. Default/firebase.json operacionais intactos; alias staging ainda não adicionado. CI inclui validação e job de preview condicionado a provisionamento/identidade/ativação futura; deployment cloud ainda não executado. Backend NONE, providers DISABLED, zero envio. Não há URL staging, Firestore staging, webhook público ou worker distribuído comprovados.

GATE_FIREBASE_REAUTH_REQUIRED: sessão antiga potencialmente comprometida, conforme incidente histórico. Nenhum login:list, token, consulta cloud ou recurso criado nesta retomada. Após autorização do login em navegador, provisionar projeto segregado sem billing, validar identidade/Hosting e concluir STG-01 antes de avançar STG-02/03. Detalhes e plano: STG-01-isolated-firebase-staging.md.

UX-OPS-approved-requirements.md registra requisitos aprovados: ações em conversa, pedido contextual, cadastros, impressão centralizada, NOTA/venda a prazo, venda distinta de recebimento, fechamento por forma e paleta. Estado REQUISITO APROVADO, sem implementação operacional nova. ORDER-01 deve preceder escritas de OPS-01; nenhuma integração real ou crédito foi implantado.

Validação funcional final desta preparação: 139 testes (129 preservados + 10 staging), stricts/AST, baseline 21 → 21 e três builds aprovados. CI push/PR success em 075d0c0; deployment staging skipped. Entrada Vite operacional também recusa APP_ENV=staging, mantendo builds normais e configs isoladas. Encerramento documental e SHAs no ledger; nenhum STAGING READY ou LIVE READY novo declarado.
