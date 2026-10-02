# Gate — ambiente staging separado

## Estado atual — controlador contínuo de 2026-10-02

**Atualização prevalente após reautenticação autorizada:** GATE_FIREBASE_REAUTH_REQUIRED resolvido. STG-01 Hosting isolado e CI federada concluídos; STG-02 Firestore gratuito/ports/fixtures validados (CI final no ledger). Gate atual: **GATE_STAGING_BILLING_REQUIRED** para receiver HTTPS/worker Functions na STG-03. Billing=false, nenhum recurso pago criado. Ação mínima: autorização explícita de billing/Blaze somente no staging, com custos possíveis. Não solicitar login de novo. Depois: preparar/publicar receiver isolado e retomar até próximo gate Meta/credenciais/primeiro envio. O texto seguinte é registro histórico superado.

GATE_STAGING_PROJECT_REQUIRED resolvido **quanto à autorização** de criar ambiente gratuito separado; o projeto ainda não existe como fato comprovado. Próximo gate: **GATE_FIREBASE_REAUTH_REQUIRED**. A sessão anterior é potencialmente comprometida devido ao incidente login:list; não foi reutilizada/consultada. Ação mínima: **Autorize o login Firebase no navegador.**

Pronto: guardas fail-closed, configuração Hosting exclusiva dist-integrated/pr-4, testes e CI condicionada, UX-OPS registrado. Provisionamento/alias/URL/Firestore/webhook/WIF continuam pendentes. Depois: agente reautentica sem exposição de tokens, cria/verifica projeto grátis isolado, preserva default, publica só preview e avança STG-02 quando STG-01 estiver comprovadamente verde. Billing, credenciais Meta/RCS e primeiro envio permanecem gates humanos independentes.

O registro abaixo descreve a parada histórica anterior e não revoga a autorização nova.

## Registro histórico — LIVE PREPARATION

GATE_ID: **GATE_STAGING_PROJECT_REQUIRED**.

FASE: LIVE-00/01/02 e LIVE-03/04 PREPARATION local; retomada em 2026-10-01.

MOTIVO: a configuração atual não comprova um projeto staging separado. O controlador autorizado exige: “NÃO criar projeto cloud silenciosamente”. A preparação local não permite usar o backend operacional como staging.

CONCLUÍDO: políticas fail-closed, provider Meta sem transporte, ingresso/journal sintético com replay e fencing, canário revisável de um TEST/uma mensagem sem envio, receipts correlacionados, RCS desabilitado e fallback de um canal. O preview permanece isolado; não recebeu providers, Auth ou Firestore.

RISCO: journal local não equivale a store distribuído; faltam ambiente staging, credenciais gerenciadas, conta/subscription verificadas, webhook público e intenção outbound transacional. Preparação não comprova entrega real ou prontidão de produção.

AÇÃO MÍNIMA DO USUÁRIO: autorizar a criação de um projeto staging separado ou identificar um projeto existente isolado para auditoria. Nenhuma criação foi executada. A autorização de ambiente não autoriza envio.

PRÓXIMO PASSO DO AGENTE: auditar o ambiente autorizado sem expor tokens; se necessário, parar no gate de reautenticação antes de acesso cloud. Preparar persistência, IAM, secrets e receiver isolados dentro do escopo aprovado, validar isolamento e manter **GATE_OUTBOUND_CANARY_REQUIRED** antes do primeiro envio TEST. RCS mantém gate próprio de agente/canário.

HEAD / PR / CI: branch codex/unificacao-gestao-inteligente; HEAD funcional b5f7e9125ad537daa96289021df1abf90fa07816. CI push 36827648971 e PR 36827655989 success nesse SHA. PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/pull/4 draft. Fechamento documental e evidências no EXECUTION-LEDGER.md; main preservado 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd.

DECISÃO: parar antes de integração externa, primeiro envio, criação cloud, deploy live ou merge main. Não foram acessados dados operacionais ou usadas credenciais de provider.
