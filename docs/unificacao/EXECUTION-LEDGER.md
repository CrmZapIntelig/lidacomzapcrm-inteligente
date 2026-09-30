# Execution ledger — Unificação

Projeto definitivo LidacomZapCRM Inteligente. Branch codex/unificacao-gestao-inteligente.
Data de execução 2026-09-30. Fontes históricas read-only. Main protegida em 60fb91f.
Commits/HEAD finais de cada fase são identificados pela mensagem única abaixo e
confirmados na entrada seguinte; evita incluir no próprio commit um hash impossível
de conhecer antes de criá-lo. Histórico Git é a resolução canônica desses marcadores.

## REC-01

- HEAD inicial: 5403790a60154bcd3f19718108d2bc9373946294.
- HEAD final / COMMIT: commit com mensagem `Recover offline active sales prerequisites from Gestao`.
- TESTES: 59/59 (21 novos + 38 anteriores), typecheck estrito aprovado.
- BUILD: aprovado; aviso de bundle grande preexistente.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0, mesmos diagnósticos.
- ARQUIVOS: src/domain/{offlinePrimitives,routing,dispatchPrerequisites}.ts,
  dispatchPrerequisites.test.ts; REC-01, SOURCE-AUDIT, relatório principal e este ledger.
- PREVIEW STATUS / URL / PR / FIREBASE PROJECT / CHANNEL: pendente pré-flight CI-PREVIEW; nenhuma publicação.
- RISCOS: capability explícita de fixture não é evidência live; snapshots exigem caller;
  orçamento offline não é quota de provider. Nenhum send/receipt real.
- DECISÃO DE GATE: verde offline; UNI-05 pode começar.

## CI-PREVIEW

- HEAD inicial / REC-01 final: 7abdd0fcc5a3c5a3259aeb45bc38218ef5e57be2.
- HEAD final / COMMIT: `Add offline CI and record preview isolation gate`.
- TESTES / BUILD: gates locais REC-01 59/59 e build verde; configuração CI sem deploy.
- ERROS ANTES / DEPOIS / NOVOS: 21 / 21 / 0; fingerprint 765fceec…fecd.
- ARQUIVOS: .github/workflows/unification-offline.yml, tsconfig.offline.json,
  tools/unification/check-baseline.mjs, CI-PREVIEW-preflight.md, ledger.
- PR: #4 draft, sem auto-merge. PREVIEW STATUS: BLOCKED; URL: nenhuma;
  FIREBASE PROJECT / CHANNEL: não selecionados.
- RISCOS / DECISÃO: GATE_PREVIEW_BACKEND_ISOLATION_REQUIRED. Conforme seção 25
  do controlador, continuar fases internas e parar antes da UNI-08.
