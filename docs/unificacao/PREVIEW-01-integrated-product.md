# PREVIEW-01 — preview integrado do LidacomZapCRM

Data: 2026-10-02. HEAD inicial e3c80db7b38fef1b78739b17d108d7539f8ae270. Branch codex/unificacao-gestao-inteligente; PR #4 draft; main 60fb91f preservada.

## Objetivo e entradas

Atualização STG-01/02 (2026-10-02): publicação segura também disponível em https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app , canal temporário pr-4, com CI federada comprovada. Catálogo manual atualizado distingue Hosting/store servidor de fixtures TEST validados de webhook/worker/cloud/providers ainda pendentes. MODE permanece OFFLINE PREVIEW; o preview não conecta Firestore ou backend. Nenhuma integração operacional foi promovida por estas evidências de staging.

LidacomZapCRM é um único produto. O preview integrado representa a operação original preservada e a arquitetura/funcionalidades do Gestão incorporadas ao LidacomZapCRM, mostrando contratos, adapters, implementação offline e gaps. Não é uma segunda aplicação de produção ou arquitetura de negócio paralela.

| Entrada | Finalidade | Saída de build | URL local |
| --- | --- | --- | --- |
| Aplicação operacional existente | Fluxos originais, componentes e integrações existentes | dist | Não iniciada nesta fase |
| UNI-08: offline-preview/ | Demonstração específica Marketing → Dispatch → drafts → timeline/funil | dist-offline | http://127.0.0.1:4178/ |
| PREVIEW-01: integrated-preview/ | Visão transversal do produto e de seu estado canônico | dist-integrated | http://127.0.0.1:4180/ |

Nenhum arquivo de offline-preview/, App.tsx, src/components, src/lib ou src/types.ts foi alterado nesta fase. O cenário puro existente `offline-preview/scenario.ts` é reutilizado somente como helper de fixtures/preparação, sem importar a entrada UI da UNI-08. Order/DeliveryOrder usam os adapters canônicos já existentes. Imports de tipos legados são apagados na compilação; nenhum runtime operacional entra no bundle.

## Módulos e estado exibido

| Áreas | Representação e limites |
| --- | --- |
| Dashboard | 11 cards de produto, fase/status/gap; um produto, zero envios; staging pendente |
| CRM / Clientes | Client legado preservado; Contact/ChannelIdentity incorporados, fixtures por canal; integração operacional pendente |
| Conversas | Um Contact e duas Conversation por canal; domínio offline, inbox real pendente; texto ilustrativo sem receipt |
| Marketing | MarketingCampaign = QUEM + POR QUÊ; Audience sintético separado do Dispatch |
| Venda Ativa / Disparador Inteligente | Núcleo puro existente; eligibility, queue, budget, dois drafts sintéticos, Carla bloqueada, replay e próximo dia |
| Funil | Dez estágios canônicos; somente Opportunity RASCUNHO derivada de draft conhecido, demais colunas sem fatos |
| Pedidos | Order legado e DeliveryOrder comparados com Order/OrderItem canônicos; ID/total/origem/modo projetados, operação unificada ainda incompleta |
| Cardápio / Caixa / Cozinha-KDS / Delivery | Operação original preservada; telas ilustrativas com itens/pedidos/valores fictícios, nenhuma execução de lógica operacional |
| Timeline | Eventos derivados exclusivamente de drafts preparados nesta sessão; nenhum fato real de envio, leitura, resposta, entrega, pedido ou receita |
| WhatsApp | Boundary/policies/inbound offline; worker sintético; transporte DISABLED, staging/live pendentes, envio zero |
| RCS | Provider DISABLED, capability UNKNOWN/fixture, drafts MOCK, fallback offline; agente não configurado |
| Gateway / Worker | Diagrama conceitual de signature/admission/queue/lease/resolução/evento; local/synthetic, distributed staging pendente, auto-reply DRAFT somente |
| Configurações | OFFLINE PREVIEW, backend NONE, memória de sessão; espaço conceitual STAGING sem mecanismo de ativação |
| Arquitetura / Status | Tabela local manual derivada de CANONICAL-UNIFICATION-STATE.md em e3c80db; não interpreta Markdown nem consulta backend |

Nenhum novo domínio é promovido a STAGING READY, LIVE READY ou OPERACIONAL COMPLETO. OPERACIONAL LEGADO descreve o código original preservado; o preview em si continua DEMO. Data de simulação da Venda Ativa permanece 2026-09-30, pois reutiliza a fixture da UNI-08; não é o relógio operacional.

## Isolamento

- Build allowlist: integrated-preview, núcleos src/domain/application, helper de fixture UNI-08 e React/react-dom/scheduler. Manifesto compilado: 39 módulos.
- Verificação AST transitive: 12 fontes locais permitidas; sem import operacional/cloud/provider, networking, storage, dynamic import, backend entry ou send. Não representa prova genérica contra todo código arbitrário futuro; CI bloqueia mudanças fora desta fronteira.
- Nenhum App.tsx, Firebase SDK/Auth/Firestore, Supabase, provider server, cloud API ou webhook real é importado/executado.
- Dados determinísticos: nomes Exemplo, namespace demo-offline, números fictícios reservados das fixtures existentes, endereço Demonstração, itens e totais expressamente fictícios. Sem leitura de mockData operacional, dados reais ou storage.
- Servidor novo entrega somente arquivos estáticos de dist-integrated em 127.0.0.1. Sem SPA fallback, endpoints de negócio ou writes; verifica Host e realpath para limitar traversal/symlink.
- CSP connect-src 'none', form-action 'none', assets/fontes locais e no-store; nenhum recurso remoto necessário após build.
- Banner de segurança permanece visível durante scroll; nenhum botão de envio ou ativação staging. Estado de interação em memória; recarregar reinicia o cenário.

## Comandos

Na raiz C:/Users/dfant/LidacomZapCRM:

```powershell
npm run build:integrated-preview
npm run preview:integrated
```

Tipos React são os já instalados pelo pacote de tipos da UNI-08 (`npm ci --prefix offline-preview` num checkout novo). Não foi adicionada dependência de runtime ou alterado lockfile operacional.

Preservados: `npm run build`, `npm run build:offline`, `npm run preview:offline`. INTEGRATED_PREVIEW_PORT pode escolher outra porta local; padrão 4180. Listener confirmado 127.0.0.1 nas portas 4178 e 4180.

## Validação

- 129 testes aprovados: 117 existentes de módulos/cenário + 7 funcionais integrados + 2 isolamento UNI-08 + 3 isolamento integrado.
- Strict núcleo/servidor/UNI-08/integrado aprovados; baseline global 21 → 21, zero erros novos, mesmas assinaturas.
- Builds operacional, UNI-08 e integrado aprovados. Aviso preexistente do bundle operacional acima de 500 kB; não é erro novo.
- CI mantém gates existentes e acrescenta testes, strict, AST, build e isolamento integrado. Evidência remota no fechamento do ledger.
- HEAD funcional b5ca1542a9446755fd7ec97f3e72572ffe24254c: CI push 37038618163 e PR 37038625456 success. Encerramento documental em commit separado, sem código adicional.
- Browser QA no Chrome: 19 módulos navegáveis, comparação de pedidos, preparo de dois drafts, budget 2/2, canal alternativo, Carla bloqueada, timeline de fatos conhecidos. UNI-08 reaberta e preparo existente confirmado, envio zero. O navegador interno não anexou o webview; Chrome permitiu validação integral do mesmo listener local.
- Screenshots externos ao Git: C:/Users/dfant/.codex/visualizations/2026/09/30/01a0f21e-6cda-7eb1-965f-1a3fd5ad8b7b/PREVIEW-01-dashboard.jpg e PREVIEW-01-pedidos.jpg.

## Limitações e parada na entrega inicial (histórico)

Tela demonstrativa não comprova integração operacional, segurança de produção, capability real, assinatura de conta ou disponibilidade cloud. Não foram migrados dados, executados providers, criados pedidos/mensagens reais, secrets, staging ou deployment. Fontes históricas e alterações pessoais preservadas.

Parada após PREVIEW-01 para revisão humana. **Não iniciar STG-01.** Próximo passo é revisar o preview; GATE_STAGING_PROJECT_REQUIRED e GATE_OUTBOUND_CANARY_REQUIRED continuam pendentes e não são autorizados por esta fase.

## Atualização Firebase — 2026-10-04

HEAD inicial: 891ce9c05412df61a1d6e442e7aa48caf8f4da65. Esta atualização sucede a entrega inicial e representa STG-01/02/03 e ORDER-02 comprovados, exclusivamente TEST. 21 áreas, incluindo Entregadores e Automações; Estado do Produto mostra os gates independentes de escrita operacional e Meta trusted-device. Pedidos mostra port/persistência/projeções/rollback como arquitetura comprovada, sem conexão de frontend. Conversas preserva revisão contextual em memória; Caixa apresenta cinco métodos, esperado/informado/diferença, NOTA e impressão central pura (sem driver físico).

ORDER-02: STAGING READY — TEST ONLY; flag DISABLED por padrão e produção bloqueada. Meta/RCS outbound DISABLED. Nenhum dado real, backend no preview, nova tentativa Meta ou escrita operacional. CSP connect-src none preservada. Paleta/layout mantidos.

Publicação somente via CI/WIF existente, projeto lidacomzapcrm-staging e canal pr-4, com todos os gates prévios. URL conhecida: https://lidacomzapcrm-staging--pr-4-vgm30gaf.web.app/ . URL/HEAD/expiração efetivos e confirmação CI/HTTP/browser no fechamento do ledger/relatório.
