# STG-01 — Firebase staging isolado

Data: 2026-10-02. HEAD inicial 7ae486ff99d33e4f9c9a589748a0a0a957e3c772; branch codex/unificacao-gestao-inteligente; PR #4 draft; main 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd. O controlador atual autoriza criar staging gratuito separado e publicar somente o preview isolado. Essa autorização substitui a parada anterior de PREVIEW-01 para este escopo, sem autorizar produção/merge/envio.

## Estado verdadeiro

**PREPARAÇÃO LOCAL IMPLEMENTADA / CLOUD NÃO PROVISIONADO.** Project ID lidacomzapcrm-staging é preferência ainda não confirmada como disponível. Não existe URL staging comprovada. Firestore, webhook público, worker distribuído, IAM/WIF e integração Hosting não foram provisionados nesta etapa. Nenhuma sessão Firebase antiga foi consultada ou usada. Histórico de login:list sensível exige reautenticação antes de acesso cloud. GATE_FIREBASE_REAUTH_REQUIRED é a próxima parada humana.

Default permanece project-1300957a-ea82-4645-845 em .firebaserc; firebase.json operacional permanece intacto. O alias staging só será adicionado após confirmar a existência/isolamento do projeto criado. Não registrar alias reservado como recurso já existente.

## Preparação testável

config/staging-environment.json é manifesto versionado **provisioned=false**, sem credenciais. firebase.staging.json serve exclusivamente dist-integrated, site explícito e CSP connect-src 'none'; nenhuma rewrite de backend, SDK ou SPA operacional. Canal **pr-4**, validade planejada de sete dias; não canal live.

Ambientes: development exige projeto demo-lidacomzapcrm para emulação; staging exige projectId isolado explícito e coerente; production identifica o projeto operacional apenas para validação de separação, sem deploy disponibilizado pelo novo comando. Não modificar src/lib/firebase.ts nem plugar SDK Firebase/Firestore em React. Variáveis APP_ENV, FIREBASE_PROJECT_ID, GCLOUD_PROJECT e GOOGLE_CLOUD_PROJECT não podem redirecionar staging ao operacional. Config inválida falha antes de executar Firebase.

`npm run check:staging` valida a preparação. `npm run deploy:staging-preview` exige provisionamento confirmado/alias/site/canal/build coerentes e falha atualmente antes de subprocesso/credenciais. FIREBASE_CLI_ROOT identifica instalação server-side da CLI; sua ausência não tem fallback para sessão global. A saída bruta da CLI é retida em memória e não impressa; logs mostram apenas estado sanitizado, projeto e canal.

## CI preparada, ainda sem deployment

Gates offline existentes preservados + testes/guarda staging. Job staging-preview depende deles e só considera PR #4 da branch canônica no mesmo repositório; não pull_request_target/forks/main. Ativação depende da variável STAGING_HOSTING_ENABLED=true, manifesto provisionado, alias e identidade federada verificados. Sem essa configuração, o job é skipped; CI verde não significa cloud publicado.

Plano sem chave duradoura no Git: Workload Identity Federation + identidade de deploy restrita ao staging. Variáveis de configuração: STAGING_FIREBASE_PROJECT_ID, STAGING_WORKLOAD_IDENTITY_PROVIDER, STAGING_DEPLOY_SERVICE_ACCOUNT; nunca tokens como variáveis de frontend. Arquivos gha-creds-*.json e cache privado ignorados. Permissão id-token:write existe apenas no job staging; nenhuma automação main → production, auto-merge ou Functions.

A compatibilidade Firebase CLI 15.19.1/ADC/WIF ainda deverá ser validada no projeto real após reautenticação; não é declarada operacional por existir YAML. IAM precisa de permissões mínimas Hosting e vinculação de trust específica ao repositório/branch/PR. Não gerar service-account key nem login:ci. Sem confirmação desse ambiente, não habilitar o job.

## Retomada pelo agente após login autorizado

1. Reautenticar em navegador, com logs sanitizados; não executar login:list nem registrar tokens. Verificar projetos por metadados filtrados, sem usar credenciais antigas como prova de sessão segura.
2. Criar LidacomZapCRM Staging / lidacomzapcrm-staging ou variação clara somente gratuita; parar se exigir billing, credencial externa ou recurso pago. Sem copiar dados operacionais.
3. Confirmar projeto/site/ausência de billing, adicionar staging preservando default e atualizar manifesto com fatos verificados.
4. Configurar identidade mínima segregada e GitHub staging, validar bindings e então habilitar preview. Deploy apenas dist-integrated no canal pr-4, nunca firebase deploy genérico ou canal live.
5. Confirmar URL, assets, CSP, fixtures, ausência de I/O e CI deployment real. Só então STG-01 concluído; seguir STG-02 atrás de ports mantendo journal local. STG-03 depende de persistência verde, billing/credenciais quando necessários são novos gates.

## Validação e limites

Pre-flight: 129/129 testes, stricts e AST aprovados, baseline 21 → 21, três builds verdes; CI no HEAD inicial push 37038932006 e PR 37038937351 success reconfirmada. Guarda staging tem 9 testes adicionais, incluindo execução do comando que recusa deployment antes de invocar CLI. Estado final/CI do commit no ledger. Aviso de chunk operacional >500 kB preexistente.

Nada desta fase modifica App/components/lib/types, offline-preview, dados operacionais, produção ou fontes históricas. Providers DISABLED; zero envio. Order operacional canônico permanece incompleto. Requisitos UX-OPS registrados separadamente, sem código financeiro ou redesign.

Fontes oficiais consultadas em 2026-10-02:

- https://firebase.google.com/docs/cli — projetos e ADC/CLI;
- https://firebase.google.com/docs/hosting/test-preview-deploy — preview channel usa recursos backend reais do projeto; por isso projeto separado e bundle isolado;
- https://firebase.google.com/docs/hosting/github-integration — integração de previews com PR;
- https://github.com/google-github-actions/auth — WIF sem chave duradoura, autenticação/credenciais temporárias; comportamento cloud ainda não exercitado aqui.
