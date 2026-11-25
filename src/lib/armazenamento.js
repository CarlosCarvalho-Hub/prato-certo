// Uma instalação por pasta do GitHub Pages. A memória da aba também funciona
// quando o navegador bloqueia LocalStorage. Nunca guardamos coordenadas.
const prefixo = 'pratocerto:' + new URL('../../', import.meta.url).pathname + ':'
const memoria = new Map()
let disponivel = true

function avisarFalha() {
  disponivel = false
  window.dispatchEvent(new Event('memoria-indisponivel'))
}

export function ler(chave, padrao) {
  let valor = memoria.get(chave)
  if (disponivel) {
    try {
      valor = localStorage.getItem(prefixo + chave)
      memoria.set(chave, valor)
    } catch { avisarFalha() }
  }
  try { return valor == null ? padrao : JSON.parse(valor) }
  catch { return padrao }
}

export function guardar(chave, valor) {
  const json = JSON.stringify(valor)
  memoria.set(chave, json)
  if (disponivel) {
    try { localStorage.setItem(prefixo + chave, json) }
    catch { avisarFalha() }
  }
}

export function remover(chave) {
  memoria.delete(chave)
  if (disponivel) {
    try { localStorage.removeItem(prefixo + chave) }
    catch { avisarFalha() }
  }
}

export function observar(chaves, atualizar) {
  window.addEventListener('storage', evento => {
    if (evento.key === null || chaves.some(chave => prefixo + chave === evento.key)) atualizar()
  })
}

export const memoriaDisponivel = () => disponivel
