// Núcleo de partidas dobradas — puro, sem dependências, sem framework.
// Regra: um lançamento debita e credita contas analíticas, sempre balanceado.
// Entrada por integração/API nasce "pendente" e passa por aprovação antes de
// refletir no fechamento (trava de compliance contábil).

import { reaisParaCentavos } from "./dinheiro.js";

export type Id = number | string;
export type TipoPartida = "debito" | "credito";

export interface Conta {
  aceita_lancamento: boolean; // true = analítica (recebe lançamento)
  ativa?: boolean;
}

export interface PartidaInput {
  conta_id: Id;
  tipo: TipoPartida;
  valor: number | string; // em reais; convertido para centavos
  centro_custo_id?: Id | null;
}

export interface LancamentoInput {
  empresa_id: Id;
  data_competencia: string; // AAAA-MM-DD
  historico: string;
  idempotency_key: Id;
  partidas: PartidaInput[];
  origem?: string;
}

export interface Partida {
  conta_id: Id;
  tipo: TipoPartida;
  valor_centavos: number;
  centro_custo_id: Id | null;
}

export interface Lancamento {
  empresa_id: Id;
  data_competencia: string;
  competencia: string; // AAAA-MM
  historico: string;
  idempotency_key: Id;
  origem: string;
  status: "pendente" | "aprovado" | "rejeitado";
  total_centavos: number;
  partidas: Partida[];
}

export interface MontarDeps {
  contas: Map<Id, Conta>;
  periodoFechado?: (empresa_id: Id, competencia: string) => boolean;
}

export interface LancamentoStore {
  obter(empresa_id: Id, idempotency_key: Id): (Lancamento & { id?: Id }) | undefined;
  salvar(l: Lancamento): Lancamento & { id?: Id };
}

export type CodigoRegra =
  | "empresa_obrigatoria" | "competencia_invalida" | "historico_obrigatorio"
  | "historico_longo" | "idempotency_obrigatoria" | "partidas_insuficientes"
  | "periodo_fechado" | "conta_obrigatoria" | "tipo_invalido" | "conta_inexistente"
  | "conta_inativa" | "conta_sintetica" | "valor_nao_positivo" | "desbalanceado"
  | "store_ausente";

export class ErroRegra extends Error {
  constructor(readonly codigo: CodigoRegra, msg: string) {
    super(msg);
    this.name = "ErroRegra";
  }
}

const TIPOS = new Set<TipoPartida>(["debito", "credito"]);

/** Valida e monta um lançamento balanceado em centavos (status "pendente"). */
export function montarLancamento(input: LancamentoInput, deps: MontarDeps): Lancamento {
  const contas = deps.contas ?? new Map<Id, Conta>();
  const { empresa_id, data_competencia, historico, idempotency_key, partidas } = input ?? {};

  if (!empresa_id) throw new ErroRegra("empresa_obrigatoria", "empresa_id é obrigatório");
  if (!ehCompetenciaValida(data_competencia))
    throw new ErroRegra("competencia_invalida", "data_competencia deve ser AAAA-MM-DD");
  if (!historico || String(historico).trim().length === 0)
    throw new ErroRegra("historico_obrigatorio", "historico é obrigatório");
  if (String(historico).length > 255)
    throw new ErroRegra("historico_longo", "historico excede 255 caracteres");
  if (idempotency_key === undefined || idempotency_key === null || idempotency_key === "")
    throw new ErroRegra("idempotency_obrigatoria", "idempotency_key é obrigatório");
  if (!Array.isArray(partidas) || partidas.length < 2)
    throw new ErroRegra("partidas_insuficientes", "são necessárias ao menos 2 partidas");

  if (deps.periodoFechado && deps.periodoFechado(empresa_id, competenciaDe(data_competencia)))
    throw new ErroRegra("periodo_fechado", "período fechado não aceita lançamento");

  let totalDebito = 0, totalCredito = 0;
  const partidasNorm: Partida[] = partidas.map((p, i) => {
    if (!p || p.conta_id === undefined) throw new ErroRegra("conta_obrigatoria", `partida ${i}: conta_id obrigatório`);
    if (!TIPOS.has(p.tipo)) throw new ErroRegra("tipo_invalido", `partida ${i}: tipo deve ser debito|credito`);
    const conta = contas.get(p.conta_id);
    if (!conta) throw new ErroRegra("conta_inexistente", `partida ${i}: conta ${p.conta_id} não existe nessa empresa`);
    if (conta.ativa === false) throw new ErroRegra("conta_inativa", `partida ${i}: conta ${p.conta_id} inativa`);
    if (!conta.aceita_lancamento)
      throw new ErroRegra("conta_sintetica", `partida ${i}: conta ${p.conta_id} é sintética (não recebe lançamento)`);
    const valor = reaisParaCentavos(p.valor);
    if (valor <= 0) throw new ErroRegra("valor_nao_positivo", `partida ${i}: valor deve ser > 0`);
    if (p.tipo === "debito") totalDebito += valor; else totalCredito += valor;
    return { conta_id: p.conta_id, tipo: p.tipo, valor_centavos: valor, centro_custo_id: p.centro_custo_id ?? null };
  });

  if (totalDebito !== totalCredito)
    throw new ErroRegra("desbalanceado", `débitos (${totalDebito}) ≠ créditos (${totalCredito}) — partidas não batem`);

  return {
    empresa_id,
    data_competencia,
    competencia: competenciaDe(data_competencia),
    historico: String(historico).trim(),
    idempotency_key,
    origem: input.origem ?? "api",
    status: "pendente",
    total_centavos: totalDebito,
    partidas: partidasNorm,
  };
}

/** Registra um lançamento de forma idempotente (reenvio com a mesma chave não duplica). */
export function registrarLancamento(
  input: LancamentoInput,
  deps: MontarDeps & { store: LancamentoStore },
): { novo: boolean; lancamento: Lancamento & { id?: Id } } {
  const store = deps.store;
  if (!store) throw new ErroRegra("store_ausente", "store é obrigatório");
  const lanc = montarLancamento(input, deps);
  const existente = store.obter(lanc.empresa_id, lanc.idempotency_key);
  if (existente) return { novo: false, lancamento: existente };
  return { novo: true, lancamento: store.salvar(lanc) };
}

function ehCompetenciaValida(d: string): boolean {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
}
function competenciaDe(d: string): string {
  return d.slice(0, 7);
}
