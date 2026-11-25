import { PRATOS, RESTAURANTES } from '../dados/catalogo.js'
import { nomeDaRestricao, cozinha } from '../lib/opcoes.js'
import { escapar } from '../lib/html.js'
import { emReais } from '../lib/dinheiro.js'
import { icone } from '../lib/icone.js'
import { ler, guardar, observar, remover } from '../lib/armazenamento.js'
import { sugerir, registrar, LIMITE_HISTORICO } from '../lib/recomendacoes.js'

const pratos = new Map(PRATOS.map(prato => [prato.id, prato]))
const restaurantes = new Map(RESTAURANTES.map(restaurante => [restaurante.id, restaurante]))
const $ = seletor => document.querySelector(seletor)
const dataCurta = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function idsValidos(valor) {
  return Array.isArray(valor) ? [...new Set(valor.filter(id => pratos.has(id)))] : []
}
function favoritos() { return idsValidos(ler('favoritos', [])) }
function historico() {
  const lista = ler('historico', [])
  if (!Array.isArray(lista)) return []
  return lista.filter(item => item && typeof item.data === 'string' && Number.isFinite(Date.parse(item.data))
    && typeof item.criterios === 'string' && idsValidos(item.ids).length).slice(0, LIMITE_HISTORICO)
}

function botaoFavorito(prato, salvo) {
  const acao = salvo ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
  return `<button type="button" class="favoritar" data-favorito="${prato.id}" aria-label="${acao}: ${escapar(prato.nome)}"
    title="${acao}">${icone(salvo ? 'coracao-cheio' : 'coracao')}<span>${salvo ? 'Remover' : 'Favoritar'}</span></button>`
}

function cartao(prato, salvo) {
  const local = restaurantes.get(prato.restaurante_id)
  return `<article class="cartao">
    <p class="cartao__cozinha">${escapar(cozinha(prato.cozinha).nome)}</p>
    <h3>${escapar(prato.nome)}</h3>
    <p class="cartao__descricao">${escapar(prato.descricao)}</p>
    <p class="cartao__local">${icone('pino')}${escapar(local.nome)} · ${escapar(local.bairro)}</p>
    <ul class="selos" aria-label="Marcações do catálogo">${prato.tags.map(tag => `<li class="selo">${escapar(nomeDaRestricao(tag))}</li>`).join('')}</ul>
    <div class="cartao__fim"><strong>${emReais(prato.preco)}</strong>${botaoFavorito(prato, salvo)}</div>
  </article>`
}

export function iniciarColecao() {
  let linhas = []
  let inicio = 0
  let exibidos = []
  let criterios = ''
  let assinatura = ''
  const gerar = $('[data-gerar]')
  const aviso = $('[data-sugestoes-aviso]')

  function mostrar() {
    const salvos = favoritos()
    $('[data-cartoes]').innerHTML = exibidos.map(id => cartao(pratos.get(id), salvos.includes(id))).join('')
    $('[data-favoritos]').innerHTML = salvos.map(id => cartao(pratos.get(id), true)).join('')
    $('[data-sem-favoritos]').hidden = salvos.length > 0
    $('[data-total-favoritos]').textContent = String(salvos.length)
    const registros = historico()
    $('[data-historico]').innerHTML = registros.map(item => `<li>
      <time datetime="${escapar(item.data)}">${dataCurta.format(new Date(item.data))}</time>
      <p>${escapar(item.criterios)}</p>
      <ul>${idsValidos(item.ids).map(id => `<li>${escapar(pratos.get(id).nome)}</li>`).join('')}</ul></li>`).join('')
    $('[data-sem-historico]').hidden = registros.length > 0
  }

  function atualizar(novasLinhas, novosCriterios) {
    linhas = novasLinhas
    criterios = novosCriterios
    const novaAssinatura = JSON.stringify([criterios, linhas.map(linha => linha.prato.id)])
    if (assinatura === novaAssinatura) return
    assinatura = novaAssinatura
    inicio = 0
    exibidos = []
    gerar.disabled = !linhas.length
    gerar.textContent = 'Gerar sugestões'
    aviso.textContent = linhas.length ? 'Gere até três pratos na ordem escolhida no cardápio.'
      : 'Nenhum prato combina com estas escolhas. Você pode rever as cozinhas selecionadas.'
    mostrar()
  }

  gerar.addEventListener('click', () => {
    if (!linhas.length) return
    exibidos = sugerir(linhas, inicio).map(linha => linha.prato.id)
    guardar('historico', registrar(historico(), exibidos, criterios))
    inicio = (inicio + exibidos.length) % linhas.length
    gerar.textContent = linhas.length > 3 ? 'Ver outras sugestões' : 'Gerar novamente'
    aviso.textContent = exibidos.length === 3 ? 'Três sugestões compatíveis. Seleção salva no histórico.'
      : `O catálogo tem apenas ${exibidos.length === 1 ? 'um prato compatível' : 'dois pratos compatíveis'} com estas escolhas.`
    mostrar()
  })

  document.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-favorito]')
    if (!botao) return
    const grupo = botao.closest('[data-cartoes], [data-favoritos]')
    const id = Number(botao.dataset.favorito)
    const salvos = favoritos()
    const adicionar = !salvos.includes(id)
    const posicao = [...grupo.querySelectorAll('button')].indexOf(botao)
    guardar('favoritos', adicionar ? [...salvos, id] : salvos.filter(item => item !== id))
    mostrar()
    const botoes = grupo.querySelectorAll('button')
    const alvo = grupo.querySelector(`[data-favorito="${id}"]`) ?? botoes[Math.min(posicao, botoes.length - 1)] ?? $('#titulo-favoritos')
    alvo.focus({ preventScroll: true })
    $('[data-aviso-favorito]').textContent = pratos.get(id).nome + (adicionar ? ' adicionado aos favoritos.' : ' removido dos favoritos.')
  })
  observar(['favoritos', 'historico'], mostrar)
  return { atualizar, limpar() {
    remover('favoritos')
    remover('historico')
    assinatura = ''
    $('[data-aviso-favorito]').textContent = ''
  } }
}
