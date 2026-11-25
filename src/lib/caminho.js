// Resolve o caminho a partir da raiz desta instalação, inclusive em subpastas.
export function caminho(arquivo) {
  return new URL('../../' + arquivo, import.meta.url).href
}
