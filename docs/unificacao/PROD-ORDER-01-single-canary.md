# PROD-ORDER-01 — canário único: pre-flight bloqueado

Data: 2026-10-04. HEAD inicial: 41cd5c4d48bb011708b5f145fa22c613ac47a667. Branch codex/unificacao-gestao-inteligente; PR #4 draft; main 60fb91fdf048a8e0d4f9adc29a532be8bf4356dd.

## Autorização e resultado

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
