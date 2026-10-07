# SEC-PILOT-01 — segurança antes do piloto pago

Estado: AUDIT / CANDIDATE SIMULATOR VALIDATED — NOT DEPLOYED. Produção não foi alterada. A regra global operacional `allow read, write: if true` previamente comprovada continua risco bloqueante; não é adequada para disponibilizar checkout/CRM pago. Readiness da candidata não equivale à segurança cloud já implantada.

## Superfície auditada no código

| Origem | Operação | Coleções | Risco e medida requerida |
| --- | --- | --- | --- |
| App/onAuthStateChanged e listeners | Leituras privadas mesmo antes do branch de rota pública | clients/messages/history/campaigns/.../orders/deliveryOrders/caixaSessions | Separar bootstrap público do privado; queries compatíveis com autorização |
| mapFirebaseUser | Toda conta Auth ganha role UI administrador | UI | Role visual não prova privilégio; claims/identidade confiáveis server-side |
| PublicCardapioView/loadPublicMenuData | getDocs gerais anônimos | cardapios/productsDigitalMenu | Expor somente menu publicado/produtos públicos vinculados via endpoint/projeção restrita |
| PublicCardapioView/handleSubmitOrder | Escritas sequenciais SDK, IDs curtos | deliveryOrders/clients/messages/history | Substituir por comando server-side validado/atômico; negar writes públicos |
| CardapioView/simulador | Setters/handlers App, fallback por nome/primeiro cliente | deliveryOrders/clients/messages/history | Reutilizar catálogo/UX; não reutilizar executor com efeitos não idempotentes |
| App/order/delivery/cash handlers | Múltiplos writes financeiros/estado | orders/deliveryOrders/clients/caixaSessions/history | Autorização por operador; coexistência planejada; não ligar novo piloto a FECHADO como pagamento |
| Services backend | SDK Rules não se aplicam ao executor server-side | Futuro port | IAM mínimo/guards/binding; sem Owner/Editor/JSON key |

## Candidata e simulação

Arquivo `security/firestore.pilot.candidate.rules`, isolado de todos os configs de deployment. Claims exemplificativas: pilotOrganizationId=prato-mineiro, pilotOperator=true; legacyOperator=true para caminhos legados privilegiados. Claims precisam ser emitidas por administrador confiável; ninguém foi provisionado agora. Não mapear role UI para essas claims.

SDK público não lê clientes/mensagens/histórico nem cria pedido/cliente/mensagem. Mensagens só leitura do operador; writes negados. Clientes/history possuem verificações mínimas de campos e auth, ainda insuficientes para autorização financeira/multitenant completa. Catálogo privado/pedidos/settings exigem operador para read e legacyOperator para write. Projeção `pilotPublicMenus` permite get de documento publicado com campos restritos, não list/write. No catch-all recursivo, todas as coleções protegidas são excluídas, inclusive descendentes e operationalCanaryAudit. Coleções legadas não mapeadas permanecem para claim privilegiada: isto é compatibilidade proposta, não menor privilégio final em todos os módulos.

Prova em `evidence/SEC-PILOT-01-rules-simulator.json`: simulador oficial staging, inline source, total511 (matriz330/descendentes144/público30/público inválido4/client inválido3), todos SUCCESS, zero issues. Hash SHA-256 `c19e00df45af7c4840ddd9e713707cba1e97cfc15c1f63327742858bbeed2086`. Nenhum get/exists/getAfter de documento, ruleset/release publicado ou dado Firestore lido/escrito. Casos sintéticos reproduzíveis em tools/pilot/pilot-rules-cases.mjs; não versionar wrappers de credenciais.

## Compatibilidade obrigatória antes de publicação

**Não publicar a candidata como está.** O SDK operacional atual ainda grava mensagens no handler de envio, usa listeners/query globais e não tem as claims novas. O público lê catálogo privado e grava quatro coleções. Publicar agora bloquearia funcionalidades existentes. A candidata representa fronteiras a implementar, não evidência de operação compatível após deploy. Não manter allow-if-true sobreposto para mascarar falhas; isso reabriria o acesso.

Próxima implementação requer: inventário de operadores autorizados e provisioning de claims com gate; separar entrada pública/listeners; read endpoint/projeção safe e sanitização de produtos; checkout server-side com tenant/contact/conversation binding; validar mensagens/receipts via backend; autorização e schemas de cada consumidor legado; testes emulator/SDK com queries reais e rollback das regras anteriores. Descendentes sem permissões ficam bloqueados de propósito; auditar subcoleções legadas antes de rollout. Claims/coleções não foram ativadas nem migradas nesta fase.

Fontes primárias consultadas em 2026-10-06: [condições das regras](https://firebase.google.com/docs/firestore/security/rules-conditions), [consultas e regras](https://firebase.google.com/docs/firestore/security/rules-query), [estrutura e matches sobrepostos](https://firebase.google.com/docs/firestore/security/rules-structure), [fundamentos](https://firebase.google.com/docs/rules/basics). Regras avaliam queries e não filtram documentos; matches allow sobrepostos ampliam acesso; bibliotecas server-side usam IAM e não essas regras.

SEC-01 hardening global continua prioridade futura. Nenhuma API operacional/IAM/recurso pago/billing/cliente/produção alterado. Gate de publicação de regras exige proposta compatível concreta, revisão de operadores e rollback; não pedir autorização genérica antecipada nem declarar paid-ready.

## Dependências — evidência do checkpoint

`npm audit --omit=dev --json` na raiz em 2026-10-06 reportou17 achados:2 CRITICAL,9 HIGH,5 MODERATE,1 LOW. Inclui proxy-addr/websocket-driver (critical), firebase e sua cadeia, vite e outras transitivas. São achados do lockfile existente, que esta preparação não alterou; não comparar diretamente com a contagem de alertas da main no GitHub nem com o audit separado de Functions. Testes/CI verdes não comprovam ausência de vulnerabilidades. Antes de exposição operacional paga: triagem de alcance, correção compatível e audit/testes específicos; não executar audit fix --force ou downgrade major sugerido automaticamente. Zero nova dependência/upgrade nesta fase; isto permanece gap de segurança, não resolução.
