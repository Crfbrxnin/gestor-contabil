# Estudo de categoria: ERP contábil em nuvem → base para o meu sistema

> **Objetivo.** Entender como funciona uma plataforma da categoria "ERP contábil em nuvem para escritórios de contabilidade" (usando a Numbra como referência de mercado, só por material **público**) para projetar um **sistema próprio, independente**, com arquitetura robusta, integrações confiáveis e processos bem estruturados.
>
> **Não é** clonar a Numbra, copiar interface, extrair código ou reproduzir propriedade intelectual. A referência serve para mapear a **categoria** (o que o mercado espera) e as **integrações oficiais** (que são de órgãos públicos e provedores, não da Numbra).

## Método e honestidade da investigação

- **Ambiente real desta análise:** sessão em container Linux na nuvem. O navegador disponível é o desta máquina, **não** um Chrome logado do usuário. Logo, só foi investigado o que é **público**.
- **Área logada (`/dashboard`):** **NÃO ACESSADA**. `GET https://numbra.com.br/dashboard` redireciona para `/login` (confirmado). Nenhuma credencial foi usada, nenhum controle de acesso foi contornado.
- **Fontes públicas lidas (todas permitidas pelo `robots.txt`):**
  - `https://numbra.com.br/llms.txt` — descrição estruturada feita para IA (módulos, limites, integrações).
  - `https://numbra.com.br/api` — **referência técnica da API** (endpoints, auth, exemplos).
  - `https://numbra.com.br/documentacao` — Central de Ajuda (explica cada módulo e fluxo).
  - `https://numbra.com.br/faq`, `/planos`, `/` — preços, posicionamento, módulos.

### Classificação das evidências (usada em todos os documentos)

| Marca | Significado |
|---|---|
| **[COMPROVADO]** | Observado diretamente em fonte pública (texto da API/ajuda/llms.txt). |
| **[INFERIDO]** | Hipótese técnica plausível a partir da evidência, **não** confirmada. |
| **[NÃO IDENTIFICADO]** | Não foi possível determinar com o material público. |

## O que a referência é (resumo factual) — [COMPROVADO]

ERP contábil SaaS multiempresa para escritórios brasileiros. Módulos na **mesma base**: **Contábil, Fiscal, Folha, Financeiro, Central de Obrigações (Escritório) e Portal do Cliente**. Multi-tenant: um escritório (tenant) administra várias empresas-cliente, com dados **isolados por empresa** (LGPD). Regimes: MEI, Simples, Lucro Presumido, Lucro Real.

**Pilha técnica da referência (parcial):** backend **Laravel** com **Sanctum** (confirmado pela doc da API). Frontend não identificado publicamente. *Isso é só diagnóstico de categoria; a arquitetura recomendada para o seu sistema está no doc 03 e é uma decisão independente.*

## Entregáveis deste estudo

| Arquivo | Conteúdo |
|---|---|
| `00-RESUMO-E-METODO.md` | Este arquivo: escopo, método, evidências. |
| `01-MAPA-FUNCIONAL-E-FLUXOS.md` | Módulos, jornada do usuário e diagramas dos fluxos-chave. |
| `02-CATALOGO-DE-INTEGRACOES.md` | **O núcleo.** Cada integração: provedor, finalidade, mecanismo, dados, erros e **a API oficial** que o seu sistema deve usar. |
| `03-ARQUITETURA-PROPRIA.md` | Projeto independente: stack, banco, multi-tenancy, camada de integrações, OAuth/credenciais, webhooks, filas, jobs, retry/idempotência, observabilidade, permissões, escala, segurança/LGPD, testes. |
| `capturas/` | (a preencher quando houver navegador com captura de tela.) |

## Limites explícitos deste estudo (sem esconder nada)

- A parte **visual** da área logada não foi medida (não acessível). A fidelidade visual não é objetivo aqui — o objetivo é **arquitetura e integrações**.
- Detalhes internos de implementação da Numbra (filas, bancos, provedores de pagamento) são **[INFERIDO]** ou **[NÃO IDENTIFICADO]** — este estudo propõe uma implementação **própria**, baseada nas **APIs oficiais dos órgãos/provedores**, não na engenharia interna deles.
