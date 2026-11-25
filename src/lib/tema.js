import { ler, guardar, observar } from './armazenamento.js'

const botao = document.querySelector('[data-tema]')
export function mostrarTema() {
  const claro = ler('tema', 'escuro') === 'claro'
  document.documentElement.dataset.tema = claro ? 'claro' : 'escuro'
  document.querySelector('meta[name="theme-color"]').content = claro ? '#faf7f4' : '#100d0f'
  if (botao) {
    botao.setAttribute('aria-pressed', String(claro))
    botao.title = claro ? 'Ativar tema escuro' : 'Ativar tema claro'
  }
}
botao?.addEventListener('click', () => {
  guardar('tema', document.documentElement.dataset.tema === 'claro' ? 'escuro' : 'claro')
  mostrarTema()
})
observar(['tema'], mostrarTema)
mostrarTema()
