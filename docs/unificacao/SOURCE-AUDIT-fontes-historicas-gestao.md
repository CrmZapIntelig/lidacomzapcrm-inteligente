# SOURCE-AUDIT — Fontes históricas do Gestão Inteligente

Data: 2026-09-30, referência de calendário America/Sao_Paulo.
Auditoria de leitura. UNI-05 não iniciada. Único arquivo autorizado nesta entrega: este relatório.

## 1. Resumo executivo

Atualização posterior REC-01 (2026-09-30): a decisão **NÃO** abaixo registra o
baseline histórico 5403790. A recuperação seletiva agora foi implementada e
validada no CRM; [REC-01](REC-01-pre-requisitos-venda-ativa.md) comprova a liberação
**SIM para UNI-05 offline**. A lista original da seção 17 permanece como evidência,
com checklist correspondente na REC-01. Nenhuma liberação live foi concedida.

**UNI-05 pode começar usando apenas os contratos atuais da unificação? NÃO.**
Eles permitem projeções e um draft, mas não incluem o núcleo de fila, transições,
retry e decisão de canal que já existe nas fontes. Antes de implementar a venda
ativa offline, recuperar as referências e adaptar o subconjunto especificado na
seção 17, com testes, evitando reconstruir essas regras sem confrontá-las com o
material existente. Isso não exige importar todo o gateway nem ativar persistência.

As nove fontes solicitadas existem. As duas pastas internas `LidacomZap` são
**cópias idênticas**, com 143 arquivos e hashes SHA-256 iguais. São staging antigo,
não duas linhas independentes de desenvolvimento. As pastas principais diferem:
o Gestão versionado tem 293 arquivos auditáveis; Sucesso tem 317, com 24 caminhos
adicionais, 12 arquivos comuns alterados e 281 arquivos comuns byte a byte iguais.
Não há arquivo exclusivo do Gestão em relação a Sucesso nessa comparação.

O histórico Git contém implementações F1B-10, 12, 13, 14 e 15; F1B-11 é desenho
executável/testes de contratos, sem runtime novo. O staging F1B-13 é anterior à
versão final endurecida. F1B-14/15 são posteriores e não existem nesse staging.
`origin/main` do Gestão está em `db3c585`, merge da F1B-15; seu conteúdo é igual
ao HEAD local `0b13ef1`. Os refs foram confirmados diretamente no remoto com
`ls-remote`, sem fetch, checkout ou alteração do Git das fontes.

Sucesso preserva o núcleo de produto e gateway do Gestão, mas acrescenta
desacoplamento de identidade/configuração, auditorias e backups. Não apresenta
um worker, fila, janela ou venda ativa mais avançados que a versão Git.

Nenhuma fonte auditada fornece política definitiva de janela 24h, provider live,
EligibilityService completo, scheduler de 250 contatos/dia ou FunnelEngine
desacoplado pronto. Não confundir nomes de arquivos, enums, fixtures e rótulos
de teste com essas implementações.

## 2. Escopo, método e baseline do CRM

Abreviações usadas nos caminhos relativos abaixo:

- **G**: `C:/Users/dfant/lidacomzap-gestao-inteligente`.
- **S**: `C:/Users/dfant/LidacomGestaoSucesso`.
- **H**: `G/LidacomZap/staging/F1B-13-AI-STUDIO`, idêntico à cópia em S.
- **C**: `C:/Users/dfant/LidacomZapCRM`.
- **W**: `C:/Users/dfant/LidacomZapCRM.worktrees`.
- **R**: `C:/Users/dfant/LidacomZapCRM-remote-audit`.
- **B**: `C:/Users/dfant/LidacomZapCRM-backups`.

Pré-flight comprovado:

| Campo | Resultado |
| --- | --- |
| Root Git | C:/Users/dfant/LidacomZapCRM |
| Branch | codex/unificacao-gestao-inteligente |
| HEAD inicial | 3fbadecaa266d5722546f00c38157d25add48b76 |
| main / origin/main locais | 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd |
| Trabalho local prévio | .vscode/extensions.json modificado; v1.9.8.4-local-backup.patch não rastreado |

Método: inventário recursivo de arquivos, comparação de caminhos/tamanhos/SHA-256,
comparação adicional com CRLF normalizado, leitura de código/documentos/diffs,
parser TypeScript para declarações e testes, leitura de refs/logs/trees Git.
Excluídos node_modules, dist, .git, cache, .cache, .vite e coverage; links simbólicos
não foram seguidos. Backups e CSVs de comparação foram incluídos por seu valor
histórico. Datas de arquivos são auxiliares e podem refletir cópia, não autoria.
As contagens não somam fontes aninhadas como se fossem conjuntos independentes.

Não executados builds, testes, CLIs de produto, simuladores, instalações ou scripts
das fontes: alguns testes/CLIs criam temporários e planos. Contagens de testes neste
relatório são **definições estáticas encontradas**, não execuções aprovadas hoje.
O baseline de 21 erros e os 38 testes da UNI-04 estão registrados na documentação
da entrega anterior; não foram reexecutados nesta auditoria documental.

## 3. Fontes encontradas e inventário de arquivos

Todos os caminhos abaixo existem. Contagens incluem arquivos ocultos não excluídos.
Relevantes: extensões ts, tsx, js, json, md, patch, diff, txt, csv, yaml e yml.

| Caminho absoluto | Total / relevantes | src / services / docs / tools diretos | staging | Datas dos arquivos, UTC |
| --- | --- | --- | --- | --- |
| C:/Users/dfant/lidacomzap-gestao-inteligente | 293 / 281 | 52 / 51 / 15 / 19 | interno, 143 arquivos | 2026-09-03 a 2026-09-19 |
| C:/Users/dfant/lidacomzap-gestao-inteligente/LidacomZap | 143 / 138 | 0 / 0 / 0 / 0 | único conteúdo | 2026-09-15 |
| C:/Users/dfant/lidacomzap-gestao-inteligente/LidacomZap/staging | 143 / 138 | estruturas dentro de AI-STUDIO | 139 arquivos do candidato + 4 evidências | 2026-09-15 |
| C:/Users/dfant/LidacomGestaoSucesso | 317 / 299 | 53 / 51 / 33 / 19 | interno, idêntico | 2026-09-03 a 2026-09-23 |
| C:/Users/dfant/LidacomGestaoSucesso/LidacomZap | 143 / 138 | 0 / 0 / 0 / 0 | único conteúdo | 2026-09-15 |
| C:/Users/dfant/LidacomGestaoSucesso/LidacomZap/staging | 143 / 138 | estruturas dentro de AI-STUDIO | idêntico | 2026-09-15 |
| C:/Users/dfant/LidacomZapCRM.worktrees | 181 / 162 | em três checkouts; uma pasta vazia | não encontrado | 2026-07-24 a 2026-08-25 |
| C:/Users/dfant/LidacomZapCRM-remote-audit | 49 / 44 | 33 / 0 / 0 / 0 | não encontrado | 2026-08-01 |
| C:/Users/dfant/LidacomZapCRM-backups | 3 / 3 | 0 / 0 / 0 / 0 | não encontrado | 2026-07-30 a 2026-08-01 |

Estruturas de G/S: src/domain, events, services, repositories, tests, auth, views,
config; services/channel-gateway com providers, simulator e adapters/firestore;
tools/contact-bootstrap, contact-import e privacy; docs de fundação e fases F1B.
S tem também quatro diretórios de backups em docs e cinco auditorias txt na raiz.
H tem a estrutura de produto até o candidato F1B-13, sem downstream F1B-14 nem
adapters/firestore F1B-15. W/R são versões anteriores do CRM, não outro Gestão.

Packages/lockfiles:

| Fonte | package.json e scripts | Lockfiles relevantes |
| --- | --- | --- |
| G e S raiz | package idêntico; dev/build/preview/clean/lint/test, privacy:workspace:check, bootstrap:contacts:plan, contacts:import:preview/manifest, gateway:simulate; test usa Vitest | package-lock.json e bun.lock, idênticos entre G/S |
| H | package presente; scripts offline semelhantes; não inclui @google-cloud/firestore da F1B-15 | nenhum lockfile |
| W/attachment-pasted-text-1 e -94092967 | package CRM e package backend/dispatch-admission; lint=tsc; sem npm test | package-lock.json |
| W/integrate-commercial-rules-segmentation | package CRM antigo, sem npm test | package-lock.json |
| W/fix-settings-tab-props-rendering | pasta vazia, sem package | nenhum |
| R | package CRM antigo; lint=tsc; sem npm test | package-lock.json |
| B | nenhum package | nenhum |

G/S declaram packageManager npm@11.13.0; dependência @google-cloud/firestore existe
na raiz, isolada arquiteturalmente no adapter server-side. Isso não comprova que
dependências instaladas ou ambiente estejam prontos; nenhuma instalação foi feita.

## 4. Inventário Git e relação entre repositórios

| Fonte | .git / root | Branch / HEAD | Remote / status |
| --- | --- | --- | --- |
| G | .git próprio; root G | f1b-15-durable-persistence-adapter / 0b13ef1f2bfb741ff22dad9fcf7613a0c8dc40ba | origin: https://github.com/pratomineiromg-cpu/lidacomzap-gestao-inteligente.git; ?? LidacomZap/ |
| G/LidacomZap e staging | sem .git próprio; pertencem ao root G | herdam contexto acima, mas conteúdo não rastreado | status relativo ?? ./ ou ?? ../; não são branches próprias |
| S, S/LidacomZap e staging | nenhum .git, nem root ancestral identificado | sem branch/HEAD verificável | sem remote Git próprio |
| W | contêiner sem .git | consultar filhos abaixo | três worktrees Git + uma pasta vazia |
| R | .git é arquivo de worktree; root R | detached HEAD / 34b49aa922c35aee547a09407ad936b1f6a1aca6 | mesmo origin do CRM; limpo |
| B | sem .git ou root | não se aplica | três arquivos históricos |

Há **dois bancos de objetos/repositórios independentes**: CRM e Gestão. Os três
worktrees válidos de W e R compartilham o Git do CRM; não são quatro repositórios
independentes. S não deve receber um HEAD inventado por parecer cópia de G.
Sua equivalência parcial foi determinada por conteúdo.

No Gestão, main local=d118fd8, origin/main=db3c585. A leitura direta dos heads do
servidor confirmou db3c585 para main e 0b13ef1 para a branch F1B-15. O diff de
conteúdo entre 0b13ef1 e origin/main é vazio: o merge não adicionou outra versão
de produto. Não foi necessário alterar o checkout para inspecionar esses objetos.

## 5. Relação entre as duas pastas LidacomZap

Resultado A: **idênticas** no conjunto auditável. Em cada lado: 143 arquivos;
143 pares com mesmo caminho relativo, tamanho e SHA-256; zero exclusivos;
zero conteúdos diferentes. Inclui H e os quatro artefatos de comparação.

Isso não significa que as raízes G/S sejam idênticas: 24 caminhos adicionais em
S e 12 modificados são descritos nas seções 8/9. Nem significa que H seja igual
à versão final F1B-13: a comparação com commits demonstra que não é.

## 6. Staging F1B-13: baseline, candidato e alterações reais

Foram lidos os conteúdos dos quatro arquivos, não apenas seus nomes:

- LidacomZap/staging/F1B-13-CANDIDATE-DIFF.csv.
- LidacomZap/staging/F1B-13-CANDIDATE-DIFF-NORMALIZADO.csv.
- LidacomZap/staging/F1B-13-DIFF-REAL-CONTENTS.txt.
- LidacomZap/staging/F1B-13-LATEST-DIFF-SUMMARY.txt.

O DIFF-REAL registra baseline `c612bf2377a41719a428352ca85d2357daed85c6`, merge
da F1B-12, e candidato `C:/Users/dfant/LidacomZap/staging/F1B-13-AI-STUDIO`.
Esse caminho é a proveniência textual do artefato; o material auditado agora está
nas cópias aninhadas G/S. Não se atribui um commit ao export AI Studio.

Resumo histórico bruto: 136 modificados, três novos, três removidos.
CSV normalizado: 15 ALTERACAO_REAL, 121 IDENTICO_NORMALIZADO, três NOVO,
três REMOVIDO. Os removidos são assets/.aistudio/.gitignore, bun.lock e package-lock.
Os novos: docs/f1b-13-worker-identity-conversation-command-offline.md,
src/tests/f1b-13-worker-identity-conversation-command-offline.test.ts e README.md.

As 15 diferenças reais registradas no CSV são:

| Grupo | Arquivos |
| --- | --- |
| Núcleo funcional candidato | services/channel-gateway/inbound.ts, inboundWorker.ts, resolution.ts, providers/metaWebhookHandler.ts |
| Compatibilidade do ambiente/export | .env.example, package.json, src/firebase/firebase.ts, tsconfig.json, vite.config.ts |
| Ajustes do simulador/compatibilidade com resolução | services/channel-gateway/simulator/cli.ts, simulator/metaSecurity.ts |
| Testes ajustados | src/tests/f1b-12-inbound-worker-kernel-offline.test.ts, meta-batch-webhook-ingress-offline.test.ts, meta-live-prerequisites-offline.test.ts, meta-official-protocol-offline.test.ts |

O conteúdo atual de H foi reconferido diretamente contra o tree c612bf2, ignorando
CRLF: 139 arquivos candidatos; 122 iguais, **14 diferentes**, três novos e três
ausentes. **package.json atualmente é igual ao baseline**, embora o CSV antigo o
classifique como alteração real. Logo, o CSV é evidência histórica e não manifesto
exato da pasta atual. Não aplicar seu diff automaticamente.

Contra o commit final F1B-13 `a7f5f71`: 122 iguais, 16 diferentes, README exclusivo,
três ausentes. Contra 0b13ef1: 115 iguais, 23 diferentes, README exclusivo e 12
arquivos ausentes, incluindo F1B-14/15 e lockfiles. Contagens excluem os quatro
relatórios externos ao diretório candidato.

Diferenças funcionais relevantes, confirmadas em código e declarações TypeScript:

- H amplia outcomes de identity/conversation, mas seus reasonCode de falha são
  strings; o commit final usa GatewayErrorCode fechado e compatibilidade legada.
- H não tem creationIdempotencyKey em ConversationResolutionRequest; a versão
  final passa a chave do work item e rejeita NEW_CONVERSATION sem chave.
- H não inclui conversationCreated nas referências resolvidas; a versão final inclui.
- O caminho de inbound final distingue retryability e trata os outcomes por
  predicados compartilhados; H tem tratamento anterior menos protegido.
- dispatchStagedBatchItems final passa a chave na resolução. Ainda é helper
  legado de batch; não substitui o worker independente com commandHandler.
- F1B-14 acrescenta journal replay-safe e observabilidade ao worker; F1B-15
  acrescenta adapter async Firestore. Ambos faltam em H.

Conclusão: H registra um candidato real, mas não é o melhor source of truth do
kernel. Suas diferenças exclusivas de configuração/simulador/README não provam
implementação de produto mais avançada que nunca chegou ao GitHub. O núcleo
F1B-13 chegou ao Git em versão revisada, com seis arquivos no commit a7f5f71.
Não é possível atribuir cada ajuste de export a um commit individual: não há Git
interno no candidato. Há material local não versionado, mas sua autoridade é histórica.

## 7. Cronologia provável e fases posteriores

Datas de commits a seguir usam o offset registrado -03:00; datas dos arquivos
do inventário estão explicitamente em UTC. A ordem de commits prevalece sobre mtime.

| Data | Evidência |
| --- | --- |
| 2026-08-29 | scaffold de domínio, pedidos e DispatchQueueIdentity no Git do Gestão |
| 2026-09-02 | bootstrap de contatos e modo de leitura; commits 09d18ee/79fa9a9 |
| 2026-09-04 | F1B-05B/C/D, F1B-06/07/08/09 versionadas |
| 2026-09-05/06 | F1B-10 e merge; batch/admissão offline efetivamente implementados |
| 2026-09-08 | F1B-11, design e testes de persistência |
| 2026-09-12 | F1B-12 e merge c612bf2 |
| 2026-09-14/15 | export/comparações do candidato F1B-13, datas auxiliares |
| 2026-09-16 | F1B-13 final a7f5f71 e merge c5e7743 |
| 2026-09-17 | F1B-14 f52aef3 e merge d118fd8 |
| 2026-09-18 | F1B-15 0b13ef1; o timestamp do commit é 23:02 -03:00 |
| 2026-09-22 | S registra auditorias no caminho histórico C:/Users/GLM-235/LidacomGestaoSucesso e backups de desacoplamento |
| 2026-09-25 | merge F1B-15 em main remoto db3c585, confirmado nos refs |
| 2026-09-30 | CRM está na UNI-04, 3fbadec |

Fases posteriores à F1B-13 encontradas: **F1B-14 e F1B-15 implementadas**.
F1B-16 é mencionada como responsabilidade futura de hosted runtime/secrets/exporter
em docs/f1b-14-downstream-observability-offline.md. Não há fase F1B-16 implementada
nos arquivos ou heads enumerados. Não se afirma ausência em computadores/fontes
fora deste escopo. Notas de memória antigas sobre F1B-10 incompleta e PR F1B-15
ainda draft são superadas pelos commits e refs verificados nesta auditoria.

## 8. Código exclusivo ou diferente em Sucesso

Único arquivo adicional de produto fora de backups: **S/src/config/platformConfig.ts**.
Centraliza projectId/tenant/name em variáveis Vite e funções requireFirebaseProjectId /
requireTenantId. Mantém default do piloto; não implementa multiempresa.

12 arquivos comuns diferentes por hash (também diferentes após normalizar CRLF):

| Arquivos em S | Diferença funcional |
| --- | --- |
| .env.example | configuração por ambiente e tenant |
| index.html, metadata.json | nome/identidade da aplicação |
| src/firebase/firebase.ts | remove configuração fixa, exige seis variáveis e falha na ausência |
| src/repositories/FirestoreReadOnlyRepository.ts, firestore/emptyState.ts | tenant/name obtidos de platformConfig |
| tools/contact-bootstrap/planner.ts | deixa de exigir project/tenant fixos; exige identificadores não vazios e vínculo por contato |
| tools/contact-bootstrap/validator.ts | troca igualdade com projeto/tenant fixos por validação de presença; mensagens ainda citam identificadores antigos/placeholder |
| tools/contact-bootstrap/example-manifest.json | exemplo adaptado |
| tools/contact-import/pipeline.ts | DEFAULT_PROJECT_ID passa a vazio |
| src/tests/core.test.ts, local-contact-import.test.ts | troca referências de projeto por test-firebase-project e ajustes de formato |

Domínio, routing, Actions, EventEngine, gateway, F1B-14/15 e documentos de produto
são iguais entre G/S. Sucesso é uma cópia com desvinculação de infraestrutura,
não um novo motor comercial. Datas posteriores não tornam sua configuração
autoridade para o Firebase do CRM. Os testes alterados não foram executados e
não bastam para provar que o desacoplamento está validado.

## 9. Documentação exclusiva e backups internos

Os 24 caminhos exclusivos em S são exatamente:

```text
AUDITORIA-CIRURGICA-COMPLETA.txt
AUDITORIA-DESACOPLAMENTO-FINAL.txt
AUDITORIA-IDENTIDADE-HISTORICA.txt
AUDITORIA-PROJETO-ANTIGO.txt
AUDITORIA-VINCULOS-EXTERNOS.txt
src/config/platformConfig.ts
docs/_backup-config-antiga/firebase.ts.ORIGINAL-COPIA
docs/_backup-config-antiga/metadata.json.ORIGINAL-COPIA
docs/_backup-config-antiga/planner.ts.ORIGINAL-COPIA
docs/_backup-estrutura-20260922-210551/.env.example
docs/_backup-estrutura-20260922-210551/src_repositories_FirestoreReadOnlyRepository.ts
docs/_backup-estrutura-20260922-210551/src_repositories_firestore_emptyState.ts
docs/_backup-estrutura-20260922-210551/tools_contact-bootstrap_example-manifest.json
docs/_backup-estrutura-20260922-210551/tools_contact-bootstrap_validator.ts
docs/_backup-estrutura-20260922-210551/tools_contact-import_pipeline.ts
docs/_backup-pre-desacoplamento-20260922-201428/.env.example
docs/_backup-pre-desacoplamento-20260922-201428/index.html
docs/_backup-pre-desacoplamento-20260922-201428/metadata.json
docs/_backup-pre-desacoplamento-20260922-201428/package.json
docs/_backup-pre-desacoplamento-20260922-201428/src/firebase/firebase.ts
docs/_backup-pre-desacoplamento-20260922-201428/tools/contact-bootstrap/validator.ts
docs/_backup-pre-desacoplamento-20260922-201428/tools/contact-import/pipeline.ts
docs/_backup-testes-20260922-213327/src_tests_core.test.ts
docs/_backup-testes-20260922-213327/src_tests_local-contact-import.test.ts
```

As cinco auditorias são inventários e referências de identidade/vínculos, não
especificações de nova venda ativa. Algumas contêm grandes transcrições de buscas
e configurações; não devem ser copiadas para o CRM como código nem expor seus valores.
Entre os 18 arquivos de backups, 14 têm conteúdo idêntico a arquivos de G.
Quatro são intermediários sem par idêntico em G: validator/pipeline do backup de
estrutura e metadata/firebase do backup pré-desacoplamento. São variantes de
configuração/importação, não novos módulos de fila ou janela.

Exclusivos de G frente a S: **nenhum** no conjunto comparado. Exclusivos do tree
final G frente a H: módulos/testes/docs F1B-14/15 e lockfiles, descritos na seção 6.

## 10. Worktrees, remote-audit e backups CRM

| Fonte | Branch/HEAD e status | Relação com a unificação |
| --- | --- | --- |
| W/attachment-pasted-text-1 | agents/attachment-pasted-text-1, 60fb91f, limpo | ancestor; zero commits exclusivos; falta lifecycle/templates/results v1.9.8.x e UNI-02/03/04 |
| W/attachment-pasted-text-1-94092967 | agents/attachment-pasted-text-1-94092967, 60fb91f, limpo | mesma conclusão; cópia de checkout na mesma base |
| W/integrate-commercial-rules-segmentation | agents/integrate-commercial-rules-segmentation, f374c20; App.tsx/types.ts modificados, CommercialIntelligenceView.tsx/commercialSegmentation.ts não rastreados | ancestor; zero commits exclusivos; trabalho local antigo preservado |
| W/fix-settings-tab-props-rendering | pasta vazia, sem .git | nome não comprova implementação ou branch ativa nessa pasta |
| R | detached 34b49aa, limpo | merge v1.9.2 de 2026-07-26; ancestor, zero commits exclusivos |

W/integrate contém variantes locais não commitadas: CommercialRulesConfig em
src/types.ts; componentes PerfisTab/SegmentosTab/CampanhasTab; helpers de métricas
getLastPurchaseDate/getDaysWithoutPurchase/getFirstPurchaseDate/getTotalOrders/
getTotalSpent/getAverageTicket/getFavoritePaymentMethod/getPurchaseFrequency.
Os helpers/nomes não estão todos na versão atual, mas representam organização
anterior de inteligência comercial, não gateway ou fase de unificação mais nova.
Paridade exata do comportamento dessas variantes é **INCONCLUSIVA**, sem testes
executados nesta auditoria. Não sobrescrever código atual com essas cópias.

B tem somente:

- auditoria-CommercialIntelligenceView-2026-07-30.patch;
- extensions-cursor-2026-07-30.json;
- settings-cursor-2026-07-30.json.

O patch é UTF-16LE. A leitura correta mostra um hunk que reduz o arquivo alvo de
1.387 para 430 linhas e põe funções CentralInteligenteView/AutomacoesTab/EventosTab/
FluxosTab/TemplatesTab/ChatbotTab no caminho CommercialIntelligenceView.tsx.
Seu postimage tem a mesma extensão da Central atual, mas não é AST idêntico.
É evidência de uma substituição local de tela, não nova fundação comercial.
Não aplicar: alvo/conteúdo divergem e há texto com problemas de codificação.
Os JSONs são configuração de editor; nenhuma implementação de domínio foi encontrada.

## 11. Módulos e fases F1B reconstruídos

Classificação é relativa ao CRM unificado em 3fbadec. Existência de teste significa
arquivo/assertions presentes, não aprovação executada agora. G/S compartilham os
módulos listados; H contém somente a linha até candidato F1B-13.

| Fase / objetivo | Commit identificado / fonte | Principais arquivos e evidência | Situação no CRM |
| --- | --- | --- | --- |
| F1B-05A, bootstrap local | 09d18ee; fase citada como 05A no doc omnichannel | tools/contact-bootstrap/{cli,planner,validator}.ts, core.test.ts; geração de plano, não apply | AINDA NÃO INCORPORADA |
| F1B-05B, identidades/routing/capabilities | 920107d; G/S/H | src/domain/{types,omnichannel,routing}.ts; omnichannel-foundation.test.ts (24 definições estáticas) | PARCIALMENTE INCORPORADA: 39 declarações UNI-02, não factories/routing |
| F1B-05C, import CSV privado | b0c94b3; G/S/H | tools/contact-import, local-contact-import.test.ts, docs/local-contact-import-pipeline.md | AINDA NÃO INCORPORADA |
| F1B-05D, gateway offline | 849b7b5; G/S/H | services/channel-gateway/contracts, normalization, providers, retryPolicy, sanitizer; channel-gateway-offline.test.ts (32 definições atuais, inclui evolução) | AINDA NÃO INCORPORADA |
| F1B-06, readiness audit | 64b7432; G/S/H | docs/f1b-live-readiness-audit.md, testes/ajustes de invariantes; relato histórico de 170 testes | AINDA NÃO INCORPORADA: relatório de readiness do Gestão, não readiness CRM |
| F1B-07, pré-requisitos Meta/privacy | 7b4fc3b e 4e2b99f; G/S/H | rawWebhook, secrets, operability, stateMachines, outboundQueue; testes meta-live-prerequisites/privacy | AINDA NÃO INCORPORADA |
| F1B-08, protocolo offline | 684df19; G/S/H | providers/metaOfficialProtocol.ts; meta-official-protocol-offline.test.ts; evidência protocolar histórica | AINDA NÃO INCORPORADA |
| F1B-09, segurança webhook | 09a8df5; G/S/H | providers/metaWebhookSecurity, metaWebhookHandler, handshake/crypto; meta-webhook-security-offline.test.ts | AINDA NÃO INCORPORADA |
| F1B-10, batch/admission/ACK | e512c8c; merge ee03028; G/S/H | ingress.ts, persistence.ts, Meta decoder/handler; batch test (15 definições) e coordinate independence | AINDA NÃO INCORPORADA |
| F1B-11, desenho persistência/runtime | e91a530; G/S/H | doc f1b-11 + teste f1b-11-persistence-design-offline (15 definições); commit só doc/teste | DOCUMENTAÇÃO SOMENTE quanto a runtime novo; design testado no código existente |
| F1B-12, kernel inbound | a5f2f9d; merge c612bf2; G/S/H | inboundWorker.ts, command.ts, ingress reserveNext; teste f1b-12 (9 definições) | AINDA NÃO INCORPORADA |
| F1B-13, resolution/command | a7f5f71; merge c5e7743; G/S, candidato anterior em H | resolution.ts, inboundWorker/inbound/handler; teste f1b-13 (16 definições) | AINDA NÃO INCORPORADA |
| F1B-14, downstream/replay/observability | f52aef3; merge d118fd8; G/S | downstream.ts, inboundWorker, operability; teste f1b-14 (8 definições) | AINDA NÃO INCORPORADA |
| F1B-15, Firestore durable adapter | 0b13ef1; merge db3c585; G/S | adapters/firestore/{adapter,config,index,serialization}.ts; fake transaction test (9 definições) | AINDA NÃO INCORPORADA |
| F1B-16, runtime futuro | referência em doc F1B-14; sem commit/código encontrado | hosted runtime, HTTPS, secrets/exporter mencionados como futuros | DOCUMENTAÇÃO SOMENTE; implementação INCONCLUSIVA fora destas fontes |

Nomes de fase/commits não estabelecem readiness live. F1B-15 é async e não está
conectada ao runtime síncrono/in-memory. A versão local e remota do Gestão mantém
limites explícitos. O doc F1B-08 contém evidência histórica; a classe
WhatsAppMetaLiveDecoderPending ainda rejeita com OFFICIAL_PROTOCOL_NOT_VERIFIED.

## 12. Matriz de funcionalidades e gaps da unificação

| Funcionalidade | Fonte mais completa | Status no Gestão | Status no CRM unificado | Gap / recomendação |
| --- | --- | --- | --- | --- |
| Contact/identidades | G/src/domain/omnichannel.ts; C adapters | factories e defaults UNKNOWN | contratos/projeção presentes | recuperar factories/invariantes sem alterar Client |
| Marketing | C/src/utils/commercialSegmentation.ts e CommercialIntelligenceView.tsx | MarketingCampaign reduzida, não um motor rico | segmentação/templates/lifecycle/results e projeção | preservar CRM como autoridade comercial |
| Dispatch draft | C facade + G Actions | fila/draft simulado | draft explícito sem fila | manter ligação marketing/audience e ampliar núcleo offline |
| Fila comercial | G Actions/IRepository/MockRepository | QUEUED→DRAFT_PREPARED→SENT→REPLIED com efeitos mock | DispatchQueueEntry/PendingOutbound tipos; queue NOT_CREATED | extrair invariantes, nunca importar singleton de repositório |
| Fila outbound/lease/retry | G gateway/outboundQueue/stateMachines/retryPolicy | process-local, sem timer/provider | ausente | adaptar núcleo seguro offline, testar colisões e transições |
| Limite diário/250 | G MockRepository.ts:52 e Actions.ts:50 | default 250; slice por chamada | limite configurável no draft | falta orçamento acumulado por data/tenant/campanha; não tratar 250 como regra do provider |
| Omnichannel/routing | G/domain/routing.ts | decisão pura; UNKNOWN bloqueia | RoutingDecision apenas contrato | portar/adaptar decideRouting com contexto/tenant validados |
| Fallback | G/routing.ts:81-90 | BOTH_SMART prefere WhatsApp e cai para RCS | não executa routing | RCS→WhatsApp não foi implementado; direção é decisão explícita futura |
| WhatsApp | G providers/protocolo/security | preparação/decoding offline e testes sintéticos | nenhuma ativação | futura integração específica; não habilitar por enum |
| RCS | G providers/rcs-google.ts | capability/subscription/status sintéticos | identidade/contrato RCS | sem check real, agent/provisionamento ou send |
| Elegibilidade | C/utils/contactEligibility.ts + G availability/routing | estados de eligibility, sem serviço completo | consentimento/bloqueios; preferência WhatsApp no legado | combinar consentimento, canal/capability, frequência/política; adapter sozinho não basta |
| Janela/auto reply | C integrationBoundaries/facade | nenhuma política 24h ou auto reply encontrada; resposta cliente é simulação manual | NOT_EVALUATED, canSend=false | manter negativa; serviço futuro, não copiar regra inexistente |
| Conversation/messages | G types/resolution; C projeção | domínio + resolução offline | projections read-only | criação idempotente e associação por canal ainda faltam |
| Ingress | G ingress/Meta handler F1B-10 | batch/admissão atômica in-memory | ausente | referência futura; não pré-requisito de fila de venda ativa local |
| Worker | G inboundWorker F1B-12/13/14 | passo síncrono, um item, ack após COMPLETED | ausente | inbound não é scheduler/outbound; manter separado |
| Identity/conversation resolution | G resolution.ts | outcomes fechados e creationIdempotencyKey | projeções sem resolver | recuperar quando conectar ingress, nunca inventar Contact/conversa |
| Gateway command/downstream | G command/contracts/downstream | sete comandos; journal process-local replay-safe | ausente | não confundir com EventEngine/UI events |
| Opportunity/Funil | G types/EventEngine/repos | Opportunity com tenant/datas; efeitos automáticos acoplados | fronteira reduzida; ABSENT explícito | harmonizar contrato/estágios antes de Event Bus; não copiar efeitos atuais |
| Order | C tipos/fluxos + G contrato | createOrder antigo fixa CHAT/WHATSAPP/HUMAN_OPERATOR | adapters preservam modelos | CRM operacional prevalece; rejeitar origem fixa no núcleo unificado |
| Timeline/Event Bus | G EventEngine; C History adapter | emitEvent escreve timeline/funil; sem bus desacoplado | TimelineEvent projection, sem efeitos | mapear tipos e isolar handlers em fase própria |
| Persistência durable | G F1B-15 adapter | Firestore server async, não wired | ausente | fora de UNI-05 offline; não criar novas coleções |

## 13. Source of truth recomendado por domínio

Cada linha distingue melhor evidência disponível de prontidão. G pode ser lido
no tree db3c585/0b13ef1, que tem o mesmo conteúdo de produto; não usar H como default.

| Categoria | Autoridade/referência recomendada |
| --- | --- |
| 1. Contratos de domínio | C/domain para os 39 incorporados; G/domain/types.ts para Opportunity com tenant/datas e restante ainda não portado; reconciliação explícita |
| 2. Venda ativa | G/Actions.ts + IRepository/MockRepository/core.test.ts como invariantes; C facade como fronteira de integração |
| 3. Marketing | C inteligência comercial e Campaign legado; G somente separação conceitual Marketing/Dispatch |
| 4. Omnichannel | G/domain/omnichannel.ts e routing.ts, doc omnichannel; C contratos/projeções como consumidores |
| 5. Mensagens | G/domain/types.ts + gateway/contracts/normalization para origem/provedor; C Message/History para dados atuais |
| 6. WhatsApp | G providers/whatsapp-meta, metaOfficialProtocol/metaWebhookSecurity e docs de evidência; offline, não autoridade live atual |
| 7. RCS | G providers/rcs-google + fixtures/tests; capability real não disponível |
| 8. Janela de mensagens | C OutboundMessagingPolicyInput/queryMessagingWindowPolicy como fronteira segura; nenhuma implementação histórica apta |
| 9. Elegibilidade | C contactEligibility e preferências legadas; G disponibilidade/capability/routing; serviço unificado ainda precisa ser desenhado |
| 10. Fila | G outboundQueue/stateMachines/retryPolicy para transporte; G DispatchQueueEntry/MockRepository para negócio; manter modelos distintos |
| 11. Ingress | G ingress.ts, persistence.ts e providers/metaWebhookHandler.ts, F1B-10/11 |
| 12. Worker | G inboundWorker.ts em versão F1B-14, não candidato H |
| 13. Identity resolution | G resolution.ts final + testes F1B-13; não fabrica resultados persistidos |
| 14. Conversation resolution | G resolution.ts final/creationIdempotencyKey + testes F1B-13 |
| 15. Gateway command | G command.ts/contracts.ts/downstream.ts, F1B-12/14 |
| 16. Pedidos | C para fluxo operacional/dados; G Order canônico para projeção unificada |
| 17. Funil | G Opportunity/EventEngine como exemplos de comportamento; C fronteira; nenhum FunnelEngine desacoplado pronto |
| 18. Timeline | C History como histórico real; G eventos como semântica; tipos divergem e requerem mapeamento |
| 19. Event Bus | G AppEvent/emitEvent como referência; não é um bus genérico pronto para acoplar ao CRM |
| 20. Documentação técnica | G docs F1B e omnichannel + C docs UNI; S auditorias só para proveniência/desacoplamento |

## 14. Incompatibilidades e riscos que impedem cópia direta

1. **Actions.ts está acoplado ao repository singleton**, relógio/IDs e EventEngine.
   prepareCampaignQueue percorre todos os contatos, sem audience ou política por canal.
   processQueueDrafts escolhe a primeira conversa por contactId, sem canal/routing.
2. **dailyLimit é slice por chamada**. Repetir processQueueDrafts pode preparar
   mais lotes no mesmo dia; o teste chamado Daily Limit só verifica um lote de cinco.
   Não há scheduler ou orçamento diário acumulado comprovado.
3. **Routing preferencial é WhatsApp→RCS**, não RCS→WhatsApp. UNKNOWN não é disponível.
   decideRouting filtra contact/channel, não tenant; o consumidor deve validar contexto.
4. **OutboundQueue é referência local**, não durable. enqueue deduplica IDs de
   mensagem/correlação, mas não tem rejeição explícita de queueId reutilizado com
   outro conteúdo antes de records.set. Reforçar/testar colisão ao adaptar.
   ack local avança para DELIVERED por simulação; nunca usar como receipt real.
5. **Gateway inbound e fila de campanha são modelos diferentes**: states/ACK de
   inbound não representam enviado/respondido em DispatchQueueEntry. Não fundir enums.
6. **Opportunity diverge**: G inclui tenantId/datas e estágio com espaços/acentos;
   C usa fronteira com underscores, sem tenant/datas e orderId opcional. Não substituir
   o tipo silenciosamente. Timeline G usa createdAt/description; C usa tenant/title/
   occurredAt. Adapters são necessários, sem apagar History.
7. **ELIGIBLE no adapter não é autorização de envio**: C/compatAdapters projeta
   consentimento, mas não resolve preferredChannel, janela, frequência e capability.
   O legado C/contactEligibility bloqueia preferência incompatível com WhatsApp;
   não perder essa regra ao usar novas identidades.
8. **F1B-15 não compõe o runtime**: adapter async versus ports/worker sync;
   faltam composição async, índices/IAM e handlers duráveis. Não ativar na UNI-05.
9. **EventEngine não é puro**: escreve timeline e cria/transiciona oportunidades.
   Não é autorizado importar esse fluxo para a UI da unificação nesta auditoria.
10. **Configuração de S pertence a outro esforço**: exige novo Firebase e flexibiliza
    IDs de bootstrap. O CRM já tem ambiente e piloto; não transportar project IDs,
    secrets/configurações nem criar segundo produto.
11. **README/CSV e nomes podem estar defasados**: contagem de alterações do staging
    já diverge do conteúdo atual de package.json; logs de outro usuário/máquina são
    evidência de proveniência, não comandos autorizados nem estado da máquina atual.

## 15. Duplicatas e artefatos temporários

- G/LidacomZap e S/LidacomZap: duplicata integral de 143 arquivos auditáveis.
- G/S: 281 caminhos comuns com hashes iguais, incluindo o gateway final e domínio.
- 14 backups internos de S repetem conteúdo disponível em G; quatro são intermediários.
- W/attachment-pasted-text-1 e -94092967: mesma base 60fb91f, sem commits exclusivos.
- H: snapshot sem Git/lockfiles, relatório CSV e export AI Studio; referência histórica.
- Auditorias txt S: transcrições/inventários, não módulos novos.
- B: patch antigo e editor settings, não base de unificação.
- .vscode/extensions.json e v1.9.8.4-local-backup.patch em C: trabalho local fora do escopo,
  preservado e excluído de qualquer staging do relatório.

## 16. O que incorporar e o que não incorporar

Incorporar em futura etapa autorizada: referências de decisão de canal/defaults
UNKNOWN, transições explícitas, deduplicação, retry limitado, separação campanha/
audience/fila/execution, contratos de evidência e testes de invariantes offline.
Guardar contratos e testes de resolution/worker/downstream para fases de gateway.

Não incorporar automaticamente: Actions/repository/EventEngine singletons, telas
Gestão, FirestoreRepository/config/auth de outro app, platformConfig de S, exports
AI Studio, remoção de locks, valores Firebase, CLIs bootstrap/import apply, artifacts
de staging, backups, flags permissivas, ack simulado como entrega real, conexão
F1B-15 ou qualquer infraestrutura/provider live. Não migrar dados nem coleções.

## 17. Preparação necessária antes de UNI-05

**Decisão: NÃO liberar implementação usando somente os contratos atuais.**
O trabalho prévio deve recuperar o seguinte subconjunto de referência em G,
adaptado para núcleo puro/offline do CRM, com paths de origem exatos:

| Arquivo de origem em G | Parte necessária / tratamento |
| --- | --- |
| src/domain/routing.ts | decideRouting, seleção única e bloqueio UNKNOWN; acrescentar validação de contexto no consumidor |
| src/domain/omnichannel.ts | factories createContactChannelIdentity/createProviderCapabilities e validações/defaults, sem duplicar os contratos já incorporados |
| services/channel-gateway/stateMachines.ts | transições outbound explícitas; manter separadas dos status da fila comercial |
| services/channel-gateway/retryPolicy.ts | cálculo determinístico limitado de retry/backoff; sem scheduler |
| services/channel-gateway/outboundQueue.ts | port/semântica de dedupe, reserva/lease e retries em memória; adaptar/testar colisão, não copiar ack como delivery real |
| services/channel-gateway/contracts.ts e errors.ts | somente tipos/falhas transitivamente necessários ao subconjunto acima; sem importar stack/provider/persistence |
| src/tests/omnichannel-foundation.test.ts | extrair casos de disponibilidade, eligibility, canais e fallback |
| src/tests/meta-live-prerequisites-offline.test.ts | extrair casos de estados, fila outbound, lease, retry/idempotência necessários ao núcleo offline |
| src/tests/core.test.ts | extrair casos de dedupe/draft/associação resposta; reforçar orçamento diário, audience e canal; não importar suite que depende do repository global |
| docs/omnichannel-contact-messaging-foundation.md e docs/meta-live-prerequisites-offline.md | recuperar invariantes/limites junto ao desenho UNI-05; sem afirmar readiness live |

`src/services/Actions.ts`, `src/repositories/IRepository.ts` e `MockRepository.ts`
devem ser lidos como referência de regra comercial e vínculo entre draft/fila;
**não precisam nem devem ser portados integralmente** antes da UNI-05.
Arquivos acima são lista de recuperação/adaptação, não ordem de copiar byte a byte.
O recorte transitivo deve ser decidido numa tarefa própria antes de implementar
o fluxo funcional. Não existe “arquivo completo de EligibilityService/24h” a recuperar.

Ainda definir no desenho prévio: audience explícita e validada; orçamento diário
por tenant/campanha/data; execução com relógio/IDs injetados; cancelamento/replay;
binding correto contact/conversation/channel; eligibility unificada com preferências;
distinção clara entre simulado/preparado/enviado real. Até política verificada,
canSend permanece false. Esses itens são gaps novos de desenho, não código perdido.

F1B-10/11/12/13/14/15 devem permanecer referências das futuras fases de ingress/
worker/persistência. **Portar o gateway inteiro, async Firestore ou EventEngine
não é pré-condição da UNI-05 offline**. Nem recuperar Opportunity com efeitos
automáticos é exigência para uma fila de draft offline; harmonização ocorrerá
antes da fase que efetivamente usar funil/eventos.

## 18. Arquitetura recomendada após a auditoria

```text
UI e documentos atuais do CRM
  → application/unifiedDomainFacade (projeções legadas mantidas)
  → núcleo comercial offline (audience, elegibilidade, orçamento, drafts)
  → domínio omnichannel (identidades e decisão de canal)
  → port de fila outbound local e transições explícitas

Futuro e separado:
Provider ingress → admission/work queue → worker → command handler
Event contract → handlers de timeline/funil (ativação própria)
Async persistence ports → adapter Firestore (fase própria)
```

Marketing define público/objetivo; Dispatch define operação/configuração;
audience é entrada explícita; fila/execution são entidades distintas. Contact,
Opportunity e Order permanecem separados. Nenhum CRM por canal ou segundo banco.
O Gestão é referência funcional; desenvolvimento continua apenas no CRM.

## 19. Verificação e preservação

Nenhum arquivo de fonte foi criado/alterado/movido/renomeado/apagado; nenhum
checkout/fetch/reset/clean/install/build/test ou script de produto foi executado.
Inspeções Git usaram --no-optional-locks nas fontes. Comparações usaram leituras
de bytes/objetos; nenhuma cópia foi gravada no CRM. Não houve contato com Firestore
ou provider. A única operação de publicação permitida é o commit/push deste relatório.

Fingerprints de conferência incluem path relativo, tamanho, mtime e SHA-256 de
cada arquivo do conjunto auditável, excluindo caches e metadados Git:

| Fonte | Arquivos | SHA-256 do manifesto |
| --- | --- | --- |
| G | 293 | bb7bc3acd8c4d34a977374257b4ea48f5d7f52bdbf467097c8abaee02ba909be |
| S | 317 | 4e0a692bf5031d99072a9f2341981c417ab1b6bf5ccdf5f4fad89afad2a02a7d |
| W | 181 | 5eaef4c01c470f68713e5dad175f3f1b6a275716fdba3ee8e66d64e0a7f4f6b0 |
| R | 49 | fe54b6af9d7ee5844ba770b7c8a707e951f30b72e581291f946f1d865d6157d6 |
| B | 3 | 2c8763b84a18bc7132e85b8eb1b977414b9f239c116a2915d95efcbe7135504f |

Esses fingerprints foram obtidos antes de finalizar o relatório e reconferidos
na conclusão; não pretendem datar criação/autoria dos arquivos.

## 20. Limites finais e próxima ação

Auditoria concluída no escopo das fontes especificadas e refs Git acessíveis.
Não é prova de cobertura de todos os computadores, exports externos, branches
apagadas ou arquivos privados fora dessas pastas. Definições de testes não são
gates executados nem testes live. Não há alegação de produção pronta.

Próxima ação recomendada: tarefa de recuperação seletiva e desenho do núcleo
offline indicado na seção 17, seguida de nova autorização para implementar UNI-05.
Nenhum código foi portado, nenhuma fase funcional começou e main permanece intacta.
