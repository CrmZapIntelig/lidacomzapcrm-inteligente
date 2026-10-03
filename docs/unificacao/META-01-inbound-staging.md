# META-01 — pausa por dispositivo não reconhecido

2026-10-03. HEAD inicial: 29dd5e5f990b6f6ef6142312e9b248a63731fbae. PR #4 draft.

**GATE_META_TRUSTED_DEVICE_REQUIRED**. O usuário informou restrição temporária de segurança da Meta por dispositivo/contexto não habitual. O erro não foi reinspecionado por novas tentativas. Cadastro Developer permanece incompleto; nenhuma conta alternativa, App/WABA, subscription, credencial ou callback público foi criado nesta continuidade.

META-01 permanece pausada neste ponto. Não repetir login/registro. Retomar somente quando o usuário informar que a Meta voltou a permitir cadastro Developer. STG-03 privado/sintético não equivale a inbound Meta real. Meta/RCS e outbound continuam DISABLED.

Próxima ação humana para esta frente: resolver a restrição diretamente na Meta e informar a liberação. Depois auditar assets existentes, separar receiver público do worker privado e configurar secrets server-side, sem primeiro envio automático. Enquanto isso, trabalho independente local ORDER-01/OPS-01 autorizado.
