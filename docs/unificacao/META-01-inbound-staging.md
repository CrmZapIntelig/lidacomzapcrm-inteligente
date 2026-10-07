# META-01 — inbound TEST em staging

## Checkpoint vigente — app criado / termos TEST (2026-10-07)

HEAD inicial8c943dbcb384a70e2d0f0e873f5a952773788d25. Usuário concluiu reautenticação; painel oficial confirmou **LidacomZapCRM / App ID1480563193903800 / Business ID1694546150694544**, status **Não publicado**. GATE_META_INTERACTIVE_LOGIN_REQUIRED RESOLVIDO. Criação autorizada encerrada, não criar segundo app. Valores pessoais/credenciais omitidos.

Caso de uso WhatsApp → Configuração básica → **Etapa1.Experimente**: portfólio lidacomdigital fixo; UI oferece número oficial TEST para no máximo5 telefones. **Nenhum destinatário selecionado, nenhum número configurado e nenhum envio.** Não avançar para Configuração da produção nem usar conta da agência/ativos do restaurante.

Botão **Continuar** aceita termos adicionais: [Termos do Facebook para o WhatsApp Business](https://www.whatsapp.com/legal/FB-terms-whatsapp-business) e [Termos de Hospedagem da Meta para a API de Nuvem](https://www.facebook.com/legal/Meta-Hosting-Terms-Cloud-API). **GATE_META_TEST_TERMS_ACCEPTANCE_REQUIRED** na hora da ação: aceite juridicamente vinculante distinto dos termos já aceitos na criação do app. Autorização genérica não substitui essa confirmação da política de navegador. Tela preparada/privada fora do Git; botão não acionado.

Após confirmação, configurar somente recursos TEST oficiais, sem sender/número real/outbound. Destinatário autorizado e primeira mensagem inbound manual continuam gates próprios quando necessários. App SaaS Lidacom e ativos próprios do Prato Mineiro separados; Business Verification REJEITADA é pendência separada, sem contorno. Callback público mínimo/worker privado/secrets server-side ainda pendentes; STG-03 privado sintético preservado, não público.

Fontes desta continuidade: painel/UI oficiais inspecionados em2026-10-07; consulta web get-started/documentation/business-messaging retornou429, não considerada documentação técnica lida. Limite5 é oferta da UI TEST, não quota comercial/provider inventada. Inbound real ainda NÃO VALIDADO, Meta/RCS/outbound DISABLED.

## Checkpoint atual — reautenticação na criação do app (2026-10-07)

HEAD inicial8534e33dbc2552eac124675af9682fa911abece0, branch codex/unificacao-gestao-inteligente/PR4draft. Restrição trusted-device anterior resolvida pelo usuário; cadastro Developer e acesso ao painel comprovados nas etapas posteriores. Não criar outro cadastro/portfólio para contornar verificação.

Proprietário SaaS confirmado: lidacomdigital/Business ID1694546150694544/LIDACOM BUSINESS EVOLUTION. Prato Mineiro é cliente piloto e deverá manter ativos próprios separados; onboarding real exige GATE_PRATO_MINEIRO_OWN_META_ASSETS_ONBOARDING_REQUIRED. Conta Lidacom Digital Agência não selecionada. Business Verification REJEITADA permanece pendência separada.

Usuário autorizou especificamente a criação na revisão final. Botão Criar aplicativo acionado **uma vez** para LidacomZapCRM/caso de uso WhatsApp/empresa lidacomdigital. Meta abriu diálogo oficial **Digite sua senha novamente**, antes de comprovação de criação. **GATE_META_INTERACTIVE_LOGIN_REQUIRED**: usuário autentica diretamente na janela oficial; nenhuma senha/2FA/token pedida pelo chat, coletada ou registrada. Não repetir criação enquanto o desafio estiver aberto. App ID inexistente na evidência; criação ainda NÃO CONFIRMADA, nenhum WABA/test phone/subscription/secret criado.

Após autenticação, verificar resultado e assets existentes antes de prosseguir somente com recursos TEST. Receiver público mínimo separado do worker privado; secrets server-side; outbound/canSend DISABLED. Não registrar número real do restaurante. Primeiro inbound requer mensagem TEST manual; primeiro outbound exige autorização própria. STG-03 privado/sintético não equivale a inbound Meta real. Preview permanece offline, produção/main/default preservados.

Documentação técnica oficial de Cloud API/webhooks deve ser consultada antes da configuração. Tentativas web anteriores retornaram429/inacessível; não usadas como fonte técnica verificada.

## Checkpoint histórico — trusted device (2026-10-03)

2026-10-03. HEAD inicial: 29dd5e5f990b6f6ef6142312e9b248a63731fbae. PR #4 draft.

**GATE_META_TRUSTED_DEVICE_REQUIRED**. O usuário informou restrição temporária de segurança da Meta por dispositivo/contexto não habitual. O erro não foi reinspecionado por novas tentativas. Cadastro Developer permanece incompleto; nenhuma conta alternativa, App/WABA, subscription, credencial ou callback público foi criado nesta continuidade.

META-01 permanece pausada neste ponto. Não repetir login/registro. Retomar somente quando o usuário informar que a Meta voltou a permitir cadastro Developer. STG-03 privado/sintético não equivale a inbound Meta real. Meta/RCS e outbound continuam DISABLED.

Próxima ação humana para esta frente: resolver a restrição diretamente na Meta e informar a liberação. Depois auditar assets existentes, separar receiver público do worker privado e configurar secrets server-side, sem primeiro envio automático. Enquanto isso, trabalho independente local ORDER-01/OPS-01 autorizado.
