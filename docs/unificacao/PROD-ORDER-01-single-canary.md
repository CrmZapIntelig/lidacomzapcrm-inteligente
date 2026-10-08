# PROD-ORDER-01 — canário único: pre-flight bloqueado

## Estado vigente — PAUSED — PILOT PRIORITIZATION (2026-10-06)

Novo controlador humano prioriza PILOT-MVP-01: não executar canário, não habilitar APIs para resolver inventários, não ampliar rollout. Quota0/1/flagDISABLED; nenhum Order/audit cloud/identidade temporária ou contenção publicada. Autorizações históricas preservadas, não executadas durante a pausa. Runtime AI/Agent Studio removido não será recriado. **META-01 não depende mais deste canário**; pode avançar autonomamente em TEST até seus próprios gates. O piloto reutiliza catálogo e fluxo DeliveryOrder legado de restaurante com fronteira server-side, não o Order canônico deste canário. Estado/roadmap atual em docs/pilot/PILOT-MVP-01-whatsapp-active-sales-menu-orders-print.md. Seções abaixo são históricas e não autorizam retomada do canário agora.

## Checkpoint atual — runtime de teste removido (2026-10-06)

Após autorização humana, somente Cloud Run lidacomzapcrm-inteligente/us-west2 no projeto operacional foi descomissionado; evidência/configuração sanitizada preservada, sem dependência operacional direta conhecida, trigger disabled/etag inalterado, operação done e service/revisão404. INFRA-01 registra limites e prova. Proveniência não bloqueia mais esse recurso. Canário0/1, flagDISABLED, Rules hash inalterado e paths TEST ausentes. Nenhuma contenção publicada, identidade temporária criada ou auditoria cloud gravada. **GATE_OPERATIONAL_INVENTORY_VERIFICATION_REQUIRED** permanece antes de qualquer create: Functions/Eventarc/Extensions não tiveram inventário direto comprovado porque APIs estão desabilitadas; índice complementar não foi tomado como inventário completo. Não habilitar APIs sem exceção humana à proibição existente. Autorizações anteriores preservadas. Meta aguarda fechamento do canário; sem rollout/outbound. Seções anteriores são checkpoints históricos.

## Checkpoint atual — INFRA-01 (2026-10-06)

ZIP fornecido auditado somente leitura: SHA-256 ef7627f76365a9bfcd9a97c3bce40d39a9d2eb1c24bfe89f7523229d2a5c2a65, 67/67 arquivos idênticos à main60fb91f. README aponta ao mesmo applet d0a1f98e-eb48-4e21-bf06-e17eab23635c encontrado na annotation Cloud Run. **PROVENANCE_HIGH_CONFIDENCE** para origem comum; versão da revisão00002-wqh não comprovada. Fonte usa SDK/handlers WRITE no Firestore operacional, inclusive orders/deliveryOrders/caixaSessions. Não é preview isolado. Listener orders apenas atualiza memória/tela; nenhum efeito financeiro automático desse listener foi demonstrado.

**BLOCK_CANARY / GATE_OPERATIONAL_RUNTIME_PROVENANCE_REQUIRED**: falta o código/artefato efetivamente publicado e exclusão dos efeitos laterais/inventário pendentes. Fonte e análise completas em [INFRA-01-runtime-provenance.md](INFRA-01-runtime-provenance.md); prova sanitizada em evidence/INFRA-01-zip-audit.json. Zero Order, zero rule deploy, zero IAM/API/cloud mutations nesta auditoria; flagDISABLED. Autorizações de exatamente1 TEST, contenção limitada e identidade temporária preservadas; não executadas. Meta e Marketing não antecipados. As seções abaixo registram os checkpoints históricos, não substituem este estado atual.

Data: 2026-10-04. HEAD inicial: 41cd5c4d48bb011708b5f145fa22c613ac47a667. Branch codex/unificacao-gestao-inteligente; PR #4 draft; main 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd.

## Atualização mais recente — contenção autorizada e simulada, publicação suspensa

HEAD inicial desta continuidade: 4fece9a0eed29bf691f595f89c80e21dcc55b0a2. O usuário autorizou somente os dois documentos TEST e confirmou janela sem intervenção. GATE_OPERATIONAL_CANARY_CONTAINMENT_REQUIRED foi superado para esse escopo; não autoriza APIs/IAM adicionais.

Recheck 2026-10-04T23:35:27.861Z: mesmo ruleset/release/hash anterior, alvo/contact/audit ausentes. Fonte anterior preservada em cópia privada separada antes do recheck; backup não publicado. Nenhuma regra operacional publicada, nenhuma flag habilitada e nenhuma escrita de Order/audit.

Candidato atual: evidence/PROD-ORDER-01-containment.rules, não associado a firebase.json/deploy. Usa o match global existente e condição `request.path` diferente dos dois documentos exatos. Refinamento de escopo mínimo: descendentes mantêm comportamento anterior, sem bloquear caminhos adicionais. Substitui o rascunho anterior com wildcard por coleção/ID descrito abaixo; esse rascunho histórico NÃO foi publicado.

Simulador oficial Firebase Rules `projects.test` recebeu source inline no projeto lidacomzapcrm-staging, sem criar ruleset/release, sem consultas get/exists/getAfter, sem ler/escrever dados Firestore e sem cliente/credencial real no payload. Fonte original compilou/passou110 casos; candidato compilou/passou110 casos, zero issues: get/list/create/update/delete, anônimo e autenticado TEST, dois alvos exatos, IDs vizinhos, clientes/delivery/caixa, caminhos aninhados e descendentes dos alvos. Original permite tudo; candidato nega create/update/delete exclusivamente nos dois documentos e preserva reads e todas as outras expectativas. Prova evidence/PROD-ORDER-01-containment-simulator.json. Isto comprova semântica de requests SDK no simulador, não publicação ou ensaio SDK contra produção. Emulador local não usado (Java8 instalado); nenhum runtime foi instalado/modificado.

Inventário suplementar somente leitura: Service Usage confirmou cloudfunctions.googleapis.com, eventarc.googleapis.com e firebaseextensions.googleapis.com em DISABLED no projeto operacional. Cloud Asset Inventory, API já habilitada, respondeu zero Functions/Eventarc sem paginação usando quota project explícito; é índice eventualmente consistente e não comprova Extensions nem substitui consulta direta. IAM lista3 service accounts, sem identidade dedicada canary. Nenhuma API, IAM, recurso, billing ou credencial alterada. Prova evidence/PROD-ORDER-01-inventory-check.json.

Correção de interpretação: erro SERVICE_DISABLED inicial da consulta Cloud Asset referia-se ao consumer OAuth da CLI, não ao projeto alvo. Requisição somente leitura com x-goog-user-project operacional explícito resolveu Cloud Asset sem habilitar API. O estado DISABLED das três APIs operacionais foi confirmado separadamente via Service Usage; não inferido do erro anterior. Nenhum erro foi tratado como inventário vazio.

**GATE_OPERATIONAL_INVENTORY_API_REQUIRED.** Conforme instrução humana, parar quando a comprovação exigir habilitação de API. Ação mínima proposta: autorizar habilitar SOMENTE cloudfunctions.googleapis.com, eventarc.googleapis.com e firebaseextensions.googleapis.com no projeto operacional para leitura dos inventários, sem deploy/instância/billing/IAM. Se exigir custo/permissão/recurso adicional, parar novamente. Executor de menor privilégio ainda não existe/comprovado; sua configuração requer gate IAM específico posterior, antes de qualquer write. Não usar Owner como executor e não afirmar que Rules limitam Admin SDK.

Publicação da contenção fica suspensa até cumprir todos os requisitos anteriores à publicação, incluindo inventários e executor IAM. Autorização da contenção/um pedido/janela permanece válida; nenhuma nova autorização para o mesmo pedido está sendo solicitada.

SEC-01 registrada como prioridade PLANEJADO — NÃO EXECUTADO em SEC-01-firestore-security-hardening.md, sem saneamento global agora. META-01 aguarda fechamento completo do canário/rollback/CI. Zero Order, rollback não aplicável, flag DISABLED, produção sem mutações desta fase; não há garantia retrospectiva de ausência de alterações feitas por terceiros no banco inteiro.

Fontes oficiais verificadas em 2026-10-04: [simulador Rules](https://firebase.google.com/docs/reference/rules/rest/v1/projects/test), [Service Usage](https://docs.cloud.google.com/service-usage/docs/reference/rest/v1/services/list), [limites de consistência do Cloud Asset](https://docs.cloud.google.com/asset-inventory/docs/asset-types). Requests simulados são inteiramente sintéticos; fontes não usam acesso a dados e nenhum novo recurso foi criado.

Os itens abaixo preservam o checkpoint anterior; autorização/gate/proposta mais recentes são os desta seção.

## Autorização e resultado (checkpoint anterior)

Autorizado exatamente um Order TEST no projeto operacional project-1300957a-ea82-4645-845, total zero/Pendente/Pix, sem cliente persistido, telefone, endereço, NOTA, KDS, delivery, caixa, venda, recebimento ou mensagem. A autorização é condicionada ao pre-flight fail-closed; não autoriza alteração geral das regras, IAM ou habilitação de APIs.

**BLOCKED — PREFLIGHT ONLY.** Zero escrita cloud, zero Order criado, zero rollback necessário; flag DISABLED. Não é canário concluído, OPERACIONAL COMPLETO ou rollout. O projeto foi confirmado ACTIVE, identidade nova autenticada verificada sem exposição de credenciais. Alias default preservado. Consultados somente metadados cloud e ausência dos três IDs TEST planejados; nenhum documento de cliente/pedido financeiro real foi copiado.

## Evidências

Arquivo sanitizado: evidence/PROD-ORDER-01-preflight.json, coletado em 2026-10-04T22:47:03.733Z.

- orders/TEST-canary-20261004-41cd5c4 ausente; clients/TEST-contact-TEST-canary-20261004-41cd5c4 ausente; operationalCanaryAudit/TEST-canary-20261004-41cd5c4 ausente. Ausência precisa ser revalidada imediatamente antes de eventual create; isto não reserva quota nem ID.
- Release cloud.firestore aponta ao ruleset 6263358b-4db4-4ff9-ae0b-2f68726581a6, atualizado em 2026-06-01T03:40:23.150786Z; hash do arquivo: 35e8844823ce67e8e9fbbce7cd89591001a97fccfb5462288fd0d0d3794e99a1. Regra efetiva global permite `allow read, write: if true`. Não existe proteção de escrita SDK para o alvo ou auditoria.
- Identidade atual tem roles/owner, sem binding público no IAM do projeto. Isso permite administrar, mas não comprova executor de menor privilégio nem ausência de outros escritores privilegiados. Nenhuma identidade/chave criada e nenhum IAM alterado.
- Inventários Functions v1/v2, Eventarc e Extensions: HTTP403/PERMISSION_DENIED/SERVICE_DISABLED. Não classificar como listas vazias. Nenhuma API habilitada nesta fase. Necessário obter inventário verificável antes da escrita, preferindo alternativa somente leitura; se exigir habilitar API operacional, gate específico antes.
- Quiescência de operadores/admins, inventário completo de automações e contenção ainda não comprovados. Executor de produção continua não implementado; dry-run anterior não confere permissão de escrita.

## Proposta concreta de contenção — NÃO APLICADA

Somente após autorização humana específica: restringir writes por SDK aos dois caminhos TEST reservados e seus descendentes, preservando leitura e acesso aos demais caminhos. Proposta abaixo é rascunho de revisão, não compilada/testada pelo serviço de Rules, não integrada a firebase.json, não deployada:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{documentId}/{descendant=**} {
      allow read: if true;
      allow write: if !(
        (collection == 'orders' && documentId == 'TEST-canary-20261004-41cd5c4') ||
        (collection == 'operationalCanaryAudit' && documentId == 'TEST-canary-20261004-41cd5c4')
      );
    }
  }
}
```

Substituir o allow global é necessário: um deny sobreposto não vence outra condição allow=true. Esta proposta não resolve a abertura global preexistente dos demais documentos, nem bloqueia IAM/Admin SDK; não deve ser apresentada como saneamento completo. O namespace de auditoria é candidato, não coleção criada. Contenção dos IDs deve permanecer até decisão explícita sobre retenção, para impedir adulteração da auditoria/recriação do canário após rollback.

Antes de publicar qualquer regra: verificar que o release/hash não mudou, capturar fonte anterior em armazenamento privado, compilar e testar no simulador/emulador: SDK create/update/delete negados nos dois IDs e descendentes, outros caminhos/leitura preservados. Falha/conflicto → HALT; não sobrescrever regra concorrente. Reversão de rules exige aprovação e release esperado; restaurar allow=true reabre também a auditoria e não deve ser automático. Nenhuma regra foi alterada nesta execução.

Comprovar inventários, isolamento de executor gerenciado sem chave e quiescência de escritores privilegiados antes de prosseguir. Nova permissão ou recurso operacional necessário deve ser descrito e aprovado separadamente. Só então preparar manifesto/digest/commandId/ator efetivo verificado, create-only com exists=false, quota durável exatamente um e audit atômico; atualizar a flag apenas na janela autorizada. Validar efeitos antes de deletar com updateTime e digest exatos; qualquer conflito → HALT_CANARY_CONFLICT. Não executar rollout.

## Meta

GATE_META_TRUSTED_DEVICE_REQUIRED resolvido conforme informação explícita do usuário nesta conversa (não é auditoria independente do painel). META-01 não retomada: depende do fechamento completo do canário, rollback, flag DISABLED e CI verde. Apps/WABA/test phone/webhook não auditados nesta fase. Outbound e RCS continuam DISABLED.

## Preservação e validação

Mudanças preexistentes .vscode/extensions.json, src/App.tsx, src/components/CommercialIntelligenceView.tsx, AGENTS.md, docs/FONTES-CHATS.md e backup pessoal preservadas e fora dos commits. Nenhum handler legado executado, backend deployado, billing alterado ou dado real migrado. Validação consolidada e CI deste registro constam no ledger.

## Gate

GATE_OPERATIONAL_CANARY_CONTAINMENT_REQUIRED: autorização do único pedido já existe; falta autorização para a contenção operacional proposta. Ação mínima: autorizar a alteração das regras limitada aos dois IDs TEST e confirmar janela sem intervenção manual no canário. Isso não autoriza habilitar APIs, novo IAM/recurso/custo ou corrigir regras globais. Após autorização, validar proposta e inventário, expor eventual gate adicional e somente executar se todos os requisitos passarem.

Fontes oficiais consultadas em 2026-10-04: [estrutura/overlapping rules e bypass server IAM](https://firebase.google.com/docs/firestore/security/rules-structure), [linguagem de regras](https://firebase.google.com/docs/rules/rules-language). Regras sobrepostas usam OR; versão2 aceita wildcard recursivo com zero segmentos.
