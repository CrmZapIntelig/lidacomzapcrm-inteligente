# STG-03 — endpoint HTTPS / worker: gate de billing

2026-10-02. Autorização vigente permite staging gratuito segregado, sem billing automático. Projeto lidacomzapcrm-staging tem billing=false. STG-01 Hosting pr-4/CI federada comprovados; STG-02 Firestore gratuito/ports/fixtures testados; evidências de CI no ledger.

## Gate real

**GATE_STAGING_BILLING_REQUIRED**. Para hospedar um receiver HTTPS executável no Firebase Functions é necessário plano Blaze. Cloud Run também não está disponível em Spark. Hosting estático não executa validação de assinatura/worker; não será apresentado como webhook. [Requisito oficial Functions](https://firebase.google.com/docs/functions/get-started) e [planos Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), consultados em 2026-10-02.

Nenhum billing foi vinculado, API Functions/Run/Build/Artifact Registry ativada, função/container/endpoint público criado ou deploy pago tentado. Worker e webhook permanecem não provisionados. Não há autorização Meta/RCS ou envio.

## Plano concreto após gate

Somente no projeto isolado: receiver HTTPS Functions v2 em southamerica-east1, minInstances=0, maxInstances=1, concurrency limitada, timeout/body limit explícitos e IAM de runtime separado da conta de Hosting. Rever custos/limites antes de criar; alertas de orçamento não são teto garantido. Desabilitar sender/provider real e não habilitar deploy de main.

Reusar boundary de assinatura/challenge/raw body e portas de admission/worker já existentes. ACK somente após commit durável. Integrar idempotency, lease/fencing, crash recovery e audit sanitizado; processar exclusivamente fixtures TEST enquanto credenciais Meta reais não forem aprovadas. Não transportar secrets em React/logs/Git; usar identidade gerenciada/secrets server-only conforme fase autorizada. Não iniciar worker ao importar módulo.

Antes do webhook público: testes de assinatura/challenge/malformed/body/timeout, durable admission vs ACK/503, batch rejeitado, replay, restart, IAM e logs; nenhuma chamada outbound. O runtime loopback existente e os testes de provider continuam referência local, **não comprovação de endpoint cloud**.

Ação mínima: autorização explícita para vincular billing/Blaze somente ao staging, com reconhecimento de custos possíveis. Não pedir credenciais Meta/RCS antes de necessárias. Se aprovado, retomar STG-03 e parar no próximo gate credencial externa/Meta/RCS/primeiro envio. Não avançar ORDER-01/OPS-01 enquanto este gate atual estiver pendente.
