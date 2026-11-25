// Página "Entrar" (entrar.html): entrar ou criar conta com e-mail e senha.
// O login é opcional: ele serve para salvar as restrições e os gostos na conta.
// Depois de entrar, a pessoa volta para a página dos pratos, já com as escolhas da conta.

import './lib/tema.js'
import { loginDisponivel, iniciarConta, usuarioAtual, nomeCurto, entrar, criarConta, sair } from './lib/conta.js'
import { caminho } from './lib/caminho.js'

const $ = (seletor) => document.querySelector(seletor)
const el = {
  titulo: $('[data-titulo]'),
  frase: $('[data-frase]'),
  semLogin: $('[data-sem-login]'),
  jaEntrou: $('[data-ja-entrou]'),
  jaEntrouTexto: $('[data-ja-entrou-texto]'),
  area: $('[data-area-formulario]'),
  modos: document.querySelectorAll('[data-modo]'),
  form: $('[data-formulario]'),
  campoNome: $('[data-campo-nome]'),
  erro: $('[data-erro]'),
  enviar: $('[data-enviar]'),
  enviarTexto: $('[data-enviar-texto]'),
  mostrarSenha: $('[data-mostrar-senha]'),
  confira: $('[data-confira]'),
  confiraEmail: $('[data-confira-email]'),
}

const PAGINA_DOS_PRATOS = caminho('')

const TEXTOS = {
  entrar: {
    titulo: 'Entrar',
    frase: 'Entre para salvar suas restrições e seus gostos e encontrá-los em qualquer aparelho.',
    botao: 'Entrar',
    autocomplete: 'current-password',
  },
  criar: {
    titulo: 'Criar conta',
    frase: 'Com uma conta, suas restrições e seus gostos ficam salvos e aparecem em qualquer aparelho.',
    botao: 'Criar conta',
    autocomplete: 'new-password',
  },
}

let modo = location.hash === '#criar' ? 'criar' : 'entrar'

// Mostra só uma das partes da caixa: formulário, "já entrou", "confira seu e-mail" ou "sem login".
function mostrar(parte) {
  el.area.hidden = parte !== 'formulario'
  el.jaEntrou.hidden = parte !== 'ja-entrou'
  el.confira.hidden = parte !== 'confira'
  el.semLogin.hidden = parte !== 'sem-login'
}

function trocarModo(novo, { focar = false } = {}) {
  modo = novo
  const textos = TEXTOS[modo]
  el.titulo.textContent = textos.titulo
  el.frase.textContent = textos.frase
  el.enviarTexto.textContent = textos.botao
  el.form.elements.senha.autocomplete = textos.autocomplete
  el.campoNome.hidden = modo !== 'criar'
  el.modos.forEach((botao) => botao.setAttribute('aria-pressed', String(botao.dataset.modo === modo)))
  document.title = `${textos.titulo} · Prato Certo`
  history.replaceState(null, '', modo === 'criar' ? '#criar' : location.pathname)
  limparErro()
  if (focar) el.form.elements[modo === 'criar' ? 'nome' : 'email'].focus()
}

function mostrarErro(texto, campo) {
  el.erro.textContent = texto
  el.erro.hidden = false
  for (const nome of ['nome', 'email', 'senha']) el.form.elements[nome].removeAttribute('aria-invalid')
  if (campo) {
    el.form.elements[campo].setAttribute('aria-invalid', 'true')
    el.form.elements[campo].focus()
  }
}

function limparErro() {
  el.erro.hidden = true
  el.erro.textContent = ''
  for (const nome of ['nome', 'email', 'senha']) el.form.elements[nome].removeAttribute('aria-invalid')
}

function ocupado(sim) {
  el.form.setAttribute('aria-busy', String(sim))
  el.enviar.setAttribute('aria-disabled', String(sim))
  el.enviarTexto.textContent = sim ? (modo === 'criar' ? 'Criando a conta…' : 'Entrando…') : TEXTOS[modo].botao
}

// ---------- Ações ----------

el.modos.forEach((botao) => botao.addEventListener('click', () => trocarModo(botao.dataset.modo, { focar: true })))

el.mostrarSenha.addEventListener('click', () => {
  const visivel = el.form.elements.senha.type === 'text'
  el.form.elements.senha.type = visivel ? 'password' : 'text'
  el.mostrarSenha.setAttribute('aria-pressed', String(!visivel))
  el.mostrarSenha.textContent = visivel ? 'Mostrar' : 'Esconder'
})

el.form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  if (el.enviar.getAttribute('aria-disabled') === 'true') return

  const nome = el.form.elements.nome.value.trim()
  const email = el.form.elements.email.value.trim()
  const senha = el.form.elements.senha.value

  // Conferência simples aqui; o servidor de contas confere de novo.
  if (email === '' || !el.form.elements.email.checkValidity()) {
    mostrarErro('Digite um e-mail válido, como nome@exemplo.com.', 'email')
    return
  }
  if (senha.length < 6) {
    mostrarErro('A senha precisa ter pelo menos 6 caracteres.', 'senha')
    return
  }

  limparErro()
  ocupado(true)
  try {
    if (modo === 'criar') {
      const { precisaConfirmar } = await criarConta({ nome, email, senha })
      if (precisaConfirmar) {
        el.titulo.textContent = 'Confira seu e-mail'
        el.frase.textContent = 'Falta só um passo para a sua conta ficar pronta.'
        el.confiraEmail.textContent = email
        mostrar('confira')
        el.titulo.setAttribute('tabindex', '-1')
        el.titulo.focus()
        return
      }
    } else {
      await entrar(email, senha)
    }
    location.assign(PAGINA_DOS_PRATOS)
  } catch (falha) {
    mostrarErro(falha.message)
  } finally {
    ocupado(false)
  }
})

$('[data-voltar-entrar]').addEventListener('click', () => {
  mostrar('formulario')
  trocarModo('entrar')
  el.form.elements.senha.value = ''
  el.form.elements.senha.focus()
})

$('[data-sair]').addEventListener('click', async () => {
  await sair()
  mostrar('formulario')
  trocarModo('entrar', { focar: true })
})

// ---------- Início ----------

if (!loginDisponivel) {
  el.titulo.textContent = 'Entrar'
  el.frase.hidden = true
  mostrar('sem-login')
} else {
  trocarModo(modo)
  const pessoa = await iniciarConta()
  if (pessoa) {
    el.titulo.textContent = `Olá, ${nomeCurto(pessoa)}`
    el.frase.textContent = 'Você já entrou. Suas restrições e seus gostos estão salvos na sua conta.'
    el.jaEntrouTexto.textContent = `Conta: ${usuarioAtual().email}`
    mostrar('ja-entrou')
  } else {
    mostrar('formulario')
  }
}
