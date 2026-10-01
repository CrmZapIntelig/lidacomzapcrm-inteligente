# Gate — ambiente staging separado

GATE_ID: **GATE_STAGING_PROJECT_REQUIRED**.

FASE: LIVE-00/01/02 e LIVE-03/04 PREPARATION local; retomada em 2026-10-01.

MOTIVO: a configuração atual não comprova um projeto staging separado. O controlador autorizado exige: “NÃO criar projeto cloud silenciosamente”. A preparação local não permite usar o backend operacional como staging.

CONCLUÍDO: políticas fail-closed, provider Meta sem transporte, ingresso/journal sintético com replay e fencing, canário revisável de um TEST/uma mensagem sem envio, receipts correlacionados, RCS desabilitado e fallback de um canal. O preview permanece isolado; não recebeu providers, Auth ou Firestore.

RISCO: journal local não equivale a store distribuído; faltam ambiente staging, credenciais gerenciadas, conta/subscription verificadas, webhook público e intenção outbound transacional. Preparação não comprova entrega real ou prontidão de produção.

AÇÃO MÍNIMA DO USUÁRIO: autorizar a criação de um projeto staging separado ou identificar um projeto existente isolado para auditoria. Nenhuma criação foi executada. A autorização de ambiente não autoriza envio.

PRÓXIMO PASSO DO AGENTE: auditar o ambiente autorizado sem expor tokens; se necessário, parar no gate de reautenticação antes de acesso cloud. Preparar persistência, IAM, secrets e receiver isolados dentro do escopo aprovado, validar isolamento e manter **GATE_OUTBOUND_CANARY_REQUIRED** antes do primeiro envio TEST. RCS mantém gate próprio de agente/canário.

HEAD / PR / CI: branch codex/unificacao-gestao-inteligente; HEAD funcional da fase identificado pelo commit Prepare disabled RCS drafts and safe single-channel fallback. PR https://github.com/CrmZapIntelig/lidacomzapcrm-inteligente/pull/4 draft. Resultados e SHAs comprovados no EXECUTION-LEDGER.md; main esperado 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd.

DECISÃO: parar antes de integração externa, primeiro envio, criação cloud, deploy live ou merge main. Não foram acessados dados operacionais ou usadas credenciais de provider.
