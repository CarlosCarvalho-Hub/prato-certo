// A entrada já contém apenas pratos compatíveis, na ordem usada na tabela.
export function sugerir(linhas, inicio = 0) {
  if (!linhas.length) return []
  const quantidade = Math.min(3, linhas.length)
  return Array.from({ length: quantidade }, (_, i) => linhas[(inicio + i) % linhas.length])
}

export const LIMITE_HISTORICO = 20

export function registrar(historico, ids, criterios, data = new Date().toISOString()) {
  if (!ids.length) return historico
  return [{ data, ids: [...ids], criterios }, ...historico].slice(0, LIMITE_HISTORICO)
}
