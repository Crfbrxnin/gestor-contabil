# Mapa funcional e fluxos (Fases 1 e 3)

Fonte: material público (llms.txt, Central de Ajuda, API, planos). **[COMPROVADO]** salvo marcação.

## Módulos da categoria (o que um ERP contábil precisa ter)

- **Cadastros/Estrutura:** Empresas (busca por CNPJ), Plano de Contas (sintéticas × analíticas), Centros de Custo (grupos/subgrupos, rateio), Categorias financeiras, Históricos padronizados.
- **Contábil:** Lançamentos (partidas dobradas, recorrentes, importação em lote, trilha de auditoria, aprovação), Conciliação (OFX/CNAB), Fechamento de período (bloqueio, checklist, reabertura rastreada, encerramento de exercício), Relatórios (Razão, Diário, Balancete, DRE, Balanço, DFC).
- **Fiscal:** Apuração (Simples/Presumido/Real, Fator R), guias (DAS/PGDAS-D com memória), SPED (ECD, ECF, EFD ICMS/IPI, Contribuições, Reinf), Agenda Tributária consolidada, NF-e/NFS-e/CT-e.
- **Folha:** Funcionários, cálculo mensal (INSS/IRRF/FGTS), férias, 13º, rescisão, eSocial, holerites, simulador de custo, provisões → contabilização.
- **Financeiro:** Contas a pagar/receber, Fluxo de caixa, retorno CNAB, aprovação de pagamentos.
- **Escritório:** Central de Obrigações (calendário oficial por empresa), tarefas (responsável/prazo), visão da carteira, histórico.
- **Portal do Cliente:** marca branca (nome/logo/cor do escritório), PWA; cliente baixa guias/documentos, envia arquivos, responde pedidos.
- **Transversais:** multiempresa com isolamento (LGPD), busca global, avisos proativos ("percebeu"), auditoria (quem/quando/o quê), permissões por papel.

## Jornada do usuário (onboarding) — [COMPROVADO/INFERIDO]

1. Marketing → **Testar grátis** (7 dias, sem cartão) ou **Entrar** (e-mail/senha ou Google).
2. Cria o **tenant** (escritório) e o primeiro usuário.
3. Cadastra a **primeira empresa** pelo **CNPJ** (preenche sozinho).
4. Define **regime tributário** e sobe o **certificado A1**.
5. Monta/importa o **plano de contas** (sugerido, CSV/Excel ou do zero).
6. Importa dados (planilhas, XML de notas, OFX) e informa **saldos de abertura**.
7. Usa os módulos; convida a equipe (papéis); ativa o **Portal do Cliente**.

---

## Diagramas dos fluxos-chave (Mermaid)

### A) Cadastro de empresa por CNPJ
```mermaid
sequenceDiagram
  participant U as Usuário (escritório)
  participant FE as Frontend
  participant API as API do sistema
  participant CNPJ as Serviço de CNPJ (dados abertos)
  participant DB as Banco (tenant/empresa)
  U->>FE: digita CNPJ
  FE->>API: POST /empresas {cnpj}
  API->>CNPJ: GET dados do CNPJ
  CNPJ-->>API: razão social, endereço, CNAE, situação
  API->>DB: cria empresa (isolada no tenant) + cache do CNPJ
  API-->>FE: empresa pré-preenchida (editável)
  Note over API,CNPJ: Falha do provedor → fallback manual
```

### B) Emissão de NF-e (SEFAZ) com lançamento automático
```mermaid
sequenceDiagram
  participant U as Usuário
  participant API as API/Serviço fiscal
  participant CERT as Cofre (certificado A1)
  participant SEFAZ as SEFAZ (webservice UF)
  participant LCTO as Motor contábil
  U->>API: emitir NF-e (dados da nota)
  API->>CERT: obtém chave/cert em memória
  API->>SEFAZ: envia XML assinado (autorização)
  SEFAZ-->>API: protocolo + status (autorizada/rejeitada)
  alt autorizada
    API->>LCTO: gera lançamento pelo mapeamento de contas
    API-->>U: DANFE (PDF) + XML
  else rejeitada
    API-->>U: código/descrição da rejeição (corrigir)
  end
```

### C) Conciliação bancária por OFX
```mermaid
flowchart TD
  A[Upload do extrato OFX] --> B[Parser OFX -> transações]
  B --> C{Casar com lançamentos existentes}
  C -->|bate| D[Marcar conciliado]
  C -->|falta lançar| E[Sugerir novo lançamento - contrapartida aprendida]
  C -->|duplicado| F[Sinalizar duplicidade]
  E --> G[Usuário confirma] --> D
  D --> H[Histórico de importação guardado]
```

### D) Lançamento via API: idempotência + fila de aprovação — [COMPROVADO]
```mermaid
sequenceDiagram
  participant EXT as Integrador (terceiro)
  participant API as API /v1/lancamentos
  participant Q as Fila de aprovação
  participant CONT as Contador responsável
  participant LIVRO as Balancete/SPED
  EXT->>API: POST lançamento {idempotency_key, partidas[]}
  alt idempotency_key já existe
    API-->>EXT: 200 (mesmo lançamento, não duplica)
  else nova
    API-->>EXT: 201 status "pendente"
    API->>Q: enfileira para aprovação
    CONT->>Q: aprova/rejeita
    Q-->>LIVRO: só depois de aprovado reflete no fechamento
  end
  Note over API,LIVRO: A API nunca grava direto no fechamento oficial
```

### E) eSocial (transmissão assíncrona)
```mermaid
sequenceDiagram
  participant FOLHA as Módulo Folha
  participant Q as Fila (job)
  participant ES as eSocial (gov)
  FOLHA->>Q: gera eventos (XML assinado A1) em lote
  Q->>ES: envia lote
  ES-->>Q: protocolo (processando)
  loop polling com backoff
    Q->>ES: consulta resultado(protocolo)
    ES-->>Q: em processamento / sucesso / erro
  end
  Q-->>FOLHA: guarda recibo ou erro por evento
```
