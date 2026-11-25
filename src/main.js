// Prato Certo: a página dos pratos.
//   1. Restrições (chips)   2. O que você gosta (chips)   3. Tabela de restaurantes e preços
// A lógica de filtrar e ordenar fica em src/lib/tabela.js (testada em tests/tabela.test.js).
// Aqui ligamos a página: ler as escolhas, desenhar a tabela e guardar no navegador.
// O login (entrar.html) é opcional: quem entra também tem as escolhas salvas na conta.

import { mostrarTema } from './lib/tema.js'
import { iniciarColecao } from './componentes/colecao.js'
import { memoriaDisponivel, remover, observar } from './lib/armazenamento.js'
import { RESTAURANTES, PRATOS } from './dados/catalogo.js'
import { RESTRICOES, COZINHAS, nomeDaRestricao, cozinha } from './lib/opcoes.js'
import { BAIRROS, coordenadasDoBairro, distanciaKm, formatarDistancia } from './lib/distancia.js'
import { linhasDaTabela, ordenar, resumo } from './lib/tabela.js'
import { lerEscolhas, gravarEscolhas, apagarTudo, PADRAO } from './lib/memoria.js'
import { chip, ligarChips } from './componentes/chips.js'
import { emReais } from './lib/dinheiro.js'
import { escapar } from './lib/html.js'
import { icone } from './lib/icone.js'
import { caminho } from './lib/caminho.js'
import {
  loginDisponivel,
  iniciarConta,
  usuarioAtual,
  aoMudarConta,
  nomeCurto,
  sair,
  lerPreferencias,
  salvarPreferencias,
} from './lib/conta.js'

// Os jeitos de ordenar que aparecem na tela (src/lib/tabela.js tem mais um, por nome do prato).
const ORDENS = [
  { id: 'preco', nome: 'Menor preço', legenda: 'do menor para o maior preço' },
  { id: 'distancia', nome: 'Mais perto', legenda: 'do mais perto para o mais longe' },
  { id: 'restaurante', nome: 'Restaurante', legenda: 'por restaurante' },
]
const AQUI = 'aqui' // valor do <select> quando a pessoa usa a localização do aparelho
const DICA_SEM_LOCAL = 'Escolha um bairro para ver a distância até cada restaurante.'
const CENTRO_DE_BRASILIA = { latitude: -15.7939, longitude: -47.8828 }

const $ = (seletor) => document.querySelector(seletor)
const el = {
  restricoes: $('[data-restricoes]'),
  gostos: $('[data-gostos]'),
  onde: $('[data-onde]'),
  localizar: $('[data-localizar]'),
  dicaLocal: $('[data-dica-local]'),
  ordem: $('[data-ordem]'),
  resumo: $('[data-resumo]'),
  limpar: $('[data-limpar]'),
  tabela: $('[data-tabela]'),
  legenda: $('[data-legenda]'),
  linhas: $('[data-linhas]'),
  vazio: $('[data-vazio]'),
  apagar: $('[data-apagar]'),
  apagado: $('[data-apagado]'),
  conta: $('[data-conta]'),
  salvamento: $('[data-salvamento]'),
}
const PAGINA_DE_ENTRAR = caminho('entrar.html')

// ---------- Estado ----------

const colecao = iniciarColecao()
function verificarMemoria() {
  $('[data-aviso-memoria]').hidden = memoriaDisponivel()
}
window.addEventListener('memoria-indisponivel', verificarMemoria)
verificarMemoria()

// localizacao: { latitude, longitude } do aparelho, só nesta visita (nunca é guardada).
// desfazer: as escolhas de antes do "Limpar", enquanto der para voltar atrás.
// querPerto: a pessoa pediu "Mais perto" antes de dizer onde está.
const estado = { ...validar(lerEscolhas()), localizacao: null, desfazer: null, querPerto: false }

// O que veio do navegador pode ser de uma versão antiga do site: fica só o que ainda existe.
function validar(escolhas) {
  const restricoes = escolhas.restricoes.filter((id) => RESTRICOES.some((item) => item.id === id))
  const gostos = escolhas.gostos.filter((id) => COZINHAS.some((item) => item.id === id))
  const bairro = coordenadasDoBairro(escolhas.bairro) ? escolhas.bairro : ''
  let ordem = ORDENS.some((item) => item.id === escolhas.ordem) ? escolhas.ordem : PADRAO.ordem
  if (ordem === 'distancia' && !bairro) ordem = PADRAO.ordem
  return { restricoes, gostos, bairro, ordem }
}

function origem() {
  return estado.localizacao ?? coordenadasDoBairro(estado.bairro)
}

// Toda mudança feita pela pessoa passa por aqui: atualiza, guarda e redesenha.
function mudar(parcial, { mensagem = '' } = {}) {
  Object.assign(estado, parcial)
  if (!('desfazer' in parcial)) estado.desfazer = null
  if (origem()) estado.querPerto = false
  gravarEscolhas(estado)
  if (usuarioAtual()) salvarNaContaLogo()
  desenhar({ mensagem })
}

// ---------- Conta (opcional) ----------

// O que vai para a conta: restrições, gostos e bairro (a ordem fica só no navegador).
const paraAConta = () => ({ restricoes: estado.restricoes, gostos: estado.gostos, bairro: estado.bairro })
let ultimoSalvo = '' // para não mandar de novo o que a conta já tem
let espera = null

// Espera meio segundo depois do último toque: marcar 3 chips seguidos vira 1 envio só.
function salvarNaContaLogo() {
  clearTimeout(espera)
  espera = setTimeout(salvarNaConta, 500)
}

async function salvarNaConta() {
  const preferencias = paraAConta()
  const chave = JSON.stringify(preferencias)
  if (chave === ultimoSalvo) return
  try {
    await salvarPreferencias(preferencias)
    ultimoSalvo = chave
    avisarSalvamento('ok')
  } catch {
    avisarSalvamento('erro')
  }
}

// Ao entrar: a conta manda. Se a conta ainda não tem preferências, leva para ela
// o que a pessoa marcou antes de entrar.
async function trazerDaConta() {
  avisarSalvamento('buscando')
  try {
    const daConta = await lerPreferencias()
    if (daConta) {
      const validas = validar({ ...daConta, ordem: estado.ordem })
      Object.assign(estado, {
        restricoes: validas.restricoes,
        gostos: validas.gostos,
        bairro: validas.bairro || estado.bairro,
        desfazer: null,
      })
      if (!origem() && estado.ordem === 'distancia') estado.ordem = PADRAO.ordem
      gravarEscolhas(estado)
      desenharLocais()
      desenhar()
      // Se algo mudou na leitura (o bairro veio deste navegador, ou um id antigo saiu),
      // a conta é atualizada; se não, salvarNaConta() vê que é igual e não manda nada.
      ultimoSalvo = JSON.stringify({ restricoes: daConta.restricoes, gostos: daConta.gostos, bairro: daConta.bairro })
      salvarNaContaLogo()
    } else {
      await salvarPreferencias(paraAConta())
      ultimoSalvo = JSON.stringify(paraAConta())
    }
    avisarSalvamento('ok')
  } catch {
    avisarSalvamento('erro-ao-ler')
  }
}

// A linha embaixo das escolhas diz onde elas estão guardadas.
// Ela só muda quando o estado muda (e não a cada toque), para o leitor de tela não repetir.
let ultimoAviso = ''
function avisarSalvamento(situacao) {
  const pessoa = usuarioAtual()
  const textos = {
    'sem-login': 'Suas escolhas ficam guardadas neste navegador.',
    fora: `Suas escolhas ficam guardadas só neste navegador. <a href="${PAGINA_DE_ENTRAR}">Entre na sua conta</a> para salvá-las e encontrá-las em qualquer aparelho.`,
    saiu: `Você saiu da conta, e as escolhas deste navegador foram apagadas. Elas continuam salvas na sua conta: <a href="${PAGINA_DE_ENTRAR}">entre de novo</a> para vê-las.`,
    buscando: 'Buscando suas escolhas na sua conta…',
    ok: `${icone('confere', 'icone salvamento__icone')} Suas escolhas estão salvas na sua conta${pessoa ? `, ${escapar(nomeCurto(pessoa))}` : ''}.`,
    erro: 'Não deu para salvar na sua conta agora. Suas escolhas continuam neste navegador e vão para a conta na próxima mudança.',
    'erro-ao-ler': 'Não deu para buscar suas escolhas na conta agora. Mostrando as deste navegador.',
  }
  const texto = !memoriaDisponivel() && situacao === 'sem-login' ? 'Suas escolhas estão disponíveis nesta aba.' : textos[situacao]
  if (texto === ultimoAviso) return
  ultimoAviso = texto
  el.salvamento.innerHTML = texto
  el.salvamento.classList.toggle('salvamento--erro', situacao.startsWith('erro'))
}

function desenharConta() {
  const pessoa = usuarioAtual()
  if (!loginDisponivel) {
    el.conta.innerHTML = ''
    return
  }
  el.conta.innerHTML = pessoa
    ? `<span class="topo__ola">Olá, <strong>${escapar(nomeCurto(pessoa))}</strong></span>
       <button type="button" class="botao" data-sair>${icone('sair')} Sair</button>`
    : `<a class="botao" href="${PAGINA_DE_ENTRAR}">${icone('entrar')} Entrar</a>`
}

// Saiu (por aqui, em outra aba ou porque o login venceu): as escolhas da conta não
// ficam neste aparelho, que pode ser de outra pessoa.
function aoSair() {
  clearTimeout(espera)
  ultimoSalvo = ''
  apagarTudo()
  Object.assign(estado, structuredClone(PADRAO), { localizacao: null, desfazer: null, querPerto: false })
  el.dicaLocal.textContent = ''
  desenharLocais()
  desenhar()
  avisarSalvamento('saiu')
}

el.conta.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('[data-sair]')
  if (!botao || botao.getAttribute('aria-disabled') === 'true') return
  botao.setAttribute('aria-disabled', 'true')
  // Antes de sair, manda para a conta o que ainda estava esperando.
  if (espera) {
    clearTimeout(espera)
    await salvarNaConta()
  }
  try {
    await sair()
  } catch {
    // Mesmo sem conexão, a sessão deste navegador é encerrada (src/lib/conta.js).
  }
})

// ---------- Desenho ----------

function desenharChips() {
  el.restricoes.innerHTML = RESTRICOES.map((item) =>
    chip({ valor: item.id, texto: item.nome, nomeDoIcone: item.icone, ligado: estado.restricoes.includes(item.id) }),
  ).join('')
  el.gostos.innerHTML = COZINHAS.map((item) =>
    chip({ valor: item.id, texto: item.nome, ligado: estado.gostos.includes(item.id) }),
  ).join('')
  el.ordem.innerHTML = ORDENS.map((item) => chip({ valor: item.id, texto: item.nome })).join('')
}

function sincronizar(grupo, ligados) {
  grupo.querySelectorAll('.chip').forEach((item) => {
    item.setAttribute('aria-pressed', String(ligados.includes(item.dataset.valor)))
  })
}

function desenharLocais() {
  const opcoes = [
    '<option value="">Escolha um bairro</option>',
    estado.localizacao ? `<option value="${AQUI}">Minha localização</option>` : '',
    ...BAIRROS.map(({ nome }) => `<option>${escapar(nome)}</option>`),
  ]
  el.onde.innerHTML = opcoes.join('')
  el.onde.value = estado.localizacao ? AQUI : estado.bairro
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

function textoDoResumo({ pratos, restaurantes, menorPreco, maiorPreco }) {
  if (pratos === 0) return 'Nenhum prato encontrado.'
  const faixa = menorPreco === maiorPreco ? `por ${emReais(menorPreco)}` : `de ${emReais(menorPreco)} a ${emReais(maiorPreco)}`
  return `${plural(pratos, 'prato', 'pratos')} em ${plural(restaurantes, 'restaurante', 'restaurantes')}, ${faixa}.`
}

function celulaDaDistancia(km) {
  if (km === null) {
    return `<td role="cell" class="tabela__distancia tabela__distancia--vazia">
      <span aria-hidden="true">—</span><span class="visualmente-oculto">escolha um bairro</span>
    </td>`
  }
  return `<td role="cell" class="tabela__distancia">${escapar(formatarDistancia(km))}</td>`
}

function linhaDaTabela({ prato, restaurante, distanciaKm: km }) {
  const selos = prato.tags.map((tag) => `<li class="selo">${escapar(nomeDaRestricao(tag))}</li>`).join('')
  return `
    <tr role="row">
      <td role="cell" class="tabela__prato">
        <span class="tabela__nome">${escapar(prato.nome)}</span>
        ${selos ? `<ul class="selos" aria-label="Marcações do catálogo">${selos}</ul>` : ''}
      </td>
      <td role="cell" class="tabela__restaurante">
        <span class="tabela__nome-restaurante">${escapar(restaurante?.nome ?? 'Restaurante')}</span>
        <span class="tabela__detalhe">${escapar(cozinha(prato.cozinha).nome)} · ${escapar(restaurante?.bairro ?? '')}</span>
      </td>
      ${celulaDaDistancia(km)}
      <td role="cell" class="tabela__preco">${escapar(emReais(prato.preco))}</td>
    </tr>
  `
}

function desenhar({ mensagem = '' } = {}) {
  const linhas = ordenar(
    linhasDaTabela({
      pratos: PRATOS,
      restaurantes: RESTAURANTES,
      restricoes: estado.restricoes,
      gostos: estado.gostos,
      origem: origem(),
    }),
    estado.ordem,
  )
  const ordem = ORDENS.find((item) => item.id === estado.ordem)
  const criterios = [
    estado.restricoes.map(nomeDaRestricao).join(', ') || 'Sem restrições marcadas',
    estado.gostos.map(id => cozinha(id).nome).join(', ') || 'Todas as cozinhas',
    ordem.nome,
    estado.localizacao ? 'Localização do aparelho' : estado.bairro,
  ].filter(Boolean).join(' · ')
  colecao.atualizar(linhas, criterios)

  sincronizar(el.restricoes, estado.restricoes)
  sincronizar(el.gostos, estado.gostos)
  sincronizar(el.ordem, [estado.ordem])
  el.ordem.querySelector('[data-valor="distancia"]').classList.toggle('chip--espera', !origem())

  // aria-sort diz ao leitor de tela qual coluna manda na ordem.
  el.tabela.querySelectorAll('th[data-coluna]').forEach((th) => {
    if (th.dataset.coluna === estado.ordem) th.setAttribute('aria-sort', 'ascending')
    else th.removeAttribute('aria-sort')
  })
  // Sem local, a coluna Distância mostra "—": a dica embaixo do campo explica por quê.
  if (!origem() && !el.dicaLocal.textContent) el.dicaLocal.textContent = DICA_SEM_LOCAL
  if (origem() && el.dicaLocal.textContent === DICA_SEM_LOCAL) el.dicaLocal.textContent = ''

  el.legenda.textContent = `Pratos que servem para você, ${ordem.legenda}.`
  el.linhas.innerHTML = linhas.map(linhaDaTabela).join('')
  el.tabela.hidden = linhas.length === 0
  el.vazio.hidden = linhas.length > 0

  el.resumo.textContent = [mensagem, textoDoResumo(resumo(linhas))].filter(Boolean).join(' ')

  const temEscolhas = estado.restricoes.length > 0 || estado.gostos.length > 0
  el.limpar.hidden = !temEscolhas && !estado.desfazer
  el.limpar.textContent = estado.desfazer ? 'Desfazer' : 'Limpar escolhas'
}

// ---------- Ações ----------

ligarChips(el.restricoes, { aoMudar: (restricoes) => mudar({ restricoes }) })
ligarChips(el.gostos, { aoMudar: (gostos) => mudar({ gostos }) })

el.ordem.addEventListener('click', (evento) => {
  const tocado = evento.target.closest('.chip')
  if (!tocado) return
  if (tocado.dataset.valor === 'distancia' && !origem()) {
    estado.querPerto = true
    el.dicaLocal.textContent = 'Para ordenar por distância, escolha um bairro ou use sua localização.'
    el.onde.focus()
    return
  }
  mudar({ ordem: tocado.dataset.valor })
})

// "Limpar escolhas" desmarca restrições e gostos. Logo depois, o mesmo botão vira "Desfazer".
el.limpar.addEventListener('click', () => {
  if (estado.desfazer) {
    const { restricoes, gostos } = estado.desfazer
    mudar({ restricoes, gostos, desfazer: null }, { mensagem: 'Escolhas de volta.' })
  } else {
    const desfazer = { restricoes: estado.restricoes, gostos: estado.gostos }
    mudar({ restricoes: [], gostos: [], desfazer }, { mensagem: 'Escolhas limpas.' })
  }
})

let pedidoLocal = 0
el.onde.addEventListener('change', () => {
  pedidoLocal++
  procurando(false)
  const bairro = el.onde.value
  if (bairro === AQUI) return
  const parcial = { bairro, localizacao: null }
  if (bairro && estado.querPerto) parcial.ordem = 'distancia'
  if (!bairro && estado.ordem === 'distancia') parcial.ordem = 'preco'
  el.dicaLocal.textContent = ''
  mudar(parcial)
  desenharLocais()
})

function procurando(sim) {
  el.localizar.setAttribute('aria-disabled', String(sim))
  el.localizar.lastChild.textContent = sim ? ' Procurando você…' : ' Usar minha localização'
}

el.localizar.addEventListener('click', () => {
  if (el.localizar.getAttribute('aria-disabled') === 'true') return
  if (!('geolocation' in navigator)) {
    el.dicaLocal.textContent = 'Este navegador não informa a localização. Escolha um bairro.'
    return
  }
  const pedido = ++pedidoLocal
  procurando(true)
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (pedido !== pedidoLocal) return
      procurando(false)
      const localizacao = { latitude: coords.latitude, longitude: coords.longitude }
      const longe = distanciaKm(localizacao, CENTRO_DE_BRASILIA) > 100
      el.dicaLocal.textContent = longe
        ? 'Você parece estar longe de Brasília, então as distâncias ficam grandes. Se quiser, escolha um bairro.'
        : 'Usando sua localização. Ela não é guardada.'
      mudar({ localizacao, ...(estado.querPerto ? { ordem: 'distancia' } : {}) })
      desenharLocais()
    },
    (erro) => {
      if (pedido !== pedidoLocal) return
      procurando(false)
      el.dicaLocal.textContent =
        erro.code === erro.PERMISSION_DENIED
          ? 'Sem permissão para ver sua localização. Escolha um bairro.'
          : 'Não deu para achar sua localização agora. Escolha um bairro.'
    },
    { timeout: 10000, maximumAge: 5 * 60 * 1000 },
  )
})

el.apagar.addEventListener('click', async () => {
  if (!window.confirm('Apagar preferências, favoritos, histórico e tema deste site? Essa ação não pode ser desfeita.')) return
  pedidoLocal++
  procurando(false)
  colecao.limpar()
  remover('tema')
  mostrarTema()
  apagarTudo()
  Object.assign(estado, structuredClone(PADRAO), { localizacao: null, desfazer: null, querPerto: false })
  el.dicaLocal.textContent = ''
  desenharLocais()
  desenhar()
  if (usuarioAtual()) {
    clearTimeout(espera)
    await salvarNaConta()
    el.apagado.textContent = 'Dados locais apagados.'
  } else {
    el.apagado.textContent = 'Dados locais apagados.'
  }
})

// ---------- Início ----------

desenharChips()
desenharLocais()
desenhar()

observar(['escolhas'], () => {
  Object.assign(estado, validar(lerEscolhas()), { localizacao: null, desfazer: null, querPerto: false })
  desenharLocais()
  desenhar()
})

// A conta vem depois da tabela: quem não entrou já vê a página na hora.
if (loginDisponivel) {
  await iniciarConta()
  desenharConta()
  if (usuarioAtual()) await trazerDaConta()
  else avisarSalvamento('fora')

  aoMudarConta(async (pessoa) => {
    desenharConta()
    if (pessoa) await trazerDaConta()
    else aoSair()
  })
} else {
  avisarSalvamento('sem-login')
}
