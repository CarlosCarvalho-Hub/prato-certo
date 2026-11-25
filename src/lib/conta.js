// A conta é opcional. O SDK local só é carregado com uma configuração própria.
import { conta } from '../config.js'
import { caminho } from './caminho.js'

let supabase = null
if (conta.url && conta.chavePublica) {
  try {
    const { default: sdk } = await import('../../vendor/supabase.min.js')
    supabase = sdk.createClient(conta.url, conta.chavePublica)
  } catch {
    // Uma configuração inválida nunca impede o uso local do cardápio.
    console.warn('Configuração da conta indisponível. O Prato Certo está em modo local.')
  }
}
export const loginDisponivel = Boolean(supabase)

let usuario = null // { id, email, nome } ou null
const ouvintes = new Set()

function resumir(sessao) {
  const user = sessao?.user
  if (!user) return null
  return { id: user.id, email: user.email, nome: (user.user_metadata?.nome ?? '').trim() }
}

// Só avisa quando a pessoa muda de verdade (entrou, saiu ou trocou de conta).
function definirUsuario(novo) {
  const mudou = usuario?.id !== novo?.id
  usuario = novo
  if (mudou) ouvintes.forEach((avisar) => avisar(usuario))
}

// Chamada uma vez ao abrir a página. Também confirma a conta quando a pessoa chega
// pelo link do e-mail (o supabase-js lê o endereço sozinho).
export async function iniciarConta() {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    usuario = resumir(data.session)
  } catch {
    usuario = null // sem conexão: a página segue sem login
  }
  // Avisa quando a sessão muda em outra aba ou quando o login expira.
  supabase.auth.onAuthStateChange((_evento, sessao) => definirUsuario(resumir(sessao)))
  return usuario
}

export function usuarioAtual() {
  return usuario
}

export function aoMudarConta(avisar) {
  ouvintes.add(avisar)
}

// "Olá, Ana" ou, sem nome, a parte do e-mail antes do @.
export function nomeCurto(pessoa = usuario) {
  if (!pessoa) return ''
  return pessoa.nome.split(/\s+/)[0] || pessoa.email.split('@')[0]
}

export async function entrar(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) throw new Error(traduzirErro(error))
  definirUsuario(resumir(data.session))
}

// Se a confirmação de e-mail estiver ligada no Supabase, a conta nasce sem sessão:
// a pessoa clica no link do e-mail e volta para a página principal já com a conta.
// O endereço de volta precisa estar em Authentication → URL Configuration → Redirect URLs.
export async function criarConta({ nome, email, senha }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome }, emailRedirectTo: caminho('') },
  })
  if (error) throw new Error(traduzirErro(error))
  // E-mail já cadastrado: por segurança, o Supabase não dá erro nem manda e-mail,
  // só devolve um usuário sem "identities". Sem esta conferência, a página diria
  // "Confira seu e-mail" e o e-mail nunca chegaria.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('Já existe uma conta com este e-mail. Use "Entrar".')
  }
  if (!data.session) return { precisaConfirmar: true }
  definirUsuario(resumir(data.session))
  return { precisaConfirmar: false }
}

export async function sair() {
  try {
    await supabase.auth.signOut()
  } finally {
    definirUsuario(null)
  }
}

// ---------- Preferências na conta (tabela "perfis") ----------
// Guardamos restrições, gostos e bairro. A ordem da tabela fica só no navegador.

// Devolve { restricoes, gostos, bairro } ou null, se a conta ainda não tem perfil.
export async function lerPreferencias() {
  const { data, error } = await supabase
    .from('perfis')
    .select('restricoes, gostos, bairro')
    .eq('id', usuario.id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function salvarPreferencias({ restricoes, gostos, bairro }) {
  const { error } = await supabase
    .from('perfis')
    .upsert({ id: usuario.id, restricoes, gostos, bairro, atualizado_em: new Date().toISOString() })
  if (error) throw error
}

// Mensagens do Supabase em português simples.
// Códigos: https://supabase.com/docs/guides/auth/debugging/error-codes
function traduzirErro(erro) {
  const porCodigo = {
    invalid_credentials: 'E-mail ou senha incorretos.',
    email_not_confirmed: 'Confirme seu e-mail antes de entrar: procure a mensagem na sua caixa de entrada.',
    user_already_exists: 'Já existe uma conta com este e-mail. Use "Entrar".',
    email_exists: 'Já existe uma conta com este e-mail. Use "Entrar".',
    weak_password: 'Senha fraca: use pelo menos 6 caracteres.',
    email_address_invalid: 'Este e-mail não parece válido. Confira e tente de novo.',
    over_email_send_rate_limit: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
    over_request_rate_limit: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  }
  if (porCodigo[erro.code]) return porCodigo[erro.code]
  if (erro.name === 'AuthRetryableFetchError' || /fetch/i.test(erro.message ?? '')) {
    return 'Sem conexão com o servidor de contas. Confira sua internet e tente de novo.'
  }
  return 'Não deu para concluir agora. Tente de novo em instantes.'
}
