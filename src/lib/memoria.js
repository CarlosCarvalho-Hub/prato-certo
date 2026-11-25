import { ler, guardar, remover } from './armazenamento.js'

export const PADRAO = { restricoes: [], gostos: [], bairro: '', ordem: 'preco' }
const lista = valor => Array.isArray(valor) ? valor.filter(item => typeof item === 'string') : []

export function lerEscolhas() {
  const salvo = ler('escolhas', null) ?? PADRAO
  return { restricoes: lista(salvo.restricoes), gostos: lista(salvo.gostos),
    bairro: typeof salvo.bairro === 'string' ? salvo.bairro : '', ordem: salvo.ordem }
}

// Lista explícita para que coordenadas do aparelho nunca sejam gravadas.
export function gravarEscolhas({ restricoes, gostos, bairro, ordem }) {
  guardar('escolhas', { restricoes, gostos, bairro, ordem })
}

export function apagarTudo() { remover('escolhas') }
