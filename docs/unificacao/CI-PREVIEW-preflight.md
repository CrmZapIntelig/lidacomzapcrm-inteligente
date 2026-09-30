# CI-PREVIEW — pré-flight e gate

2026-09-30. REC-01 publicado em 7abdd0fcc5a3c5a3259aeb45bc38218ef5e57be2.
PR draft: https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/pull/4.
Sem merge/auto-merge. Fonte local: firebase.json, .firebaserc, package.json,
src/lib/firebase.ts, App.tsx, LoginView.tsx, vite.config.ts e .env.example.

## Evidências

Hosting serve dist e rewrite SPA. Projeto default e código apontam para
project-1300957a-ea82-4645-845. Auth e onSnapshot/setDoc/deleteDoc são diretos no
App; login é Firebase. MockData e mockRealtimeSubscribe não isolam esse backend.
Não há modo mock/staging/emulador ou entrada local isolada comprovados.

Firebase CLI 15.19.1 disponível/autenticada. Consulta read-only projects:list:
lidacomzap-gestao-inteligente, lidacomzapcrm e project-1300957a-ea82-4645-845.
Nenhum foi comprovado como staging autorizado. hosting:sites:list confirmou o
site default project-1300957a-ea82-4645-845, URL
https://project-1300957a-ea82-4645-845.web.app. Essa é URL existente, **não preview**.
Não consultadas coleções, regras ou dados operacionais. Nenhum deploy/init executado.

GitHub remote confirmado CrmZapIntelig/lidacomzapcrm-inteligente. API autenticada:
um workflow dinâmico CodeQL; zero repository Actions secrets; zero environments.
Valores de credenciais não fazem parte deste relatório. Uma consulta login:list
retornou material sensível no resultado da ferramenta; não persistido/versionado,
não reproduzido. Consultas seguintes filtram exclusivamente metadados.

Configuração CI adicionada somente após auditoria: unification-offline.yml executa
testes, typecheck estrito do núcleo, comparação exata do baseline conhecido de 21
diagnósticos e build. Sem secret, escrita externa, deploy ou acesso a Firebase.
Executa no push da branch e em PR; nenhuma implantação da main.
check-baseline.mjs rejeita qualquer diferença de arquivo/posição/código/mensagem,
mesmo que a contagem ainda seja 21. Valor esperado capturado antes da UNI-05.

## Gate

- GATE_ID: GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED.
- MOTIVO: frontend atual conecta backend operacional; nenhum staging/mock isolado comprovado.
- RISCO: uma URL de preview da SPA atual mantém acesso ao ambiente do piloto.
- OPÇÕES: comprovar staging existente; autorizar entrada frontend offline isolada;
  configurar projeto separado somente com autorização própria.
- RECOMENDAÇÃO: manter Hosting bloqueado; continuar UNI-05/06/07 internas. Parar
  antes da UNI-08 até existir preview ou ambiente local seguro validado.
- ESTADO DO GIT: branch codex/unificacao-gestao-inteligente, REC-01 7abdd0f;
  main 60fb91f; .vscode/extensions.json e patch local preservados.

PREVIEW STATUS: BLOCKED. PREVIEW URL: nenhuma. FIREBASE PROJECT: não selecionado
para preview. CHANNEL: nenhum. BUILD REC-01: aprovado. COMMIT: mensagem
`Add offline CI and record preview isolation gate`. Não é configuração Hosting
completa, nem evidência de deploy/live. Disponibilidade de CI será confirmada pelos runs.

## Correção de portabilidade do gate CI

Runs iniciais 36741628525/36741619971: instalação, 74 testes e typecheck estrito
passaram; comparação agregada por hash falhou mesmo com os mesmos 21 diagnósticos.
Não é evidência de novo erro TypeScript. A correção armazena as 21 assinaturas
explícitas em tools/unification/baseline.json, normaliza paths/EOL e compara arrays
ordenados por código Unicode (sem collation ICU dependente da plataforma).
Arquivo, linha/coluna, código e mensagem continuam obrigatoriamente iguais.
Nenhum erro legado é corrigido ou omitido. Aprovação remota aguarda novo run.

O run 36742004338 identificou a diferença exata: TypeScript retorna path absoluto
para campaignDispatchContract.ts (importado por outros módulos) e relativo para
outros diagnósticos. Conteúdo/linha/coluna/código/mensagem eram iguais. Paths agora
são relativos ao root de execução, tanto no baseline registrado quanto no run.
