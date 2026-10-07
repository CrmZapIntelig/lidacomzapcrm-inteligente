# INFRA-02 — correção de classificação dos projetos Google

Data: 2026-10-07. Status: CORREÇÃO CONCLUÍDA / CLOUD INTERROMPIDA.

## Regra vigente

Produto único: **LidacomZapCRM**, workspace `C:/Users/dfant/LidacomZapCRM`, repositório `CrmZapIntelig/lidacomzapcrm-inteligente`, branch `codex/unificacao-gestao-inteligente`.

A unificação incorpora arquitetura, contratos e funcionalidades históricas do Gestão ao CRM original. **Não implica mudança de Google Cloud Project ID.**

A instrução anterior que descrevia `lidacomzapcrm` como destino futuro foi **SUPERSEDED / CORRIGIDA** pela instrução humana mais recente. Nenhum plano MIG-00…MIG-09 ou plano de migração foi criado. Nenhum projeto deve ser aposentado, migrado ou promovido nesta fase.

## Mapa correto

| Project ID | Project Number confirmado | Display name retornado | Classificação vigente |
| --- | --- | --- | --- |
| `project-1300957a-ea82-4645-845` | `483558069545` | lidacomzapcrm-inteligente | OPERACIONAL ATUAL / HISTÓRICO PRESERVADO |
| `lidacomzapcrm-staging` | `854899277909` | LidacomZapCRM Staging | TEST / STAGING OFICIAL PRESERVADO |
| `lidacomzap-gestao-inteligente` | `446483877373` | LidacomZap Gestao Inteligente | FONTE HISTÓRICA / TÉCNICA; não segundo CRM |
| `lidacomzapcrm` | `529740841984` | LidacomZapCRM | UNVERIFIED / NÃO CLASSIFICADO; não destino, não staging, não autorizado para secrets |

O papel de um projeto não é inferido de seu display name. Os quatro projetos responderam ACTIVE na consulta de metadados; isso não lhes atribui papel operacional.

`.firebaserc` permanece intacta: `default = project-1300957a-ea82-4645-845`, `staging = lidacomzapcrm-staging`.

Cardápio operacional conhecido: https://project-1300957a-ea82-4645-845.web.app/cardapio/m1. Código atual `src/lib/firebase.ts` aponta Firebase/Auth/Firestore ao projeto operacional; `LoginView.tsx` usa email/senha. Nenhuma rota pública foi exercitada como checkout e nenhum dado foi lido para este registro.

Preview oficial conhecido: https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app/. Sua existência não autoriza transformação em frontend operacional; preview continua sintético/offline.

## Evidência read-only preservada

O coletor foi criado **fora do repositório**, em `C:/Users/dfant/AppData/Local/LidacomZapCRM/staging-auth-20261002/infra02-readonly.cjs`. Ele somente faz GETs de metadados, usando sessão nova isolada e supressão de logs de autenticação. Nenhum valor de token é exibido. Prova sanitizada preservada no mesmo diretório: `infra02-project-map-proof.json`, timestamp de início `2026-10-07T18:16:30.220Z`. Não é um snapshot consistente de todos os serviços.

Nenhum enable, criação de secret, leitura de versão de secret, IAM, billing, Firebase, deploy, export, documento Firestore, usuário Auth ou dado operacional foi alterado/acessado nesta coleta. Renovação técnica da sessão autenticada não configura recursos cloud. As leituras administrativas não garantem franquia/custo universal zero.

| Metadado observado | Operacional atual | Histórico Gestão | `lidacomzapcrm` não classificado | Staging oficial |
| --- | --- | --- | --- | --- |
| Firebase | confirmado | confirmado | confirmado | confirmado |
| Firestore | 1 banco native / southamerica-east1; PITR enabled | 1 banco native / southamerica-east1; PITR disabled | lista completa de bancos: 0 | 1 banco native / southamerica-east1; PITR disabled |
| Auth config | email habilitado | email habilitado | GET config 404 | GET config 404 |
| Hosting | 1 site / domínio padrão | 1 site / domínio padrão | 1 site / domínio padrão | 1 site / domínio padrão |
| Storage buckets (sem ler objetos) | 4 | 0 | 0 | 2 |
| Functions v2 | SERVICE_DISABLED; não inventário vazio | SERVICE_DISABLED; não inventário vazio | SERVICE_DISABLED; não inventário vazio | stagingIngress GEN_2 ACTIVE / nodejs22 / southamerica-east1 / maxInstances=1 / concurrency=1 |
| Cloud Run | lista respondeu 0 | lista respondeu 0 | SERVICE_DISABLED; UNKNOWN | stagingingress; runtime crm-staging-runtime separado do Hosting |
| Secret Manager | SERVICE_DISABLED; não habilitado | SERVICE_DISABLED; não habilitado | SERVICE_DISABLED; não habilitado | SERVICE_DISABLED; não habilitado |
| Billing | enabled / conta vinculada | enabled / conta vinculada | disabled / sem vínculo retornado | enabled / conta vinculada |
| APIs enabled (lista completa retornada) | 96 | 56 | 40 | 52 |
| Service accounts (somente metadados) | 3 | 4 | 1 | 5 |

Limites: Auth config 404 não comprova inexistência universal de identidades; usuários não listados. Site Hosting não comprova aplicativo operacional nem conteúdo/deploy correto. Listagem Run não equivale a inventário global independente de regiões indisponíveis. Inventários recusados não foram tratados como vazios. Cloud Asset devolveu SERVICE_DISABLED usando quota project staging; não inferir estado da API alvo desse erro. Consulta de indexes wildcard devolveu INVALID_ARGUMENT nos bancos existentes: índices permanecem não comprovados por esta coleta. Não habilitar APIs nem repetir coleta para completar o mapa nesta correção.

Firestore/schema: listeners do CRM referenciam clients, messages, history, orders, deliveryOrders, caixaSessions, cardapios, productsDigitalMenu, campaigns, settings, automations, couriers e deliveryHistories. Referências de código não comprovam coleções/documentos cloud existentes. Fonte histórica Gestão contém regras/indexes versionados para contacts/conversations/messages/opportunities/dispatchQueue/orderItems/timelineEvents; não substituir contratos legados nem presumir deploy atual desses arquivos. Sem leitura de documentos reais, enumeração de usuários, export ou cópia de dados.

Runtime de teste AI/Agent Studio anteriormente removido permanece apenas evidência histórica em INFRA-01; não recriado. Buckets, Auth authorized domains e demais recursos históricos não são automaticamente descartáveis.

## Revisão do working tree

Checkpoint local/remoto confirmado: `e464976d28ee011cf45908befeff7c6b990e1e8f`; main remota `60fb91fdf048a8e0d4f9adc29a532be8bf4356dd`. Antes desta correção, nenhum arquivo do repositório havia sido editado pelo coletor. `git diff` contra o checkpoint mostrou apenas as recomendações pessoais de `.vscode/extensions.json`; status também marcou `src/App.tsx` e `src/components/CommercialIntelligenceView.tsx`, sem diff textual retornado. Todos preservados. AGENTS.md, docs/FONTES-CHATS.md e patch pessoal não rastreados preservados.

Nenhum documento existente incorporava a premissa de destino futuro nesta execução. Esta nova nota e os cabeçalhos de canônico/ledger registram sua superação. Nenhum commit/push nesta correção: push dispararia a CI configurada com publicação automática do preview staging, fora do escopo atual de zero mutação cloud.

## META-01 / ponto de parada

App `1480563193903800`, proprietário LIDACOM BUSINESS EVOLUTION `1694546150694544`, WABA TEST `1670383058144564` e Phone Number ID TEST `1406670279191899` preservados. Rotação humana informada preservada; não repetir criação, termos ou reset e não usar segredo anterior. Nova chave não lida/transferida durante a reconciliação.

**GATE_STAGING_SECRET_MANAGER_ENABLE_REQUIRED** permanece pendente, proposta somente em **lidacomzapcrm-staging**. Não autorizado ativar agora. Nenhum secret TEST no operacional nem em `lidacomzapcrm`. Nenhuma decisão sobre secrets de produção futura foi tomada. META-01 pausa nesta subetapa; outbound/RCS DISABLED.

Piloto pode manter desenvolvimento/validação local TEST sem migração completa. Integração cloud Meta continua aguardando gate específico; prontidão offline não equivale a inbound real nem piloto pago operacional.

Encerrar aqui. Não criar plano de migração/aposentadoria, não habilitar serviços, não cadastrar secrets, não retomar Meta/configuração cloud antes de nova autorização humana.

Fontes oficiais consultadas para interpretação, sem conceder autorização: [Firebase projects](https://firebase.google.com/docs/projects/learn-more), [separação de ambientes](https://firebase.google.com/docs/projects/dev-workflows/general-best-practices), [limites do Cloud Asset](https://docs.cloud.google.com/asset-inventory/docs/asset-types). Evidências atuais são as consultas/metadados e código identificados acima.
