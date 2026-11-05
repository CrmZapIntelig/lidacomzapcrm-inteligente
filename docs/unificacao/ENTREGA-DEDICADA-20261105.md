# Entrega dedicada em consolidacao - 05/11/2026

Produto unico: LidacomZapCRM. Esta branch consolida fontes operacionais e contratos incorporados da base Gestao. Nao representa homologacao integral.

## Reproducao

Instale a raiz com npm ci e o backend com npm ci --prefix staging-functions --ignore-scripts.
Para gates de previews, instale tambem npm ci --prefix offline-preview.
O backend e a CI usam Node 22. Validacao local desta consolidacao usa Node 24; registrar resultados separadamente.

npm run build:dedicated produz dist-dedicated no modo clone. Esse modo seleciona explicitamente o Firestore lidacomzapcrm-work-20261021; npm run build conserva o comportamento legado e nao substitui esse comando.

firebase.hosting.dedicated.json publica somente o site lidacomzapcrm-work-20261021 e preserva /api/providers/evolution. Usar projeto explicito project-1300957a-ea82-4645-845 e --only hosting. Compilar, testar e conferir o artefato antes de publicar.

Rules e indices usam firebase.dedicated.json. Nao confundir publicacao do Hosting com publicacao de Rules, Functions ou migracao de dados.

## Estado e limites

- Pedidos, Livro Caixa e rascunhos possuem persistencia dedicada; encerramento/entrega nao provam pagamento.
- Diagnostico Evolution exige operador autenticado e retorna NOT_CONFIGURED quando faltam configuracoes. Ele nao envia mensagens.
- Evolution/RCS/PSP reais ainda exigem configuracao e homologacao; preparacao e simulacao nao sao envio.
- Pesquisa de satisfacao prepara somente rascunhos; adapter servidor e agendamento permanecem pendentes.
- Regras legadas validam envelope; nao atestam seguranca multitenant integral.
- Impressoes geradas nao comprovam impressora fisica.
- Ha alertas conhecidos em dependencias do backend; nao declarar auditoria limpa.

## Preservacao

Fontes foram copiados para uma worktree isolada a partir de 51f7d383, com hashes conferidos. Pasta original, dados reais, configuracoes pessoais e referencias historicas foram preservados.
Arquivos .env e credenciais nao fazem parte da copia. A configuracao Firebase de cliente e publica; credenciais de provedores devem permanecer no servidor.
A evidencia detalhada de testes e publicacoes anteriores esta no checkpoint execution/platform-completion-20261030 do chat. CI anterior do PR4 cobre o commit antigo, nao esta consolidacao.