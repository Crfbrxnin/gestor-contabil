# MVP de 2 meses — Gestão contábil/fiscal para MEI + Simples (multiempresa)

> **Meta:** em janeiro, gerir várias empresas (MEI e Simples Nacional, **sem empregados — só pró-labore**) com contabilidade, financeiro e **apuração do Simples/MEI**, num sistema próprio, usável no dia a dia.

Regra de ouro contra o Frankenstein: **escopo congelado**, módulos pequenos, cada um **testado e rodando** antes do próximo. Ideia nova vai pro backlog, não pro meio.

## ✅ DENTRO do MVP (o que entra)

1. **Conta e multiempresa:** login, tenant (você/escritório), papéis, troca entre empresas.
2. **Empresas:** cadastro com busca por **CNPJ** (autofill), regime (MEI/Simples), dados essenciais.
3. **Plano de contas** por empresa (plano sugerido + edição; sintética/analítica).
4. **Contábil:** lançamentos (**núcleo já pronto e testado**), razão, **saldos**, relatórios essenciais (Razão, Balancete, DRE).
5. **Financeiro:** contas a pagar/receber, categorias, fluxo de caixa, **importação OFX + conciliação**.
6. **Fiscal (o coração):**
   - **Importação de XML** de notas → receitas por empresa/competência.
   - **Apuração do Simples (PGDAS-D)**: Anexos I–V, RBT12, alíquota efetiva, **Fator R**, segregação de receitas, valor do **DAS** — com **memória de cálculo**.
   - **DAS-MEI** (fixo) e marcação de **DASN-SIMEI/DEFIS** (anuais).
7. **Painel de obrigações/prazos:** vencimento do DAS por empresa, anuais, alertas de pendência.
8. **Pró-labore:** lançamento recorrente simples (retirada + INSS) — **último da fila**.

## ❌ FORA do MVP (explicitamente — para caber em 2 meses)

- **Emissão de NF-e** → você já tem emissor. O sistema só **importa o XML**.
- **Transmissão** de declarações/SPED → fica no **portal/PVA oficial** (o sistema **gera/calcula**, não transmite).
- **Folha completa / eSocial de empregado** → não há empregados.
- **Lucro Presumido / Real** e suíte **SPED** (ECD/ECF/EFD) → fora (nenhuma empresa é desses regimes).
- **Portal do Cliente**, **Reforma Tributária**, relatórios gerenciais avançados → **fase 2** (pós-janeiro).

*Qualquer um desses pode entrar depois — mas não agora, senão não fica pronto.*

## Stack recomendada (decisão para não retrabalhar)

- **Frontend+Backend:** **Next.js + TypeScript** (um app só, mais simples de manter sozinho).
- **Banco:** **PostgreSQL** via **Supabase** (já vem com **Auth** e **RLS** para isolar empresas) — ou Postgres gerenciado equivalente. *Por quê Postgres e não Firebase: dado contábil é relacional e exige integridade (partidas, saldos) — Postgres é a ferramenta certa.*
- **Núcleo de domínio:** **TypeScript puro, sem framework** (como o `nucleo-contabil` já feito) — a parte que não apodrece.
- **Testes:** `node:test`/Vitest no domínio; testes de apuração contra **casos reais conferidos**.
- **Hospedagem:** Vercel (app) + Supabase (banco) — free tier cobre o começo.

## Plano por semana (8 semanas)

| Sem | Entrega (cada uma: código + teste verde + rodando) |
|----|----|
| 1 | Fundação: projeto Next+TS, Postgres/Supabase, **auth + multiempresa (RLS)**, cadastro de **empresas (CNPJ autofill)**. |
| 2 | **Plano de contas** (sugerido + edição) e **lançamentos** ligados ao núcleo; tela de lançar. |
| 3 | **Razão + saldos + Balancete/DRE** (o núcleo gera números reais). |
| 4 | **Financeiro**: contas a pagar/receber, categorias, fluxo de caixa. |
| 5 | **Importação OFX + conciliação** (parser + matching). |
| 6 | **Importação de XML de notas** → receitas; base da apuração. |
| 7 | **Apuração do Simples (PGDAS-D) + DAS**, memória de cálculo; **DAS-MEI**. |
| 8 | **Painel de obrigações/prazos**, **pró-labore**, ajustes, testes de ponta a ponta. |

*Folga proposital: se uma semana escorregar, a fase 2 absorve. O fiscal (sem. 6–7) é o mais sensível — vamos validar a apuração contra DAS reais que você já tem.*

## Definição de "pronto" (por módulo)

1. Regras de domínio com **testes** passando.
2. Tela funcional com estados de vazio/erro/carregando.
3. **Rodando no deploy** que você acessa e usa.
4. Documentado em uma linha no CHANGELOG.
> Nada é "pronto" só porque o botão aparece.

## Riscos que eu não vou esconder

- **Apuração fiscal precisa ser conferida** contra casos reais (a lei do Simples tem detalhes). Não confie no cálculo sem bater com um DAS verdadeiro — vamos testar assim.
- **Manutenção:** mudança de tabela do Simples (anual) exige atualização. Previsível, pequeno.
- **LGPD:** dados reais de clientes — isolamento por empresa (RLS), nada de dado real nos testes.
- **É iterativo:** 2 meses, vários encontros. Cada peça some no todo sem virar remendo porque cada uma é testada e isolada.

## O que já está pronto
- `nucleo-contabil/` — motor de partidas dobradas (idempotência, aprovação, período fechado): **10 testes verdes**. Reaproveitado a partir da semana 2.
