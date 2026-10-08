# META-01 — inbound TEST em staging

## Estado vigente — Secret Manager TEST habilitado / entrada humana segura (2026-10-07)

Correção INFRA-02 publicada primeiro no commit **97c77ce5ff64c2e25c9a0c15d82e241ae088ded5**, somente três documentos; quatro testes de proteção/diff check PASS. CI push37705319476/PR37705323127/análise37705319887 success. Usuário depois autorizou especificamente ativação/secret TEST/runtime mínimo no anexo de continuidade; operacional e lidacomzapcrm não classificados continuam fora do escopo.

Project ID e Project Number confirmados via Resource Manager antes de qualquer mutação: **lidacomzapcrm-staging / 854899277909 / ACTIVE**. `secretmanager.googleapis.com` ENABLED somente nesse projeto. A ativação inicial retornou operação com ponto no nome; verificador local restritivo interrompeu polling. Retomada consultou a mesma operação já existente, sem segundo enable, e comprovou conclusão/estado ENABLED.

Inventário exato dos dois nomes confirmou ausência antes da criação. Criados com replicação automática/labels staging/test/meta-01, sem versões de produção:

- `meta-test-verify-token`: **uma versão ENABLED**, gerada no processo server-side por crypto.randomBytes(48), transmitida diretamente à API oficial TLS/addVersion. Não impressa, salva localmente, registrada no Git/artifact/frontend nem lida de volta; prova contém somente metadados.
- `meta-test-app-secret`: recurso criado, **zero versões**. Nenhum valor antigo ou novo capturado/utilizado/transmitido pelo agente.

**GATE_META_SECRET_SECURE_INPUT_REQUIRED**: o usuário exige inserção sem captura do valor pela ferramenta. Não foi comprovado mecanismo automático que atenda essa condição; ler DOM/clipboard e reenviar capturaria a chave mesmo sem imprimir. Portanto ação humana mínima: na aba Meta do app1480563193903800, copiar a chave **nova já redefinida** diretamente para o campo Valor do secret, no diálogo aberto Adicionar nova versão do Secret Manager staging/meta-test-app-secret, e salvar uma única versão. Não enviar valor no chat/arquivo. Formulário observado e screenshot somente enquanto vazio; não fazer AX/DOM/screenshot do campo depois da entrada humana. Após salvar, conferir apenas metadados/estado/quantidade via API, sem :access por operador.

Nenhum IAM runtime concedido ainda: configuração do receiver dedicado que realmente precisa dos secrets permanece pendente. Menor privilégio por secret/runtime, sem acesso frontend/chave JSON; não confundir criação com autorização efetiva ao worker existente. Receiver/worker continuam sintéticos/privados existentes, callback/subscription não configurados, canSend=false, zero outbound/cliente real. Billing/budget/default/projeto operacional/main não alterados. Budget alerta não é hard cap; custo compartilhado previamente explicado mantém-se aplicável.

Prova sanitizada: docs/unificacao/evidence/META-01-secret-manager-test.json. Fonte REST oficial consultada 2026-10-07: [create cria recurso sem versões](https://docs.cloud.google.com/secret-manager/docs/reference/rest/v1/projects.secrets/create), [addVersion](https://docs.cloud.google.com/secret-manager/docs/reference/rest/v1/projects.secrets/addVersion). Só entrada humana falta neste bloco; não declarar META-01 concluída.

Abaixo checkpoints históricos; suas frases de API desativada/gates anteriores não descrevem o estado vigente.

## Estado vigente — rotação informada / ativação Secret Manager staging (2026-10-07)

HEAD inicial9b6ee8da8911a2fffce6694a73e1172f318ea0a3. Usuário informou chave redefinida e opção0horas salva. GATE_META_APP_SECRET_ROTATION_REQUIRED resolvido por confirmação humana; não testar/reutilizar chave anterior. O intervalo é interpretado como prazo da chave antiga, mas texto exato e revogação não foram verificados independentemente. Pergunta curta opcional apresentada para distinguir expiração antiga/nova; nenhum segredo necessário no chat. Nova chave não lida/transmitida pelo agente.

Aba Meta localizada por metadados e binding sem retorno AX; inspecionados somente nomes de botões, nunca valores de campos. Não usar cua.getTab/getAXState/domSnapshot geral nessa página após reautenticação. Preparar transferência direta entre campos de origem e destino autorizado sem imprimir material, screenshot do segredo, clipboard exportado, arquivo intermediário ou comandos com valores; interromper se a ferramenta exigir devolver conteúdo sensível.

Secret Manager aberto no console oficial: URL/project picker **lidacomzapcrm-staging / LidacomZapCRM Staging**, redirecionado ao produto secretmanager.googleapis.com com botão Ativar. **API ainda não ativada**, inventário de secrets ainda indisponível, não presumir zero recursos em outros projetos. Nenhuma transferência/GCPmutation/API/IAM/billing/secret/access token executada.

**GATE_STAGING_SECRET_MANAGER_ENABLE_REQUIRED**: novo serviço medido, escopo proposto exclusivamente ativar secretmanager.googleapis.com no staging e, após inventário, criar/reutilizar `meta-test-app-secret` (chave redefinida do app1480563193903800) e `meta-test-verify-token` (token forte), uma versão de cada, replicação automática. Sem habilitar no projeto operacional, alterar billing/budget/cartão, criar access token de envio ou conceder novo IAM runtime nesta etapa. Grants/public receiver devem ser concretamente revisados em etapa posterior.

Custos oficiais consultados2026-10-07: [pricing](https://cloud.google.com/secret-manager/pricing) inclui6 versões ativas e10mil acessos/mês, cotas agregadas por billing account. Disponibilidade restante não comprovada. Fora da franquia,2 versões em replicação automática correspondem a US$0,12/mês de armazenamento, proporcional ao uso; acessos adicionais US$0,03/10mil. Não é preço total da infraestrutura nem hard cap; budgetR$10/alertas existentes não foram alterados/recriados. Criação/management operations gratuitas não tornam armazenamento/acessos ilimitados gratuitos. [Criação segura](https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets) consultada, não executada.

Após aprovação específica de serviço/custo: ativar apenas staging, auditar inventário antes de criar, preparar entrada segura dos dois secrets sem output, depois seguir receiver dedicado/worker privado com testes/guards/menor privilégio. Não declarar Meta inbound real validado. TEST assets existentes/appnãoPublicado/callbackvazio/outboundDISABLED/produção/default/main/pessoal preservados.

## Contenção vigente — App Secret no retorno automático da ferramenta (2026-10-07)

Correção da contenção: retorno de Mostrar após reload não comprova mascaramento do valor. Verificações locais retornaram apenas booleans, nunca conteúdo; por precaução, navegador levado ao dashboard do app, fora da página de credenciais. Não capturar screenshot do campo nem rebindar Básico após rotação. Usuário abre Básico diretamente para concluir reset.

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
