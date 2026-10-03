# Gate — integração visual bloqueada

## Atualização UNI-08 — 2026-09-30

O usuário autorizou explicitamente a opção 2. A entrada local independente foi criada e validada, sem importar App/Firebase/Auth/Firestore/providers reais. Gate RESOLVIDO somente para http://127.0.0.1:4178/, fixtures e backend NONE. Evidências em UNI-08-integracao-visual-offline.md. Hosting não publicado. Próxima parada: GATE_LIVE_INTEGRATION_REQUIRED (GATE-LIVE-INTEGRATION.md). O texto abaixo preserva o estado histórico anterior à autorização.

DATA: 2026-09-30. Controlador contínuo fornecido pelo usuário, seções 21, 25 e 38.

GATE_ID: **GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED**.

MOTIVO: src/lib/firebase.ts e App.tsx conectam Auth/Firestore operacional diretamente;
nenhum projeto staging, modo mock isolado ou entrada local segura foi comprovado.
URLs de Hosting existentes não comprovam isolamento. Não iniciar UNI-08.

RISCO: preview da SPA completa permitiria acesso aos dados/configurações operacionais
do Prato Mineiro. Build local e CI de núcleo não comprovam backend seguro para uso visual.

OPÇÕES:

1. Comprovar e autorizar projeto staging já existente, com dados sintéticos e isolamento.
2. Autorizar criação de entrada visual local/preview offline que não importe App.tsx,
   Firebase/Auth/Firestore/provider, usando fixtures explícitas e os novos núcleos.
   Essa entrada ainda precisa ser implementada/validada; não existe hoje.
3. Autorizar separadamente novo projeto Firebase de staging. Não criado nesta execução.

RECOMENDAÇÃO: opção 2, preservando a SPA operacional e preparando isolamento antes
da UNI-08. Exige nova autorização porque o controlador permite ambiente seguro existente
e manda parar quando nenhuma opção existente for comprovada; não autoriza presumir isolamento.
Não modificar backend, criar projeto/secret ou publicar Hosting para contornar este gate.

ESTADO DO GIT:

- Root C:/Users/dfant/LidacomZapCRM.
- Branch codex/unificacao-gestao-inteligente.
- HEAD funcional final 73a1f886d8b2bb482d89f13954d0060020a1f248, push confirmado.
- Main local/remota 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd, preservada.
- .vscode/extensions.json modificado e v1.9.8.4-local-backup.patch não rastreado,
  preservados/excluídos de todos os commits.
- Fechamento documental em commit `Record continuous execution results and visual isolation gate`.
- PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/pull/4, DRAFT, não merged;
  auto-merge não habilitado. Não há tag live/deploy.

FASES EXECUTADAS: REC-01, pré-flight/CI offline, UNI-05, UNI-06 e UNI-07.
UNI-08 não iniciada. Testes finais 86/86, strict/build aprovados; 21→21, zero novos.
CI funcional final verde: push 36743034767 e PR 36743037336.
PREVIEW STATUS: BLOCKED. PREVIEW URL: nenhuma. FIREBASE PROJECT / CHANNEL: nenhum
selecionado para preview. Site default existente não foi alterado.

ARQUITETURA FINAL: contratos/projeções legadas → audience explícita → eligibility
central → orçamento/fila offline → drafts SIMULATION → eventos/journal/timeline/
oportunidade scoped. Marketing e Dispatch separados; Contact/Opportunity/Order separados.

DISPONÍVEL NO NÚCLEO: snapshots, público explícito/revisão, preparo personalizado,
dedupe por contato/endereço, ordem estável/append, budget por tenant/campanha/dia/fuso,
lease/retry/cancelamento, seleção única/fallback, payload de draft para futura conversa,
eventos de draft e oportunidade RASCUNHO sem regredir histórico.

AINDA OFFLINE/AUSENTE: telas UNI-08, armazenamento durável/concorrência distribuída,
send real, capability real, regra de janela live, receipts/read/reply, workers,
providers, migrações, eventos de pedidos e demais transições do funil operacional.
canSend=false e NOT_EVALUATED permanecem. Não há produção pronta.

PRESERVAÇÃO: os cinco fingerprints de fontes do SOURCE-AUDIT foram recalculados
com ordenação Unicode de path|size|mtimeMs|SHA256 e todos permaneceram idênticos;
isso inclui as duas raízes Gestão/Sucesso, worktrees, remote-audit e backups.
Diff de App/components/lib/types legados/Firebase/package é vazio desde 5403790.

INCIDENTE DE AUDITORIA: a consulta Firebase login:list retornou credenciais no resultado
da ferramenta. Nenhum valor foi escrito/versionado/reproduzido nos relatórios; consultas
posteriores filtraram metadados. Recomenda-se revogar a sessão CLI exposta e reautenticar
antes de novo trabalho cloud. Não foi executada revogação/logout por conta própria.

PRÓXIMA AÇÃO NECESSÁRIA: autorização de isolamento visual (preferencialmente opção 2)
ou evidência de staging existente; então validar ambiente e retomar UNI-08. Integração
live exige gate separado. A ação bloqueada não foi executada.
