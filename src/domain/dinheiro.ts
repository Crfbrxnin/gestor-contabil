// Dinheiro em centavos (inteiro). Nunca usar float para dinheiro.
// Converte "1500.00", "1500,00", "1.500,00" ou 1500 -> 150000 (centavos).

export class ErroValor extends Error {
  readonly codigo = "valor_invalido";
  constructor(msg: string) {
    super(msg);
    this.name = "ErroValor";
  }
}

export function reaisParaCentavos(valor: number | string): number {
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) throw new ErroValor("valor numérico inválido");
    return Math.round(valor * 100);
  }
  let s = valor.trim();
  if (!s) throw new ErroValor("valor vazio");
  const negativo = s.startsWith("-");
  if (negativo) s = s.slice(1);
  // Remove separador de milhar e normaliza vírgula decimal.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new ErroValor(`valor malformado: ${valor}`);
  const [inteira, dec = ""] = s.split(".");
  const centavos = Number(inteira) * 100 + Number((dec + "00").slice(0, 2));
  return negativo ? -centavos : centavos;
}

export function centavosParaReais(c: number): string {
  const sinal = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${sinal}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
