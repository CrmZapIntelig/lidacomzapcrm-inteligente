# PROD-ORDER-01 — inventário ampliado e origem do runtime

## Atualização INFRA-01 — ZIP fornecido (2026-10-06)

O ZIP disponibilizado pelo usuário foi auditado fora do workspace, sem execução:67/67 arquivos idênticos à main60fb91f, comentário Git correspondente, README com o mesmo applet UUID da annotation fullstack-applet. Classificação atual **PROVENANCE_HIGH_CONFIDENCE** de origem comum, **BLOCK_CANARY**. A hipótese de fonte só visual/offline foi contradita por handlers reais de Firestore configurados para o projeto operacional. A versão efetiva da revisão Ready continua não comprovada; o gate abaixo permanece, agora delimitado à versão publicada/efeitos e inventários remanescentes. Relatório: INFRA-01-runtime-provenance.md. Nenhuma contenção/IAM/API/Order/cloud mutation foi executada. Texto seguinte preserva a coleta anterior e seus limites.

Data: 2026-10-06. HEAD inicial da retomada: 4fece9a0eed29bf691f595f89c80e21dcc55b0a2. Evidência pendente publicada primeiro em cf2e3eb15d51f487a50614ff52b8d04c9e2aa6ba, sem repetir os 220 casos já comprovados. Nenhum arquivo funcional foi modificado.

## Autorizações preservadas

Um Order TEST específico, contenção de dois IDs, janela sem intervenção e identidade temporária sem chave/role mínima/impersonação/revogação estão autorizados. IAM Firestore não oferece isolamento por documento equivalente a Rules. Identidade/role/token temporários não foram criados porque o inventário revelou um runtime operacional que precisa ser esclarecido primeiro. Nenhuma autorização já concedida é solicitada novamente.

## Inventário somente leitura

Arquivo evidence/PROD-ORDER-01-expanded-inventory.json, 2026-10-06T21:09:10.484Z:

- Cloud Asset: 230 registros, página completa sem token restante. Zero assets Functions/Eventarc/PubSub/Scheduler/Workflows/Extensions nos tipos retornados é resultado do índice, não garantia de ausência de todos esses recursos. Extensions não tem tipo correspondente comprovado nesse índice. Há UM Cloud Run Service, DUAS revisões e UM Cloud Build BuildTrigger.
- Cloud Run list direto: um serviço em us-west2; algumas regiões retornaram unreachable, portanto não declarar inventário mundial integral. Jobs: wildcard '-' retornou INVALID_ARGUMENT; consulta regional us-west2 retornou zero, sem inferir zero em todas as regiões.
- Pub/Sub topics/subscriptions: ambas consultas diretas retornaram zero, sem paginação.
- Functions v1/v2, Eventarc, Scheduler, Workflows e Extensions: SERVICE_DISABLED no projeto operacional; não declarar inventários diretos vazios. Tentativa somente leitura com quota project staging já existente para Functions/Eventarc também recusada por serviço desabilitado no projeto alvo. Nenhuma API habilitada ou recurso criado.
- Cloud Asset API já disponível foi usada sem export/bucket/feed/recurso. Queries não copiaram documentos/clientes/pedidos/financeiro reais nem valores de env/secrets.

## Runtime encontrado — auditoria antes de qualquer canário

Arquivo evidence/PROD-ORDER-01-runtime-audit.json, coletado somente leitura:

- Serviço: `projects/project-1300957a-ea82-4645-845/locations/us-west2/services/lidacomzapcrm-inteligente`.
- Revisão: `lidacomzapcrm-inteligente-00002-wqh`, criada 2026-07-03T01:13:46.732440Z, Ready/Active/ContainerHealthy SUCCEEDED. Serviço Ready SUCCEEDED, tráfego100% LATEST, ingress ALL. Isto não comprova requests/instâncias em execução, mas impede tratar o serviço como desativado apenas porque o trigger está disabled.
- Identidade existente: compute default 483558069545-compute@developer.gserviceaccount.com. Bindings locais observados: artifactregistry.writer, iam.serviceAccountUser, logging.logWriter, run.admin, storage.admin. Nenhum binding Firestore direto foi observado, mas isso não prova ausência de privilégios herdados/impersonação/SDK Firebase; não classificar como incapaz de escrever. Não impersonar nem alterar essa identidade operacional.
- Somente NOMES de env foram observados: SQL_DB_NAME, GEMINI_API_KEY, APP_URL. Valores não registrados; não presumir qual banco/integração usa ou atribuir operação de orders só pelo nome.
- Trigger Cloud Build368a078f-c3f0-4690-a2a3-5d88921a2dd2 aponta a CrmZapIntelig/lidacomzapcrm-inteligente /^main$/ e está DISABLED. Mantido intacto; push da branch canônica não satisfaz seu filtro. Não executado/reativado.
- API do serviço/revisão retorna image='scratch', sem buildConfig/fonte verificável. Consulta de builds global retornou11 builds FAILURE, sem imagens de resultado, sem paginação. Nenhum deles comprova a origem da revisão Ready. Não correlacionar automaticamente um commit de build falho com artefato ativo. Região global consultada não comprova ausência de builds em outras regiões.

**Ainda não comprovado:** código/artefato efetivo servido por essa revisão, acesso indireto a Firestore, timers/listeners/rotas/integrações e efeitos sobre orders ou caminhos proibidos. Metadados não demonstram que existe um efeito lateral; também não permitem afirmar que não existe. A aplicação local/HEAD atual não prova o conteúdo desse deployment antigo.

## Gate atual

**GATE_OPERATIONAL_RUNTIME_PROVENANCE_REQUIRED.** Origem necessária para concluir auditoria do serviço já existente. Ação mínima: identificar/disponibilizar a fonte ou artefato correspondente à revisão lidacomzapcrm-inteligente-00002-wqh (commit/build/export original, por exemplo). Não solicitar senha/token/chave. Acesso somente leitura e não invasivo às fontes disponíveis já foi utilizado; não é seguro substituir essa revisão por redeploy ou alterar runtime/IAM para descobrir seu comportamento.

Com a fonte exata, auditar handlers/listeners/timers e acesso server-side/client SDK, reconciliar inventário e demonstrar segurança antes do passo de identidade temporária. Se o inventário continuar incompleto, manter fail-closed e apresentar o risco restante, sem habilitar APIs proibidas. Nenhuma suspensão, alteração de tráfego, redeploy, IAM amplo ou recurso pago está autorizada por este documento.

## Estado ao parar

Order criado0; audit cloud criado0; rule deploy0; IAM changes0; API enable0; flagDISABLED. Rollback e revogação não se aplicam porque não houve canário/identidade. Não afirmar que o banco inteiro está vazio ou que terceiros não alteraram registros. Main/default/arquivos pessoais preservados. SEC-01 obrigatória antes de rollout amplo, PLANEJADO. MKT-AUTO-01/preview/Meta devem seguir SOMENTE após canário fechado, conforme ordem humana; nenhuma frente foi antecipada. A autorização/requisito de Marketing/Venda Ativa continua no checkpoint fornecido pelo usuário, não é funcionalidade implementada.

Fontes oficiais consultadas em 2026-10-06: [Cloud Asset e consistência](https://docs.cloud.google.com/asset-inventory/docs/asset-types), [Cloud Run Service](https://docs.cloud.google.com/run/docs/reference/rest/v2/projects.locations.services), [Cloud Build resultados/proveniência](https://docs.cloud.google.com/build/docs/view-build-results), [IAM Firestore](https://firebase.google.com/docs/firestore/security/iam). Validação/CI e commits no ledger; nenhum segredo nos arquivos de evidência.
