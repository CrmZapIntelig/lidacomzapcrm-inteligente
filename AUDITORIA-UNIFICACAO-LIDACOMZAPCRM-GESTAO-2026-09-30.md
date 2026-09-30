# Auditoria de unificacao: LidacomZapCRM + LidacomZap Gestao Inteligente

Data: 2026-09-30

## Objetivo

Cruzar o projeto atual **LidacomZapCRM** com o projeto **lidacomzap-gestao-inteligente** e responder se e possivel manter o LidacomZapCRM como projeto original, adicionando nele a estrutura/logica do LidacomZap Gestao Inteligente.

Resposta curta: **sim, e possivel**.

O caminho mais seguro nao e copiar o Gestao Inteligente como um segundo app dentro do CRM. O melhor caminho e manter o LidacomZapCRM como casca principal de produto, telas e publicacao, e incorporar gradualmente a logica do Gestao Inteligente como camada de dominio, servicos, adaptadores e regras operacionais.

## Baselines verificados

### LidacomZapCRM

- Caminho local: `C:\Users\dfant\LidacomZapCRM`
- Repositorio remoto: `https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente.git`
- Branch local atual: `v1.9.8.4-campaign-results`
- HEAD verificado: `a69aba9 Implement campaign result tracking`
- Estado local observado:
  - `.vscode/extensions.json` modificado
  - `v1.9.8.4-local-backup.patch` nao rastreado
- Preview Firebase ja gerada para essa linha:
  - `https://project-1300957a-ea82-4645-845--local-v1984-ycjlw3z8.web.app`

### LidacomZap Gestao Inteligente

- Caminho local: `C:\Users\dfant\lidacomzap-gestao-inteligente`
- Repositorio remoto: `https://github.com/pratomineiromg-cpu/lidacomzap-gestao-inteligente.git`
- Branch local observada: `f1b-15-durable-persistence-adapter`
- HEAD verificado: `0b13ef1 feat(f1b-15): add durable Firestore persistence adapter`
- Estado local observado:
  - `LidacomZap/` nao rastreado
- Preview Firebase ja gerada para essa linha:
  - `https://lidacomzap-gestao-inteligente--gestao-preview-r2ilqx00.web.app`

## Fontes analisadas

Foram usadas como evidencia, nao como instrucao automatica:

- Codigos locais dos dois projetos.
- Documentos exportados do desenvolvimento anterior:
  - `CHAT_EXPORT.md`
  - `CHAT_EXPORT (1).md`
  - `CHAT_EXPORT (3).md`
  - `chat_export (2).md`
  - `implementation_plan.md`
  - `implementation_plan (1).md`
  - `Paste August 28, 2026 - 7_55PM.txt`
- Documentacao interna do Gestao Inteligente, especialmente a fundacao omnichannel.
- Memorias anteriores de trabalho sobre os dois repositorios.

Observacao importante: `implementation_plan.md` e `implementation_plan (1).md` nao parecem ser plano funcional do produto; tratam principalmente de exportacao de conversa. Eles nao devem guiar arquitetura do CRM.

## Diagnostico geral

O LidacomZapCRM e o projeto mais completo como interface de produto. Ele tem telas, modulos comerciais, delivery, cardapio, clientes, pedidos, campanhas, resultados simulados e publicacao Firebase ja ativa.

O LidacomZap Gestao Inteligente e mais forte como arquitetura de dominio e operacao. Ele organiza melhor a logica que motivou o produto: venda ativa, disparo, fila, separacao entre campanha de marketing e campanha de disparo, contato omnichannel, provedores, conversas, mensagens, pedidos com origem e fluxo offline/fail-closed.

Portanto, a unificacao recomendada e:

**LidacomZapCRM permanece como projeto original e produto principal.**

**Gestao Inteligente entra como referencia/camada de dominio e infraestrutura a ser incorporada ao CRM.**

## Divergencias principais

| Area | LidacomZapCRM atual | Gestao Inteligente atual | Divergencia |
| --- | --- | --- | --- |
| Papel do projeto | Produto visual e operacional principal | Fundacao de dominio/operacao | CRM e mais app; Gestao e mais nucleo logico |
| Campanhas | Tem campanhas, inteligencia comercial, templates e resultados | Separa `MarketingCampaign` de `DispatchCampaign` | CRM ainda mistura planejamento, campanha e disparo em alguns pontos |
| Venda ativa | Existe preparacao/simulacao de disparos e resultados | Tem fila, rascunhos, limite diario, status e acoes de disparo | Gestao esta mais proximo do modelo desejado para venda ativa |
| Marketing vs disparo | Inteligencia comercial define campanhas e publico | Marketing decide quem/por que; Disparador decide como/quando enviar | Esta separacao precisa virar regra central no CRM |
| Contatos | `Client` concentra dados de cliente, canal e preferencias | `Contact` separado de identidades por canal | CRM precisa evoluir para contato omnichannel sem duplicar cliente por canal |
| WhatsApp/RCS | Possui tipos/canais e telas ligadas a WhatsApp/RCS | Possui contratos de canal, provider e roteamento | Gestao tem arquitetura mais limpa para omnichannel |
| Janela 24h | Nao ha evidencia suficiente de regra oficial completa | Arquitetura permite elegibilidade e politicas, mas ainda offline | Precisa virar politica central antes de envio real |
| Respostas automaticas | CRM tem simulacoes e historico em UI | Gestao tem conversas, mensagens, comandos e worker offline | Deve ser incorporado como fluxo operacional, nao apenas tela |
| Pedidos | CRM tem pedido/delivery/cardapio em estruturas existentes | Gestao propoe `Order` canonico com origem, canal e modo de criacao | Necessario adapter para nao quebrar pedidos atuais |
| Backend/provedores | CRM e mais frontend/simulacao, com partes auxiliares | Gestao tem `services/channel-gateway`, providers, inbound/outbound, persistencia | Gateway do Gestao deve entrar de forma gradual e desligada por padrao |
| Firebase | CRM esta publicado no projeto `project-1300957a-ea82-4645-845` | Gestao tem outro projeto/site Firebase | Nao misturar publicacoes/projetos sem decisao explicita |
| Testes/docs | CRM mais focado em app | Gestao tem docs e testes de fases F1B | Docs/testes do Gestao devem ser migrados como garantia da nova base |

## O que deve ser preservado no LidacomZapCRM

- Estrutura visual e operacional principal.
- Fluxos atuais de clientes, campanhas, inteligencia comercial, cardapio, pedidos e delivery.
- Colecoes e contratos existentes enquanto houver dados vivos.
- Compatibilidade com campos antigos.
- Publicacao Firebase atual do CRM.
- Resultado de campanha/simulacao ja implementado na linha `v1.9.8.4-campaign-results`.

## O que deve ser trazido do Gestao Inteligente

### 1. Separacao conceitual obrigatoria

O CRM deve passar a tratar duas coisas como entidades diferentes:

- **Campanha de marketing/comercial**: define publico, objetivo, segmentacao, motivo, oferta e resultado esperado.
- **Campanha de disparo/venda ativa**: define canal, fila, limite diario, elegibilidade, envio, resposta e acompanhamento.

Regra: uma campanha comercial pode gerar uma ou mais campanhas de disparo, mas elas nao devem ser a mesma entidade.

### 2. Modelo omnichannel de contato

Hoje o CRM usa `Client` como entidade principal. Isso pode continuar, mas precisa ganhar uma camada canonica:

- `Client` do CRM continua existindo.
- `Contact` vira o equivalente operacional.
- Identidades de canal ficam separadas:
  - WhatsApp
  - Google RCS
  - outros futuros canais

Regra: nao criar um cliente separado por canal. Um cliente pode ter varias identidades de canal.

### 3. Elegibilidade central

As regras de envio devem sair de componentes/telas e virar servico central:

- cliente nao bloqueado;
- cliente sem opt-out;
- consentimento quando aplicavel;
- deduplicacao;
- limite de frequencia;
- campanha ativa;
- canal disponivel;
- janela de 24h quando aplicavel;
- template compativel;
- ausencia de envio duplicado.

Regra: disponibilidade de canal nao e a mesma coisa que elegibilidade de envio.

### 4. Disparador de venda ativa

Trazer do Gestao a logica de:

- `DispatchCampaign`;
- `DispatchQueueEntry`;
- `PendingOutboundMessage`;
- limite diario;
- preparacao de rascunho;
- envio simulado/offline primeiro;
- status da fila;
- resposta do cliente;
- idempotencia para nao duplicar envio.

### 5. Roteamento WhatsApp/RCS

O CRM ja fala em WhatsApp e RCS, mas o Gestao organiza melhor:

- WhatsApp oficial;
- RCS Google;
- fallback;
- modo smart;
- decisao de canal sem disparo de teste real;
- canal desconhecido nao deve ser tratado como disponivel.

### 6. Pedido canonico

O CRM nao precisa apagar pedidos atuais. O ideal e criar compatibilidade:

- manter pedidos/delivery/cardapio atuais;
- introduzir um `Order` canonico;
- mapear origem:
  - `WHATSAPP`;
  - `GOOGLE_RCS`;
  - `DIGITAL_MENU`;
  - `POS`;
  - `QR_TABLE`;
  - `MANUAL`;
  - `AI_ASSISTED`.

Regra: pedido nao deve ser duplicado por canal.

### 7. Gateway de provedores

O gateway do Gestao deve ser incorporado desligado/fail-closed no inicio.

Nao deve haver envio real por WhatsApp/RCS apenas porque a tela existe ou porque o tipo `live` foi marcado. Antes de envio real, faltam validacoes de credenciais, provider, regras de 24h, opt-out, logs, Firestore rules e ambiente.

## Riscos se copiar tudo diretamente

1. Duplicar modelos: `Client` e `Contact`, `Campaign` e `MarketingCampaign`, pedidos do CRM e `Order` canonico.
2. Misturar dois projetos Firebase diferentes.
3. Quebrar telas atuais do CRM ao trocar modelos de uma vez.
4. Criar falsa impressao de envio real.
5. Perder dados existentes se colecoes forem renomeadas sem adapter.
6. Reintroduzir divergencias entre marketing e disparo.

## Caminho recomendado de unificacao

### Fase UNI-00 - Auditoria e decisao de base

- Manter este relatorio como referencia.
- Confirmar que o desenvolvimento continuara no LidacomZapCRM.
- Nao apagar o Gestao Inteligente; usa-lo como fonte de migracao.

### Fase UNI-01 - Preparar branch de unificacao no CRM

- Criar branch nova a partir do estado correto do CRM.
- Preservar alteracoes locais existentes.
- Separar arquivos locais que nao devem ir para o Git, como patch de backup e configuracoes pessoais.

### Fase UNI-02 - Trazer contratos de dominio

Adicionar ao CRM, sem mudar telas inicialmente:

- contatos omnichannel;
- identidades de canal;
- conversas;
- mensagens;
- campanhas de marketing;
- campanhas de disparo;
- fila de disparo;
- pedido canonico.

### Fase UNI-03 - Criar adaptadores de compatibilidade

Criar tradutores entre:

- `Client` do CRM -> `Contact`;
- `Campaign` do CRM -> `MarketingCampaign`;
- campanha operacional -> `DispatchCampaign`;
- pedidos atuais -> `Order` canonico.

Essa fase evita quebrar UI e dados existentes.

### Fase UNI-04 - Separar Marketing de Disparador na interface

Na UI do CRM:

- Inteligencia Comercial deve preparar publico, objetivo e campanha de marketing.
- Disparador deve preparar fila, canal, envio e acompanhamento.
- Resultados devem conseguir apontar de volta para a campanha comercial.

### Fase UNI-05 - Implementar venda ativa offline

Antes de envio real:

- preparar fila;
- gerar rascunhos;
- aplicar elegibilidade;
- simular envio;
- registrar status;
- registrar resposta simulada;
- impedir duplicidade.

### Fase UNI-06 - Implementar politica de janela 24h

Criar politica central para:

- conversa aberta;
- ultima mensagem do cliente;
- tipo de mensagem;
- template permitido;
- impossibilidade de envio livre fora da janela.

Essa regra deve existir antes de qualquer integracao real com WhatsApp oficial.

### Fase UNI-07 - Evoluir pedidos e respostas automaticas

Integrar:

- resposta automatica assistida;
- interpretador de pedido;
- rascunho de pedido;
- confirmacao humana quando houver ambiguidade;
- pedido canonico com origem/canal.

### Fase UNI-08 - Preparar provider real

Somente depois das fases offline:

- credenciais;
- secrets;
- Firestore rules;
- logs;
- auditoria de privacidade;
- opt-out;
- validacao de 24h;
- provider oficial;
- deploy controlado.

## Resposta direta a pergunta principal

Sim, e possivel manter o LidacomZapCRM atual e nele adicionar/implementar o LidacomZap Gestao Inteligente como evolucao.

Mas a implementacao correta nao deve ser "colocar um projeto dentro do outro". Deve ser uma fusao por camadas:

1. CRM continua sendo o produto principal.
2. Gestao Inteligente vira a referencia de dominio e operacao.
3. O CRM recebe os contratos, servicos e regras do Gestao de forma incremental.
4. As telas atuais continuam funcionando.
5. A venda ativa, o disparador, a separacao marketing/disparo, as respostas automaticas e a regra de 24h entram como evolucao controlada.

## Proxima acao recomendada

Atualizacao em 2026-09-30: UNI-01 e UNI-02 concluidas localmente na branch
`codex/unificacao-gestao-inteligente`. Foram incorporados 39 contratos de dominio,
conferidos contra o codigo do Gestao. Build e verificacao estrita dos contratos
aprovados; a verificacao global mantem 21 erros anteriores em outros arquivos.

Detalhes: [UNI-02 - Contratos de dominio](docs/unificacao/UNI-02-contratos-de-dominio.md).

Precisao sobre pedidos: o contrato atual do Gestao separa `entryPoint`, `channel`
e `creationMode`. A lista de origens conceituais acima nao representa um unico
enum a ser copiado. A implementacao incorporada preserva essas tres dimensoes.

Proxima entrega: UNI-03, adaptadores de compatibilidade entre os registros do CRM
e os contratos incorporados. Telas, persistencia e publicacao continuam na base
atual ate suas respectivas fases de integracao.

## Auditoria e fechamento UNI-03 — 2026-09-30

Branch verificada: codex/unificacao-gestao-inteligente; HEAD inicial a69aba9.
Os 39 contratos UNI-02 foram reconferidos pelo parser contra 0b13ef1 do Gestão.
Adaptadores locais encontrados foram preservados e corrigidos; histórico e
fronteiras locais foram adicionados. 13 testes e checagem estrita aprovados,
build aprovado com aviso de bundle; lint permanece com 21 erros, zero novos.
Não houve mudança de UI, Firestore, envio, migração, main ou deploy.
Referências remotas citadas foram lidas localmente, sem atualização de rede.
Detalhes e limitações: [UNI-03](docs/unificacao/UNI-03-adaptadores-legado-novo-dominio.md).

## UNI-04 — camada de aplicação, 2026-09-30

Pre-flight confirmou branch codex/unificacao-gestao-inteligente e HEAD 6a92a78.
UNI-02/03 publicadas no origin antes de iniciar UNI-04, com HEADs iguais.
Criada facade read-only em src/application, consumindo os adapters preservados.
Marketing só prepara Dispatch draft por chamada explícita com audiência; fila
NOT_CREATED, execução NOT_STARTED. Opportunity ausente permanece ABSENT.
Política de mensagens permanece NOT_EVALUATED, canSend=false.
38 testes aprovados (25 novos + 13 UNI-03), typecheck estrito e build aprovados.
Lint final: mesmos 21 erros anteriores, zero novos, comparados pela API TypeScript.
Nenhuma mudança em UNI-03, modelos, UI, Firestore, package, Firebase ou main.
Sem envio, migração ou deploy. Configuração pessoal e patch local preservados.
Detalhes: [UNI-04](docs/unificacao/UNI-04-integracao-camada-aplicacao.md).
UNI-05 não iniciada.

## REC-01 — recuperação seletiva, 2026-09-30

SOURCE-AUDIT 5403790 lido integralmente. Recuperadas factories/routing, grafo
outbound e retry, adaptadas semânticas de fila/lease/cancelamento como snapshots
imutáveis. Criadas audience explícita, eligibility central e orçamento diário
acumulado por tenant/campanha/data/fuso. Não houve cópia de árvore ou singleton.
59 testes, typecheck estrito e build aprovados; baseline 21 → 21, zero novos.
Gate de início UNI-05: SIM exclusivamente offline. UI/Firebase/main intactos.
Detalhes: docs/unificacao/REC-01-pre-requisitos-venda-ativa.md e EXECUTION-LEDGER.md.

## UNI-05 — núcleo venda ativa offline

74 testes aprovados, typecheck estrito e build verdes; baseline 21→21 zero novos.
Público explícito, eligibility central, personalização, drafts, fila estável,
budget por dia e seleção única de canal; toda execução SIMULATION/PREPARED_ONLY.
canSend=false e janela NOT_EVALUATED. Sem send, UI, Firestore ou provider.
PR #4 draft; Hosting bloqueado até isolamento backend. UNI-06 liberada offline.
Evidências e limites em docs/unificacao/UNI-05-venda-ativa-offline.md.

## UNI-06 — Marketing → Dispatch

Ponte explícita preserva QUEM/POR QUÊ e configuração operacional separada.
Snapshot com revisão/vínculo e chave determinística, sem recalcular segmentação.
79 testes locais, strict/build verdes, baseline 21→21 zero novos. CI em 7473b37
verde para push e PR; fonte de diagnósticos comparada por path relativo/linha/coluna.
Draft conserva endereço transitório para dedupe entre chamadas incompletas.
Sem UI/Firestore/provider; preview permanece bloqueado. UNI-07 liberada offline.
Detalhes: docs/unificacao/UNI-06-marketing-dispatch.md.

## UNI-07 — eventos/timeline/funil offline

86 testes, strict e build aprovados; baseline 21→21 zero novos. Eventos explícitos
de draft, journal idempotente, timeline com SIMULATION e ScopedOpportunity RASCUNHO.
Oportunidades existentes não regridem; Contact/Opportunity/Order separados.
Primeiro envio→LEAD definido, aplicação live bloqueada; nenhum send real emitido.
Histórico legado/UI/Firestore preservados. UNI-08 não iniciada: isolamento visual
não comprovado. Gate e próxima ação em CI-PREVIEW-preflight.md; detalhes UNI-07.
