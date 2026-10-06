# INFRA-01 — proveniência do runtime e auditoria estática do ZIP

## Atualização — runtime de teste descomissionado (2026-10-06)

**RUNTIME DE TESTE DO AI/AGENT STUDIO — DESCOMISSIONADO.** O usuário confirmou que o serviço era um teste descartável e autorizou sua remoção controlada. Isto supera o gate de proveniência para esse recurso; não transforma a fonte histórica em preview seguro ou comprova o artefato que antes era servido. As seções da auditoria abaixo são preservadas como histórico.

- HEAD inicial deste bloco: bbbefc1900c9430066e9899b75c4d1ab4278fcc2. Serviço exato: projects/project-1300957a-ea82-4645-845/locations/us-west2/services/lidacomzapcrm-inteligente. UID a2d510cf-86c0-4121-b72b-e10ed87f3bd7; revisão00002-wqh; applet d0a1f98e-eb48-4e21-bf06-e17eab23635c.
- Antes da remoção: configuração declarativa sanitizada de service/revision, IAM do serviço, traffic/scaling/identidade/labels/nomes de env e últimos cinco metadados de request preservados em evidence/INFRA-01-test-runtime-before-decommission.json. Não contém valores env, argumentos/command, headers, IPs, URLs de request, payloads ou tokens. Não é export diretamente deployável: secrets/configuração omitida exigiriam recuperação autorizada à parte. Digest de imagem não disponível; image retornada scratch, imageDigest null, sem inventar digest.
- Metadados: service criado2026-06-10T23:16:39.467698Z/atualizado2026-07-03T02:16:44.206289Z; revisão criada2026-07-03T01:13:46.73244Z. Traffic100% LATEST; runtime compute default compartilhado preservado; service max1, template/revision max3, min não explicitado, timeout300s/concurrency1000. São valores históricos deste teste, não os limites do staging STG-03. IAM local bindings vazio, annotation invoker-iam-disabled true; não inferir que era privado. Último request disponível na consulta: GET200 em2026-09-23T19:21:39.433672Z; metadados somente, sem afirmar ausência de outros requests.
- Dependências: Cloud Asset listAssets RESOURCE241 completo, sem nextPageToken; nenhuma referência operacional direta encontrada. Builds11 históricos e trigger associado encontrados, além de matches de nome/displayName do projeto. Trigger368a078f-c3f0-4690-a2a3-5d88921a2dd2 confirmado disabled=true imediatamente antes da exclusão; preservado. Domain mappings regionais0, Pub/Sub subscriptions0; Hosting operacional publicado versão71a01c9e9e04f315 sem referência ao serviço; configuração versionada também sem ligação direta ao endpoint. Nenhum asset compute de load balancer/backendService/URLMap/NEG foi retornado no inventário; resultado complementar, não garantia universal. Scheduler/Eventarc/Functions/Extensions recusaram leitura com SERVICE_DISABLED; APIs não habilitadas e respostas não tratadas como vazio. Declaração humana de descartabilidade e ausência de dependência conhecida suportaram a remoção limitada, não uma certificação do inventário inteiro.
- Execução: API oficial DELETE exclusivamente para o serviço, com etag e verificação de projeto/UID/revisão/applet inalterados. validateOnly200 primeiro, sem remoção; exclusão real em2026-10-06T23:10:04.696Z. Operação9f0f1084-742f-4dfb-be0c-c2be445d5a60 concluída done=true, sem error. GET service404/NOT_FOUND e GET revisão00002-wqh404/NOT_FOUND. Serviço não pode mais servir tráfego; a exclusão do serviço remove suas revisões, conforme [API oficial Cloud Run](https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services/delete). Prova: evidence/INFRA-01-test-runtime-decommission.json.
- Escopo: um serviço TEST removido; nenhuma exclusão separada de applet, Cloud Build, Artifact Registry, APIs, contas compartilhadas, buckets, Firebase ou Firestore. Applet não removido/despublicado pela interface, pois não foi comprovada uma operação restrita e independente para isso; nenhuma tentativa UI. Não republicar o teste.
- Validação posterior: list Cloud Run direto retornou0 serviços, mantendo regiões unreachable; Cloud Asset search ainda retornou o serviço/revisões antigos no índice eventual, sem prevalecer sobre o GET direto404. Regras release/ruleset/hash inalterados; SHA256 de fonte de files35e8844823ce67e8e9fbbce7cd89591001a97fccfb5462288fd0d0d3794e99a1. Projeto Firestore ACTIVE, paths TEST orders/clients/audit ausentes; nenhum write/remoção de documentos foi feito por esta execução. Não foram lidos pedidos/caixa/delivery reais para produzir cópias ou alegar snapshot integral. IAM/API/billing/aliases não alterados. Provas: evidence/INFRA-01-post-decommission-inventory.json e evidence/INFRA-01-post-decommission-canary-preflight.json.

**Canário ainda não executado:** GATE_OPERATIONAL_RUNTIME_PROVENANCE_REQUIRED resolvido pela retirada do serviço de teste. Continua **GATE_OPERATIONAL_INVENTORY_VERIFICATION_REQUIRED**: os inventários diretos de Functions/Eventarc/Extensions permanecem indisponíveis e a autorização anterior exige comprovação antes da contenção/identidade/write. Não ignorar essa condição nem habilitar API proibida. Ação mínima: disponibilizar inventário verificável equivalente desses serviços no projeto operacional; caso isso também exija habilitação, uma exceção humana explícita à proibição será necessária antes de qualquer enable. Nenhuma autorização duplicada de Order/contenção/identidade solicitada. Quota consumida0/1, flagDISABLED, audit cloud0, identity canary não criada; rollback/revogação não aplicáveis.

**Regra futura:** prototipação AI Studio/Agent Studio/ADK deve usar projeto separado, por exemplo lidacomzapcrm-ai-dev; apenas PLANEJADO, não criado. SEC-01 permanece PLANEJADO. MKT-AUTO-01 agendado/Venda Ativa por draft/manual/lote iniciado pelo operador preservados. Meta Developer desbloqueado; META-01/outbound aguardam fechamento seguro do canário. Nenhum rollout.

Validação deste bloco: somente scripts locais privados de auditoria/exclusão específica, checks JSON/diff e pre-flight read-only. Código funcional do repo não alterado; referência188 testes/cinco stricts/baseline21→21/quatro builds continua evidência anterior, não reexecução nesta fase. Fechamento em commit local sem push para evitar republicação Hosting não autorizada neste escopo; PR #4 mantida draft e descrição atualizada com o estado real. HEAD/CI remoto permanecem cf2e3eb; sem CI nova alegada para os commits locais.

Data: 2026-10-06. HEAD inicial: `cf2e3eb15d51f487a50614ff52b8d04c9e2aa6ba`. Branch `codex/unificacao-gestao-inteligente`, PR #4 draft, main `60fb91fdf048a8e0d4f9adc29a532be8bf4356dd` confirmadas. Auditoria de fonte somente leitura; nenhuma execução do código do ZIP ou alteração cloud.

## Decisão

**PROVENANCE_HIGH_CONFIDENCE** para a origem comum no applet identificado. **A versão efetivamente servida pela revisão cloud permanece não comprovada.** Risco: **BLOCK_CANARY**. Firestore: **C — escreve Firestore**, na fonte auditada.

O ZIP é uma cópia byte a byte da main canônica, não uma evidência de preview integrado isolado recente. A hipótese de origem foi parcialmente confirmada pelo mesmo applet; a hipótese de fonte exclusivamente visual/offline é contradita pelos imports e handlers de persistência operacional. A presença desses handlers não prova que alguém os executou, nem que o serviço cloud contém exatamente essa versão.

Nenhum Order TEST, auditoria cloud, identidade temporária, contenção de Rules ou rollback foi executado nesta auditoria. Flag permanece DISABLED. A autorização anterior de exatamente um canário e contenção limitada continua preservada, mas seus pré-requisitos ainda não foram satisfeitos.

## Identificação e cadeia de evidências

| Evidência | Resultado | Limite |
| --- | --- | --- |
| Arquivo original | `C:/Users/dfant/Downloads/lidacomzapcrm-inteligente-main (2).zip`, 278842 bytes | Nome não identifica versão cloud |
| SHA-256 original, antes/depois | `ef7627f76365a9bfcd9a97c3bce40d39a9d2eb1c24bfe89f7523229d2a5c2a65` | Integridade do arquivo local |
| Comentário Git no ZIP | `60fb91fdf048a8e0d4f9adc29a532be8bf4356dd` | Comprovado também pelo conteúdo |
| Comparação dos arquivos | **67/67 idênticos**, zero divergências, por SHA-256 dos bytes de cada arquivo versus `git cat-file blob main:path` | Confirma snapshot local, não artefato remoto |
| README.md:9 | `https://ai.studio/apps/d0a1f98e-eb48-4e21-bf06-e17eab23635c` | Declara origem AI Studio |
| Cloud Run annotation | `generativelanguage.googleapis.com/applet-id` com o mesmo UUID; tipo `fullstack-applet` | Metadados já coletados, sem secret |
| Revisão existente | `lidacomzapcrm-inteligente-00002-wqh`, us-west2, projeto `project-1300957a-ea82-4645-845` | Não é staging |
| Estado observado | Ready/Active/ContainerHealthy SUCCEEDED; tráfego 100% LATEST, ingress ALL | Não demonstra requests ou writes efetivos |
| Artefato/source cloud | API retorna image `scratch`, buildConfig ausente; builds globais observados FAILURE, sem imagens de resultado | Sem digest/commit verificável da revisão Ready |

Metadados temporais: arquivo local LastWriteTimeUTC `2026-09-27T23:06:39`; entradas ZIP `2026-08-14T08:56:18-03:00`; revisão criada `2026-07-03T01:13:46.732440Z`. Datas do arquivo/export não demonstram data de deploy e não refutam, sozinhas, a origem comum. Nenhum build falho foi tratado como origem da revisão ativa.

Extração somente em `C:/Users/dfant/AppData/Local/LidacomZapCRM/audit/INFRA-01-20261006-zip`, fora do workspace; caminhos e tamanho verificados. Foram lidos arquivos e AST com o TypeScript já instalado no projeto. Nenhum import/require do código auditado, instalação, build, teste do ZIP, servidor ou navegador da aplicação foi executado. ZIP e código extraído não são versionados; apenas a prova sanitizada `evidence/INFRA-01-zip-audit.json`.

## Framework e configuração

- `package.json`: `react-example`, 0.0.0, React 19, Vite 6, Tailwind 4, TypeScript 5.8. Script dev usa porta 3000/host 0.0.0.0; **não foi iniciado**. Build seria `vite build`/dist. Entradas `index.html` → `src/main.tsx` → `src/App.tsx`.
- Firebase 12.14 importa App/Auth/Firestore/Storage. `src/lib/firebase.ts:15,18` inicializa o app e Firestore com projectId operacional **project-1300957a-ea82-4645-845**. `.firebaserc` também aponta default para esse projeto. Valores de configuração/credenciais não foram copiados para a prova.
- `firebase.json`: Hosting dist com rewrite SPA, sem configuração de Functions ou rewrite de backend. Isso descreve o pacote, não a infraestrutura cloud inteira.
- Express/dotenv/@google/genai constam em dependências; não foi encontrado servidor Express, uso GenAI ou rota HTTP implementada na fonte. `metadata.json` declara `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`; declaração não comprova implementação nem ausência de código gerenciado fora do ZIP.
- `src/lib/supabase.ts` contém createClient dependente de variáveis de ambiente e placeholders. Nenhum outro arquivo auditado importa esse helper; não foi comprovada integração Supabase alcançável pela entrada da aplicação.
- Vite configura React/Tailwind/HMR, sem proxy/backend explícito. NOMES de env cloud previamente observados: SQL_DB_NAME, GEMINI_API_KEY, APP_URL. Valores não consultados/publicados. Não atribuir banco ou operações a esses nomes.
- O ZIP não contém `integrated-preview`, `offline-preview`, STG-02/ORDER-02 ou o novo domínio operacional da branch. Busca de NOTA/FIADO no código não identificou o fluxo recente aprovado. O conteúdo não comprova as evoluções visuais descritas na hipótese do usuário.

## Matriz de coleções — código do ZIP/main 60fb91f

READ/LISTENER corresponde a chamada do SDK; WRITE/DELETE a handler alcançável no código, **não a operação executada durante a auditoria**. Referências abaixo são linhas da fonte extraída/main, não do App local modificado. `saveFirestoreDocument` e `deleteFirestoreDocument` são wrappers dinâmicos em App:954–974, rastreados nos chamadores.

| Coleção | READ | WRITE | DELETE | LISTENER | Fonte/efeito |
| --- | --- | --- | --- | --- | --- |
| orders | SIM | SIM | Não encontrado | SIM | App:463 listener; handleSaveOrderCreated:1161/1166 setDoc merge |
| deliveryOrders | SIM | SIM | Não encontrado | SIM | App:614/1480; PublicCardapioView:151; alteração de status pode criar histórico/registro de caixa |
| caixaSessions | SIM | SIM | Não encontrado | SIM | App:748; registro de venda1332, abertura1369, transação1412, fechamento1462 |
| clients | SIM | SIM | Não encontrado | SIM | App:220/1032; PublicCardapioView:154/159/181; atualização de totalBought/data/etapa por handler de pedido |
| messages | SIM | SIM | Não encontrado | SIM | App:240/1053/1239; PublicCardapioView:206/218/222 |
| history | SIM | SIM | Não encontrado | SIM | App:284/947; PublicCardapioView:230 |
| deliveryHistories | SIM | SIM | Não encontrado | SIM | App:716/1511; status anterior/novo no updater de delivery |
| productsDigitalMenu | SIM | SIM | Não encontrado | SIM | App:552/1718; PublicCardapioView:48 |
| cardapios | SIM | SIM | Não encontrado | SIM | App:583/1699; PublicCardapioView:47 |
| couriers | SIM | SIM | Não encontrado | SIM | App:641/1764 |
| routes | SIM | Não encontrado | Não encontrado | SIM | App:666; mudanças via setRoutes permanecem estado/caches locais na fonte analisada |
| settings | SIM | SIM | Não encontrado | SIM | App:525/847, documento default |
| automations | SIM | SIM | Não encontrado | SIM | App:494/1270, toggle persiste regra |
| reviews | SIM | Não encontrado | Não encontrado | SIM | App:691 |
| campaigns | SIM | SIM | SIM | SIM | App:308, wrappers1003/1008 |
| commercialSegments | SIM | SIM | SIM | SIM | App:339, wrappers983/988 |
| campaignTemplates | SIM | SIM | SIM | SIM | App:370, wrappers993/998 |
| campaignSchedules | SIM | SIM | SIM | SIM | App:401, wrappers1013/1018 |
| campaignResults | SIM | Não encontrado | Não encontrado | SIM | App:432 |

Os imports de Firestore aparecem em App e PublicCardapioView, além da inicialização no helper Firebase. Não foi encontrado SDK Admin ou equivalente server-side de persistência nesse ZIP. Não atribuir o DELETE genérico a todas as coleções: seus chamadores identificados são apenas as quatro coleções comerciais da tabela.

## Handlers e possibilidade de efeitos laterais

1. **Listener orders (App:462–484):** mapSnapshotWithId, setOrders, fallback INITIAL_ORDERS e logs de contagem; não chama registro de venda ou outro write. Um Order Pendente externo pode aparecer em Pedidos/Dashboard/Relatórios. Não foi demonstrada promoção automática a Pago por esse listener.
2. **Novo pedido (App:1161):** setDoc orders merge; se status Pago, chama registro de caixa; se encontra cliente, altera totalBought/data/etapa e grava histórico. Executor do canário não pode chamar esse handler, como já definido em PROD-ORDER-00.
3. **Caixa (App:1278):** dedupe local por orderId+source, transação venda e currentBalance somado pelo total, persistência caixaSessions. Não equivale ao modelo financeiro TEST mais recente da branch; não comprova segurança financeira concorrente.
4. **Delivery (App:1471):** updater grava deliveryOrders; transição FECHADO chama registro de caixa sem evidência financeira separada; mudança de status grava deliveryHistories. Não deve ser utilizado no canário.
5. **Cardápio público:** submit grava deliveryOrders, clients, messages e history. Não é mera tela mock; o handler não foi executado nesta auditoria.
6. **Caches/mock:** App possui fallback INITIAL_* em coleções vazias/erro e saveData/localStorage após atualizações. CardapioView possui pedido simulado local. Mock/localStorage coexistem com SDK real; não substituem ou neutralizam sua persistência.

## Backend, tarefas e mensageria

`backend/dispatch-admission` contém tipos, validação, fingerprints, decisões e propostas de fila, com testes estáticos: não há bootstrap Express/Fastify/Next, listener HTTP, webhook, worker, cron, scheduler, Cloud Functions ou job persistente encontrado no pacote. Caminho `/internal/campaign-dispatch-requests` é endpoint **proposto** em contrato/envelope; não é rota implementada. `campaignDispatchTransport.ts` constrói/valida envelope `preview-only-not-transmitted`; não executa HTTP.

Não foram encontrados fetch/axios, XMLHttpRequest, WebSocket, EventSource/sendBeacon ou chamada HTTP Meta `/messages` nos arquivos de código inspecionados. Isto não elimina rede: o **Firebase SDK real** executa comunicação conforme os handlers/listeners. `messages` é também nome de coleção Firestore; sua escrita não comprova envio WhatsApp. Labels de envio/automação na UI não são prova de provider real.

Timers identificados: CozinhaView contador/áudio; WhatsAppView gravação simulada; RotasView coordenadas/alertas locais; CommercialIntelligence atualização de preview; App sync simulado e resposta simulada no fluxo handleSendMessage. A resposta simulada usa os handlers locais/Firestore de mensagens/histórico: simulação textual não garante ausência de persistência. O timer de rotas usa setRoutes, não SDK de gravação de routes. Não foi encontrado gatilho server-side que reaja à inserção de orders no ZIP; ausência na fonte incompleta do runtime não comprova inexistência cloud.

Inventários anteriores continuam com limites documentados: Cloud Asset complementar, regiões Cloud Run unreachable e APIs Functions/Eventarc/Extensions desabilitadas impediram inventário direto completo. **SERVICE_DISABLED não foi tratado como vazio.** Nenhuma API foi habilitada nesta fase. Ver `PROD-ORDER-01-runtime-safety-gate.md` e provas de inventário/runtime.

## Gate e continuidade

**GATE_OPERATIONAL_RUNTIME_PROVENANCE_REQUIRED** permanece pendente, agora com a origem comum esclarecida. Falta vincular a revisão Ready ao código/artefato efetivo e concluir a exclusão de efeitos laterais operacionais. O ZIP fornecido não resolve isso: contém escritores operacionais e não tem digest de deploy correspondente.

**Ação mínima:** disponibilizar o export/fonte da versão efetivamente publicada no applet ou evidência de build/artefato correspondente à revisão `lidacomzapcrm-inteligente-00002-wqh`, sem credenciais. Não é necessário autorizar novamente o único Order TEST; nenhuma alteração de Cloud Run, Rules, APIs ou IAM está proposta nesta auditoria.

Depois: comparar versão efetiva, rastrear listeners/handlers/server/background jobs, reconciliar inventários e revisar risco. Somente SAFE_FOR_ORDER_CANARY permite retomar pre-flight atualizado, contenção já autorizada, identidade mínima temporária, exatamente um create-only, validação, flag DISABLED, rollback seletivo e revogação. Não executar canário com dúvida de proveniência ou efeitos.

Marketing: MKT-AUTO-01 mantém requisito de campanhas ativas por agendamento; Venda Ativa individual por draft/manual ou lote iniciado pelo operador. São decisões preservadas, não implementação concluída neste ZIP/auditoria. Meta Developer desbloqueado conforme usuário; META-01 somente após fechamento seguro do canário. Outbound/RCS DISABLED. SEC-01 continua prioridade PLANEJADA, sem hardening global agora.

## Validação e publicação

SHA-256 do ZIP revalidado inalterado após análise; 67 arquivos preservados e idênticos à main. Nenhum código funcional do workspace foi alterado ou copiado. Alterações pessoais preexistentes preservadas fora dos commits. Nenhum dado operacional foi consultado, copiado, criado ou removido nesta fase; metadados cloud usados são a evidência anterior.

CI inicial cf2e3eb: push37531587170/PR37531593227 success; referência funcional 188 testes, cinco stricts/isolamento, baseline21→21/zero novos e quatro builds verdes. Auditoria documental não executa testes/builds do ZIP. Fechamento em commit local, sem push: o workflow existente republica Hosting staging no evento synchronize da PR e a tarefa atual proíbe alterações cloud. Nenhum workflow/variável foi alterado para contornar essa restrição. HEAD remoto permanece cf2e3eb, com CI verde comprovada nesse SHA; não há CI nova do commit local. HEAD local final resolvível pelo commit `Audit AI Studio ZIP lineage and block unverified operational runtime`. Status INFRA-01: AUDIT COMPLETE WITH BLOCKED CANARY; PROD-ORDER-01 permanece BLOCKED — PREFLIGHT ONLY.
