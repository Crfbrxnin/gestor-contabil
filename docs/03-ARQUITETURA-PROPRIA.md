# Arquitetura do SEU sistema (Fase 4) — proposta independente

Decisões próprias, inspiradas nas boas práticas da categoria (não na implementação interna da referência). Cada escolha vem com justificativa.

## 1. Stack recomendada

**Frontend**
- **Next.js (React) + TypeScript + Tailwind**. *Por quê:* produtividade, SSR para marketing/SEO, e um app rico para o dashboard. Componentes acessíveis (Radix/shadcn).
- **TanStack Query** para dados do servidor; **Zod** para validação compartilhada.

**Backend** — duas opções válidas; escolha pelo time:
- **Opção A (recomendada se o time é TS):** **NestJS (Node/TS)** — modular, injeção de dependência, filas nativas, mesmo idioma do front.
- **Opção B:** **Laravel (PHP)** — ecossistema contábil/fiscal brasileiro mais maduro (bibliotecas SPED/NF-e como `sped-nfe`, `sped-da`), **Sanctum** pronto. *A referência usa Laravel — e para fiscal brasileiro isso é uma vantagem real.*
- Independentemente: **API REST versionada** (`/v1`), **OpenAPI** como contrato.

**Banco:** **PostgreSQL** (transações fortes, JSONB para leiautes, particionamento). ORM: Prisma (Nest) ou Eloquent (Laravel). **Migrations** versionadas.

**Infra:** containers (Docker), fila **Redis** (BullMQ/Horizon), storage **S3-compatível** (XML/PDF/certificados cifrados), **KMS** para segredos.

## 2. Multi-tenancy e modelo de dados

- **Tenant = escritório**; dentro dele, **empresas** (clientes). Isolamento **lógico** com `tenant_id` + `empresa_id` em toda tabela de dados, reforçado por **Row-Level Security (RLS)** no Postgres. *Por quê RLS:* defesa em profundidade — mesmo um bug de query não vaza dados entre tenants (requisito LGPD).
- Papéis (da referência): **escritório** (todas as empresas do tenant) × **empresa** (só a própria) → traduz em escopo no token e nas políticas RLS.
- Núcleo contábil (tabelas): `tenants`, `usuarios`, `empresas`, `plano_contas` (árvore, sintética/analítica), `centros_custo`, `categorias`, `lancamentos` + `partidas` (débito/crédito), `periodos` (status aberto/fechado), `competencias`. Fiscal/folha/financeiro em schemas próprios.
- **Partidas dobradas** garantidas por constraint: soma(débitos)=soma(créditos) por lançamento (trigger/validação de aplicação).
- **Dinheiro:** `numeric(18,2)` — nunca float.

## 3. Camada de integrações (o coração)

Padrão **Ports & Adapters (hexagonal)**: cada integração externa é um **adapter** atrás de uma **interface** estável. *Por quê:* trocar provedor de CNPJ ou de pagamento sem tocar no domínio; testar com adapter fake.

```
Domínio  ──usa──►  Porta (interface)  ◄──implementa──  Adapter (SEFAZ, eSocial, OFX, CNPJ, Gateway...)
```

- **Idempotência** em toda escrita sensível: chave de idempotência (como na API da referência) persistida; reenvio retorna o mesmo resultado, não duplica. *Essencial para integrações que podem reenviar.*
- **Retry com backoff exponencial + jitter** para falhas transitórias; **circuit breaker** por provedor (SEFAZ cai com frequência).
- **Outbox pattern**: a ação de negócio grava no banco **e** um evento na tabela `outbox` na mesma transação; um worker publica para a fila. *Garante que "lançou E agendou a transmissão" nunca fica pela metade.*
- **Dead-letter queue** para o que falhou todas as tentativas, com reprocessamento manual.

### Gestão de OAuth e credenciais
- **Login Google:** OAuth2 Authorization Code + **PKCE**; tokens do provedor nunca no front.
- **Certificado A1:** arquivo `.pfx` **cifrado** no storage (chave no KMS), senha cifrada à parte; **descriptografa só em memória** no uso; auditoria de cada uso; alerta de validade.
- **API keys de provedores** (CNPJ, gateway): em **cofre de segredos** (não em `.env` versionado), rotacionáveis.

### Webhooks (entrada e saída)
- **Entrada (gateway de pagamento):** endpoint que **verifica assinatura HMAC**, responde rápido (2xx) e processa **assíncrono**; idempotente por `event_id`.
- **Saída (para integradores do seu sistema):** entrega com retries, assinatura HMAC, e registro de entregas.

## 4. Processamento assíncrono

- **Filas por domínio:** `fiscal` (SEFAZ/eSocial), `importacao` (OFX/CNAB/XML), `relatorios`, `webhooks`, `billing`.
- **Jobs assíncronos** para tudo que é lento/externo: transmissão eSocial (polling de protocolo), Distribuição DFe por NSU, geração de SPED, conciliação de arquivos grandes.
- **Agendados (cron):** busca de NF-e recebidas, atualização da Agenda Tributária, alertas ("certificado a vencer", "caixa negativo"), cobrança recorrente.
- **Idempotência + outbox + DLQ** como acima.

## 5. Fila de aprovação contábil (trava de compliance)

Replicar o princípio **[COMPROVADO]** da referência: lançamentos de origem automática/externa entram como **`pendente`** e só refletem em Balancete/SPED **após aprovação** do contador responsável. Período **fechado** bloqueia novos lançamentos; reabertura é **registrada com motivo**. *Isto não é opcional em sistema contábil — é o que protege a integridade do que foi entregue ao Fisco.*

## 6. Permissões

- **RBAC** por papel (escritório/empresa/visualização) + escopo por empresa. Verificação em dois níveis: **autorização na aplicação** e **RLS no banco**.
- Toda ação muta­dora passa por **trilha de auditoria** (usuário, data/hora, antes/depois) — requisito do domínio.

## 7. Observabilidade

- **Logs estruturados** (JSON) com `tenant_id`/`empresa_id`/`correlation_id` (nunca logar senha, .pfx ou PAN de cartão).
- **Métricas** (Prometheus) e **tracing** (OpenTelemetry) nas chamadas a órgãos externos — latência e taxa de rejeição da SEFAZ são KPIs operacionais.
- **Alertas** para filas crescendo, DLQ não-vazia, certificado a vencer, falha de billing.

## 8. Segurança e LGPD

- HTTPS obrigatório; **CPF/CNPJ e segredos cifrados em repouso** (a referência cita isso); backups diários cifrados; isolamento por tenant com RLS.
- LGPD: base legal por dado, retenção, exportação/eliminação, registro de acesso. Dados fiscais têm prazos legais de guarda — modelar retenção.
- Segredos fora do código; dependências escaneadas (SCA); rate limiting (ex.: emissão de token 5/min, como a referência).

## 9. Escalabilidade

- API **stateless** (escala horizontal atrás de load balancer); sessão/token em Redis.
- Workers escalam por fila independente (o pico fiscal é mensal/sazonal).
- Postgres com réplicas de leitura para relatórios; particionar `lancamentos`/`partidas` por `competencia`.
- Cache (Redis) para consultas caras (balancete, agenda).

## 10. Estratégia de testes

- **Unitários** no domínio contábil (partidas dobradas, apuração) — regras puras, cobertura alta.
- **Integração** com **adapters fake** dos órgãos (SEFAZ/eSocial em **homologação**), nunca produção.
- **Contrato** (OpenAPI) + testes de contrato da API pública.
- **E2E** (Playwright) nos fluxos críticos: cadastro empresa, lançamento+aprovação, conciliação, emissão NF-e em homologação.
- **Dados fictícios** (seeds) para dev; **idempotência** testada com reenvio.

## 11. Roadmap sugerido (progressivo)

1. **Fundação:** auth (e-mail/senha + Google), multi-tenant + RLS, empresas (CNPJ), plano de contas, usuários/papéis, auditoria.
2. **Contábil:** lançamentos (partidas dobradas, recorrentes, importação, aprovação), período/fechamento, relatórios (razão, balancete, DRE).
3. **Conciliação:** OFX, depois CNAB.
4. **Fiscal 1:** apuração Simples + PGDAS-D/DAS; Agenda Tributária.
5. **Integrações gov:** certificado A1 (cofre), NF-e recebidas (DFe), emissão NF-e (homologação).
6. **Folha + eSocial.**
7. **Financeiro, Portal do Cliente (PWA), API pública, billing recorrente.**

Cada etapa: implementar → testar (unit+integração+E2E) → documentar → avançar. Não declarar pronto sem teste com evidência.
