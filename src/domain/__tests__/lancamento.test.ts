import { describe, test, expect } from "vitest";
import {
  montarLancamento, registrarLancamento, ErroRegra,
  type Conta, type Id, type LancamentoInput, type Lancamento,
} from "../lancamento.js";
import { reaisParaCentavos, centavosParaReais } from "../dinheiro.js";

// Plano de contas de teste: 301 Caixa (analítica), 512 Receita (analítica),
// 1 Ativo (sintética), 999 inativa.
const contas = new Map<Id, Conta>([
  [301, { aceita_lancamento: true, ativa: true }],
  [512, { aceita_lancamento: true, ativa: true }],
  [1, { aceita_lancamento: false, ativa: true }],
  [999, { aceita_lancamento: true, ativa: false }],
]);

const base: LancamentoInput = {
  empresa_id: 12,
  data_competencia: "2026-09-01",
  historico: "Doação recebida — campanha setembro",
  idempotency_key: 883921,
  partidas: [
    { conta_id: 301, tipo: "debito", valor: "1500.00" },
    { conta_id: 512, tipo: "credito", valor: "1500.00" },
  ],
};

describe("dinheiro", () => {
  test("converte reais em centavos sem erro de float", () => {
    expect(reaisParaCentavos("1500.00")).toBe(150000);
    expect(reaisParaCentavos("1.500,50")).toBe(150050);
    expect(reaisParaCentavos(0.1) + reaisParaCentavos(0.2)).toBe(30);
    expect(centavosParaReais(150050)).toBe("1500.50");
  });
});

describe("núcleo de partidas dobradas", () => {
  test("lançamento balanceado vira 'pendente' e soma certo", () => {
    const l = montarLancamento(base, { contas });
    expect(l.status).toBe("pendente");
    expect(l.total_centavos).toBe(150000);
    expect(l.competencia).toBe("2026-09");
    expect(l.partidas).toHaveLength(2);
  });

  test("rejeita lançamento desbalanceado", () => {
    const ruim = { ...base, partidas: [
      { conta_id: 301, tipo: "debito", valor: "1500.00" },
      { conta_id: 512, tipo: "credito", valor: "1400.00" },
    ] } as LancamentoInput;
    expect(() => montarLancamento(ruim, { contas })).toThrow(ErroRegra);
    try { montarLancamento(ruim, { contas }); } catch (e) { expect((e as ErroRegra).codigo).toBe("desbalanceado"); }
  });

  test("exige ao menos 2 partidas", () => {
    const ruim = { ...base, partidas: [{ conta_id: 301, tipo: "debito", valor: "10.00" }] } as LancamentoInput;
    expect(() => montarLancamento(ruim, { contas })).toThrowError(/2 partidas/);
  });

  test("rejeita valor não positivo", () => {
    const ruim = { ...base, partidas: [
      { conta_id: 301, tipo: "debito", valor: "0.00" },
      { conta_id: 512, tipo: "credito", valor: "0.00" },
    ] } as LancamentoInput;
    try { montarLancamento(ruim, { contas }); throw new Error("não lançou"); }
    catch (e) { expect((e as ErroRegra).codigo).toBe("valor_nao_positivo"); }
  });

  test("rejeita conta sintética, inativa e inexistente", () => {
    const cod = (p: LancamentoInput["partidas"]) => {
      try { montarLancamento({ ...base, partidas: p }, { contas }); return "ok"; }
      catch (e) { return (e as ErroRegra).codigo; }
    };
    expect(cod([{ conta_id: 1, tipo: "debito", valor: "100.00" }, { conta_id: 512, tipo: "credito", valor: "100.00" }])).toBe("conta_sintetica");
    expect(cod([{ conta_id: 999, tipo: "debito", valor: "100.00" }, { conta_id: 512, tipo: "credito", valor: "100.00" }])).toBe("conta_inativa");
    expect(cod([{ conta_id: 777, tipo: "debito", valor: "100.00" }, { conta_id: 512, tipo: "credito", valor: "100.00" }])).toBe("conta_inexistente");
  });

  test("bloqueia lançamento em período fechado", () => {
    const deps = { contas, periodoFechado: (_e: Id, comp: string) => comp === "2026-09" };
    try { montarLancamento(base, deps); throw new Error("não bloqueou"); }
    catch (e) { expect((e as ErroRegra).codigo).toBe("periodo_fechado"); }
  });

  test("idempotência: reenvio com a mesma chave NÃO duplica", () => {
    const db = new Map<string, Lancamento & { id?: Id }>();
    const store = {
      obter: (emp: Id, key: Id) => db.get(`${emp}:${key}`),
      salvar: (l: Lancamento) => { const r = { ...l, id: db.size + 1 }; db.set(`${l.empresa_id}:${l.idempotency_key}`, r); return r; },
    };
    const r1 = registrarLancamento(base, { contas, store });
    const r2 = registrarLancamento(base, { contas, store });
    expect(r1.novo).toBe(true);
    expect(r2.novo).toBe(false);
    expect(r1.lancamento.id).toBe(r2.lancamento.id);
    expect(db.size).toBe(1);
  });

  test("campos obrigatórios: histórico e idempotency_key", () => {
    const cod = (patch: Partial<LancamentoInput>) => {
      try { montarLancamento({ ...base, ...patch }, { contas }); return "ok"; }
      catch (e) { return (e as ErroRegra).codigo; }
    };
    expect(cod({ historico: "" })).toBe("historico_obrigatorio");
    expect(cod({ idempotency_key: "" })).toBe("idempotency_obrigatoria");
  });
});
