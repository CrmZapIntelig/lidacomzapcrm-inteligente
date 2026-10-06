# SEC-01 — Firestore Security Hardening

Prioridade registrada por autorização humana em 2026-10-04. **PLANEJADO — NÃO EXECUTADO.** Projeto operacional project-1300957a-ea82-4645-845.

Objetivo: substituir futuramente a regra global `allow read, write: if true` por menor privilégio, sem quebrar a operação legada. A contenção de dois IDs TEST de PROD-ORDER-01 não é saneamento global e não autoriza esta fase.

## Sequência proposta

1. Inventariar pelo código todos os caminhos Firestore e consumidores privados/públicos, operações, autenticação, papéis e eventuais fronteiras de tenant. Não presumir Auth/tenant existentes nem copiar documentos reais para testes.
2. Definir matriz de acesso por coleção/operação/ator: clientes, pedidos, delivery, caixa, catálogo, QR/público, conversas, campanhas, configurações e demais caminhos efetivamente encontrados. Separar SDK de IAM/server-side, que ignora Rules.
3. Construir fixtures sintéticas e testes de regras positivos/negativos e regressão dos fluxos existentes no emulador; testar consulta/listeners, criação, atualização, exclusão, elevação de privilégio e fronteiras de dados.
4. Provar em staging política proposta e compatibilidade com handlers atuais, sem migração/produção automática. Definir acesso público mínimo para cardápio/QR e admissão server-side quando necessária, sem expor caixa/CRM.
5. Preparar regra anterior/versionamento/digest, rollback condicionado ao release esperado, monitoramento sanitizado e plano de implantação incremental. Recuperar funcionalidade não pode restaurar exposição global silenciosamente.
6. Gate humano específico antes de alterar rules/Auth/IAM operacionais ou implantar frontend/backend dependente da nova política.

## Critérios futuros

Ausência de allow global incondicional; matriz e testes demonstram menor privilégio; operação homologada; SDK e executor IAM separados; sem segredo/dado real nos testes/logs; CI verde; baseline preservado ou saneamento autorizado em fase própria. Documento não declara compatibilidade já comprovada, regra pronta ou autorização de deploy.

Dependências atuais: inventários Functions/Eventarc/Extensions não consultáveis diretamente por APIs desabilitadas; canário PROD-ORDER-01 ainda não executado. Não habilitar APIs/criar identidade/recurso pago como parte deste registro.
