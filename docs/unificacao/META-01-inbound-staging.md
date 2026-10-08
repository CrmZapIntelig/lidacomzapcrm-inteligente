# META-01 — inbound TEST em staging

## Correção do GET com parâmetros adicionais (2026-10-08)

Após nova recusa informada pelo usuário, consulta restrita ao evento sanitizado META_TEST_VERIFICATION encontrou GET em 2026-10-08T22:35:04.632061Z: HTTP400/QUERY_REJECTED, tokenMatches=true, tokenAvailable=true e path/mode/challenge válidos. A rejeição por campos adicionais explica esse GET recente; nenhum nome/valor extra, token ou payload foi consultado. Uma consulta transitória429 foi seguida por consulta reduzida e limitada a eventos seguros. Não atribuir TOKEN_MISMATCH do probe negativo histórico à tentativa humana.

Commit funcional **9229ef3152b623003d4779ea6f807b3087baed86**: a fronteira HTTP de GET seleciona exclusivamente hub.mode/hub.verify_token/hub.challenge, ignorando campos adicionais sem lhes dar autoridade. Campos contratuais duplicados/arrays/objetos são rejeitados; ausência/modo/challenge/token incorretos continuam fail-closed. Challenge preservado literalmente, inclusive zeros iniciais. Núcleo interno mantém whitelist; POST/HMAC/raw body/admission/ACK após persistência, worker privado, secrets e zero outbound não mudam.

A resposta externa enviada pelo usuário é referência, não código autorizado: não incorporar token hardcoded, log integral de mensagem nem ACK de POST antes de persistência. A referência oficial histórica do SDK Meta confirma challenge/HTTP200 e HMAC de POST: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/ (consultada2026-10-08; SDK arquivado, não adotado como dependência).

Validação local: **234 testes distintos PASS** (230 consolidado +4 pilot), cinco typechecks, AST/isolation, baseline21→21/zero novos e quatro builds PASS. CI funcional push37855733778/PR37855741380/análise37855734300 success. Deploy somente receiver staging PASS; ACTIVE/updateTime2026-10-08T22:51:32.195660018Z, verifyv2/AppSecretv1 intactos, worker updateTime inalterado. Probe HTTPS com parâmetro extra e token fictício inválido retornou403 (não400), comprovando encaminhamento à validação do token. Nenhum probe com token real ou novo registro em fila. Callback Meta ainda não aceito/comprovado. Não rotacionar novamente nem acessar conteúdo de secrets. Prova sanitizada evidence/META-01-verification-query-fix.json.

**GATE_META_CALLBACK_RETRY_REQUIRED** após confirmação do deploy: repetir Verificar e salvar com a mesma URL e token já preenchidos. A falha anterior agora tem diagnóstico; a aceitação do callback ainda depende da nova verificação da Meta. Subscription messages TEST somente após aceitação, sem publicação/outbound/telefone real. Abaixo histórico.

## Diagnóstico sanitizado do callback / nova tentativa humana (2026-10-08)

Usuário enviou captura da recusa Meta depois da rotação, sem novo valor de secret visível. **Callback ainda NÃO VALIDADO**. URL mostrada coincide com receiver; não atribuir erro ao nome do recurso Secret Manager, à chave, ao copy/paste ou à Meta sem correlação. Nenhuma nova rotação/versão3, nenhum :access.

Commit funcional **577051493890b67431ba165a514e78b10e29f74c** acrescenta somente diagnóstico de GET via SDK logger oficial: httpStatus, reason ENUM e booleans pathAllowed/queryAllowed/modeValid/challengeValid/tokenPresent/tokenAvailable/tokenMatches. Lista fechada: não inclui token/valor/hash/query/URL parametrizada/headers/body/telefone/profile/erro bruto. Comparação permanece exclusivamente server-side pelo verificador existente; telemetry não muda autorização/ACK/persistência/guard. Sem novo endpoint/debug/admin, worker privado, nenhum sender. Testes adversariais provam ausência de valores/keys injetadas/challenge/path no registro. Fonte consultada2026-10-08: [Firebase structured logger SDK](https://firebase.google.com/docs/functions/writing-and-viewing-logs).

Redeploy **somente metaTestReceiver**, ACTIVE, verify tokenv2/App Secretv1; worker updateTime idêntico. Probe HTTPS com token fictício inválido403; entrada controlada recente registra TOKEN_MISMATCH/tokenAvailable=true e formato/path válidos, sem material secreto. Isso comprova diagnóstico/runtime disponível, **não é prova da causa da tentativa Meta anterior**. Nenhum teste com token real pelo operador. Prova META-01-verification-diagnostics.json.

Consulta de logging seleciona apenas timestamp/jsonPayload do evento fixo META_TEST_VERIFICATION no receiver staging, valida keys/types fechados e retorna só enums/booleans; não lê request logs/textPayload/URLs/valores. Seletor parcial por subcampos dinâmicos retornou400, corrigido para jsonPayload do evento sanitizado com validação. Consulta transitória429 tratada com janela curta/paging limitado/intervalo; sem habilitar API/alterar quota/IAM/billing. RequestURL exclusion existente preservada; logs de aplicação novos contêm apenas classificação segura.

**232 testes distintos PASS** (228 consolidado +4 pilot), cinco typechecks/AST/isolation/baseline21→21/zero novos/quatro builds PASS. CI funcional push37725572509/PR37725576176/análise37725573290 success. Pessoal/operacional/default/main preservados, RCS/outboundDISABLED, zero mensagens reais.

**GATE_META_CALLBACK_RETRY_REQUIRED**: diagnóstico agora publicado; botão Verificar e salvar do formulário existente confirmado visível/habilitado sem ler seus valores. Ação humana mínima: clicar uma vez novamente, sem trocar URL/token nem enviar screenshot de valor. Depois correlacionar somente resultado/metadata segura; se aceito, confirmar callback e configurar messages TEST mínimo/teste de painel, sem publicar app/número real/outbound. Meta request ainda não correlacionada; não declarar inbound completo. Abaixo histórico.

## Verify token exposto rotacionado — nova versão2 (2026-10-08)

Usuário informou exposição do verify token em screenshot e autorizou rotação exclusivamente desse secret. Project ID/número **lidacomzapcrm-staging / 854899277909** confirmados antes da mutação. Crypto gerou novo valor somente em memória e addVersion via TLS criou **versão2 ENABLED**; nenhum :access, payload impresso/arquivo/log/retorno, zero alteração de meta-test-app-secret.

Redeploy seletivo **somente metaTestReceiver**, Node22/southamerica-east1, ACTIVE com binding meta-test-verify-token versão2. Binding App Secret continua versão1; worker updateTime idêntico ao pre-flight, portanto não redeployado. Após comprovar novo binding, versão1 exposta do verify token **DISABLED**, não destruída. Uma versão ativa; nenhum novo recurso/billing/API/IAM/produção/outbound. Prova sanitizada evidence/META-01-verify-token-rotation.json.

Build Functions PASS; código funcional intacto, último conjunto230 testes/cinco typechecks/baseline21→21/quatro builds e CI do HEAD92e5b34 verdes são evidência anterior, não afirmar rerun local nesta rotação. Deploy/metadata verificados nesta fase. Working tree pessoal preservado.

**GATE_META_VERIFY_TOKEN_SECURE_INPUT_REQUIRED**: usuário abre meta-test-verify-token → NOVA versão2 → Ver valor do secret, copia diretamente ao campo Meta Verificar token e clica Verificar e salvar. Não enviar valor/screenshot do campo no chat. URL callback mantida **https://metatestreceiver-frefvtfoya-rj.a.run.app/webhooks/meta**. Nome projects/854899277909/secrets/meta-test-verify-token é endereço do recurso, não callback nem token. Campo Meta antigo limpo sem ler valor; novas páginas handoff. Callback ainda NÃO ACEITO/NÃO COMPROVADO; falha anterior não atribuída sem prova ao endereço do recurso.

Depois de Meta aceitar, confirmar somente estado não sensível, configurar subscription mínima messages TEST e teste de painel. Não publicar app/número real/outbound. HMAC/challenge positivo cloud/inbound continuam pendentes; META-01 parcial, worker privado/allowlist humana vazia/draft only. Abaixo histórico.

## Estado vigente — secrets confirmados / receiver TEST dedicado (2026-10-07)

Usuário confirmou salvamento direto da chave rotacionada. Metadados verificados sem :access: **uma versão ENABLED de cada secret TEST**, nenhum valor capturado pelo agente. Projeto exato **lidacomzapcrm-staging / 854899277909**; demais projetos/default/billing/budget preservados.

Implementação publicada no commit **4e85b538515a6d830412f2a90f3bc4736156a589**: receiver dedicado **metaTestReceiver** público somente /webhooks/meta; **metaTestWorker** e stagingIngress privados. Node22, southamerica-east1, min0/max1, concurrency1, timeout60s, body64KiB. Receiver runtime separado crm-meta-test-receiver; role existente stagingSyntheticJournal com quatro permissões get/create/update/database-get, sem Owner/Editor/chave JSON. SecretAccessor somente nesse runtime e nos dois secrets; worker sem secret binding/grant. IAM Firestore é no escopo do projeto staging; isolamento de namespace é adicional no port, não garantia documental por IAM.

Envelope **STAGING TEST explícito**, nunca converter real para SIMULATION. Reutiliza journal/port/fila/transações/lease/fencing/retry/projection/draft existentes, namespace stg_inbound_synthetic e tenant demo-meta-TEST. App/WABA/phone vinculados aos IDs TEST já inventariados. Conteúdo permitido TEST inbound staging, allowlist humana vazia; somente fixtures reservadas passam a validação atual. Local/SIMULATION preservado. Worker é invocado privadamente de forma explícita: **sem scheduler/trigger automático**. Nenhum sender, token outbound ou chamada /messages.

Cloud comprovou7 verificações negativas: token errado403, /worker no receiver404, assinatura ausente403/inválida403, JSON válido acima do limite413, worker anônimo403, JSON malformado400 pelo framework. Primeiro probe de tamanho usou JSON inválido e atingiu parser do framework; corrigido para JSON válido grande, então413. Verificação inicial durante deploy recusou IAM ainda não público; reexecutada após deploy success, fronteiras comprovadas. Receiver URLs automáticas excluídas apenas do log run.googleapis.com/requests desse serviço para impedir registro de hub.verify_token; application/audit logs permanecem. Não consultar logs brutos nem valores.

**Limites honestos:** HMAC válido/challenge/admission/dedupe/restart/worker/draft/retry/fencing têm provas locais; **positivo com chave cloud, challenge Meta real, subscription e projeção cloud ainda NÃO comprovados**. Callback URL preparada https://metatestreceiver-frefvtfoya-rj.a.run.app/webhooks/meta, não salva. App NÃO PUBLICADO recebe apenas testes de painel conforme alerta Meta; inbound humano pelo número TEST não prometido.

**GATE_META_VERIFY_TOKEN_SECURE_INPUT_REQUIRED**: token já gerado/armazenado server-side; para não capturar credencial em ferramenta/clipboard/output, usuário copia diretamente valor da versão1 de meta-test-verify-token no console staging para Verificar token no formulário Meta aberto e clica Verificar e salvar. Não tocar App Secret, criar versão, registrar número ou publicar app. Depois verificar apenas estado não sensível, assinar messages TEST mínimo e testar painel até próximo gate. Sem pedir segredo no chat.

Validação:230 testes distintos (225 consolidado +4 pilot +1 novo guard runtime; afetados rerun), cinco typechecks, AST/isolation, baseline21→21/zero novos, quatro builds PASS. CI funcional push37708073030 e análise37708073665 success; PR37708078712 com Hosting em acompanhamento; evidências sanitizadas META-01-runtime-test.json e META-01-secret-manager-test.json. Audit Functions refeito após exposição:2 MODERATE transitivas existentes,0 HIGH/CRITICAL, nenhuma dependência alterada; backlog preservado, sem upgrade major automático.

META-01 **PARCIAL / RECEIVER STAGING DEPLOYED — TEST ONLY**, não inbound completo/produção/live. Abaixo checkpoints históricos.

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
