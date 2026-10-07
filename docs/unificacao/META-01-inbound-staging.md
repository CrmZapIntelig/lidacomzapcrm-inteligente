# META-01 — inbound TEST em staging

## Contenção vigente — App Secret no retorno automático da ferramenta (2026-10-07)

HEAD inicial2a5d0dc1c911e3db5a2e67f7a1bf6106dfd1b55e. Usuário concluiu reautenticação; binding automático da aba devolveu árvore de acessibilidade incluindo App Secret visível. **Potencial exposição em tool output**, contrariando a restrição de não registrar credential material. Valor não reproduzido neste documento/evidência/PR/Git, não salvo no cloud, não usado para HMAC/send. Não presumir que o histórico da ferramenta possa ser apagado; considerar a chave comprometida até rotação.

Página recarregada para ocultar campo; controle Mostrar voltou, Redefinir não está exposto enquanto chave oculta. Nenhuma alteração de App Secret executada. **GATE_META_APP_SECRET_ROTATION_REQUIRED**: usuário realiza rotação diretamente em Configurações do app → Básico → Chave Secreta do Aplicativo → Mostrar → Redefinir, concluindo verificações da Meta. Não enviar chave/senha/2FA pelo chat. Política de navegador exige handoff para alteração de credencial de autenticação. Não usar a chave antiga em nenhuma etapa futura.

Após usuário confirmar rotação, não bindar aba/requisitar AX/DOM geral da página com chave visível. Preparar primeiro fluxo de entrada direta no Secret Manager staging sem retornar conteúdo sensível em tool output, screenshot, clipboard exportado ou arquivo local. Não continuar sem mecanismo seguro comprovado. Invalidar a chave anterior sem criar novo app/portfólio/WABA; assets TEST/zero token/outbound/produção preservados. Callback ainda vazio, worker privado e SIMULATION-only. Se a Meta indicar impacto em ativos existentes, interromper e revisar antes da confirmação de reset.

## Gate atual — reautenticação para App Secret (2026-10-07)

Após inventário TEST/documentação, Configurações do app → Básico → Mostrar abriu diálogo oficial **Digite sua senha novamente**. **GATE_META_INTERACTIVE_LOGIN_REQUIRED**: autenticação humana diretamente na Meta. App Secret permanece oculto/não coletado, nenhum token criado. Não pedir segredo/senha/código pelo chat. A configuração server-side já autorizada deve continuar após esse desafio, sem pedir confirmação genérica para repetir a mesma ação. Credencial somente no destino seguro staging descrito abaixo; nova exposição pública/grant relevante ainda exige revisão concreta quando ocorrer.

Um clique inicial Mostrar não foi despachado por interrupção do navegador; controle visível/habilitado e ausência de diálogo conferidos antes de uma nova ação, que abriu desafio. Sem repetição de criação de App/WABA/phone. Tela de autenticação preservada/recortada privada fora do Git. Callback/secrets/receiver cloud não configurados, worker privado mantido.

## Estado vigente — recursos TEST provisionados / secrets server-side (2026-10-07)

HEAD inicial85b3849422c6f24cb0243dbe2c3f571c5c77cdb6. Usuário clicou Continuar na Meta e aceitou termos diretamente; GATE_META_TEST_TERMS_ACCEPTANCE_REQUIRED RESOLVIDO. UI Etapa1.Experimente mostra Reivindicar um número de teste concluído: **+1 555 640-2386 / Phone Number ID1406670279191899 / WABA1670383058144564**. Recursos oficiais TEST provisionados pela Meta, vinculados ao app1480563193903800/portfólio1694546150694544; não são ativos do Prato Mineiro nem conta da agência. Nenhum número real cadastrado, destinatário selecionado ou envio. Campo access token Not generated yet; não gerar token de envio para configurar inbound prematuramente.

Ferramentas → Configurar webhooks abre seção de callback do painel denominada Etapa2.Configuração de produção, consultada **somente leitura do callback**. URL/token vazios, Verificar e salvar desabilitado. Registro de número, pagamento e envio não acionados. Alert da UI: app não publicado recebe apenas testes do painel; não prometer inbound humano pelo número TEST antes de provar suporte e avaliar requisitos de publicação. Publicação não autorizada por esta fase.

**GATE_META_SECRET_CONFIGURATION_REQUIRED**: validação real HMAC necessita App Secret do app SaaS server-side; challenge necessita verify token forte server-side. Plano concreto: exclusivamente Secret Manager de **lidacomzapcrm-staging**, nomes propostos `meta-test-app-secret` e `meta-test-verify-token`; sem access token persistido, Git, frontend, chat, logs ou credencial operacional. App Secret não revelado/coletado e secrets não criados. Configuração real de credencial/acesso precisa confirmação específica conforme política do navegador; não pedir valor pelo chat. Confirmar inventário de secrets antes de criar, para evitar duplicação. Não acessar segredo de outra conta/app.

Receiver público dedicado e worker privado seguem pendentes de implementação/deploy validados; não tornar stagingIngress público. Auditoria de staging-functions/index.ts/syntheticIngress.ts/localInboundJournal.ts confirmou contrato atual **SIMULATION-only**: IDs synthetic, endereços de fixture e conteúdo TEST fechado. Um payload real Meta não pode ser tratado como SIMULATION para vencer guards. Evolução deve reutilizar ports/fila/lease/fencing, versionar envelope STAGING TEST sem quebrar fixture local, binding exato App/WABA/phone e allowlist humana futura, persistir mínimo/sanitizar, canSend=false. A provisão de ativos TEST não torna o pipeline operacional.

### Documentação oficial verificada no navegador

Consulta web inicial retornou429, mas o navegador autenticado leu as páginas oficiais em2026-10-07:

- [Webhooks overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/), atualização2026-06-26: campo messages cobre inbound/status; assinatura por campos e permissões; até3MB; retry/dedupe e alguns eventos limitados em Dev. Escopo local pretendido messages somente; não ampliar dados/permissões por conveniência.
- [Criar endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/), atualização2026-06-17: TLS válido, challenge GET/token armazenado no servidor, POST application/json/X-Hub-Signature-256 HMAC com App Secret, batch e dedupe. Save do dashboard pode configurar callback sem gerar access token; assinatura em WABA pode ter etapa adicional ainda não provada. Limites TEST locais menores devem permanecer explícitos; não declarar cobertura total Meta.

11/11 testes específicos Meta provider/synthetic ingress passaram nesta continuidade: assinatura/challenge/raw body, payload inválido, durable ACK/replay, no-send draft, retry/lease/crash/final failure. São subconjunto dos213 existentes, não somar ao total. Sem nova prova cloud/inbound real. Callback não salvo, subscription não configurada, worker privado/produção/default/main preservados; RCS/outbound DISABLED. Próximo: configurar secrets com mecanismo seguro, implementar/validar receiver dedicado antes de qualquer exposição, testar painel TEST; gates de publicação real/sender/inbound/outbound permanecem conforme necessidade.

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
