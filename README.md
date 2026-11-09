# gestor-contabil

Sistema de gestão **contábil e fiscal** para empresas **MEI e Simples Nacional** (multiempresa, sem folha — só pró-labore). Em construção, com meta de MVP usável em **janeiro**.

> Método: módulos pequenos, cada um **testado e rodando** antes do próximo. Núcleo de domínio **puro, sem framework** — a parte que não apodrece. Nada de "pronto" só porque o botão aparece.

## Status

| Fase | Situação |
|---|---|
| Núcleo contábil (partidas dobradas, idempotência, aprovação, período fechado) | ✅ feito e testado (TypeScript) |
| Fundação do app (Next.js + Supabase/Postgres, auth, multiempresa) | ⏳ próxima |

## Stack

- **Domínio:** TypeScript puro (`src/domain/`), sem dependências de framework.
- **App (a vir):** Next.js + TypeScript + Tailwind + shadcn/ui.
- **Banco (a vir):** PostgreSQL via Supabase (Auth + RLS para isolar empresas).
- **Testes:** Vitest.

## Como rodar os testes

```bash
npm install
npm test        # roda a suíte (Vitest)
npm run typecheck   # checagem de tipos (tsc)
```

## Estrutura

```
gestor-contabil/
  src/
    domain/                 # regras puras (sem framework)
      dinheiro.ts           # dinheiro em centavos (sem float)
      lancamento.ts         # partidas dobradas + idempotência
      __tests__/            # testes do domínio
  docs/                     # estudo de categoria, arquitetura e plano
    PLANO-MVP-2-MESES.md     # escopo e plano de 8 semanas (leia este)
    03-ARQUITETURA-PROPRIA.md
    02-CATALOGO-DE-INTEGRACOES.md
    01-MAPA-FUNCIONAL-E-FLUXOS.md
    00-RESUMO-E-METODO.md
```

## Escopo do MVP (resumo — detalhes em `docs/PLANO-MVP-2-MESES.md`)

**Dentro:** multiempresa, cadastro por CNPJ, plano de contas, contábil (lançamentos + razão + Balancete/DRE), financeiro (contas a pagar/receber, OFX), **apuração Simples (PGDAS-D/DAS) + DAS-MEI**, importação de XML, painel de prazos, pró-labore.

**Fora (de propósito):** emissão de NF-e (há emissor externo), transmissão de declarações (fica no portal/PVA oficial), folha/eSocial de empregado, Lucro Presumido/Real, Portal do Cliente — tudo fase 2.
