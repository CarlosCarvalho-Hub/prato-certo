import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PRATOS, RESTAURANTES } from '../src/dados/catalogo.js'
import { COZINHAS, RESTRICOES } from '../src/lib/opcoes.js'
import { linhasDaTabela, ordenar } from '../src/lib/tabela.js'
import { sugerir, registrar, LIMITE_HISTORICO } from '../src/lib/recomendacoes.js'

const subconjuntos = opcoes => opcoes.reduce((listas, item) =>
  [...listas, ...listas.map(lista => [...lista, item.id])], [[]])

test('todas as 16.384 combinações de restrições e cozinhas respeitam os filtros', () => {
  for (const restricoes of subconjuntos(RESTRICOES)) {
    for (const gostos of subconjuntos(COZINHAS)) {
      const linhas = linhasDaTabela({ pratos: PRATOS, restaurantes: RESTAURANTES, restricoes, gostos })
      const vistos = sugerir(ordenar(linhas))
      const esperados = PRATOS.filter(prato => restricoes.every(tag => prato.tags.includes(tag))
        && (!gostos.length || gostos.includes(prato.cozinha)))
      assert.equal(vistos.length, Math.min(3, esperados.length))
      assert.equal(new Set(vistos.map(item => item.prato.id)).size, vistos.length)
      assert.ok(vistos.every(item => esperados.includes(item.prato)))
    }
  }
})
test('as próximas opções circulam pelo catálogo sem repetir um prato na mesma seleção', () => {
  assert.deepEqual(sugerir([1, 2, 3, 4], 3), [4, 1, 2])
  assert.deepEqual(sugerir([], 0), [])
})
test('histórico registra apenas gerações com pratos e conserva as últimas 20', () => {
  let historico = []
  for (let i = 0; i < 23; i++) historico = registrar(historico, [1, 2, 3], 'Seleção ' + i)
  assert.equal(historico.length, LIMITE_HISTORICO)
  assert.equal(historico[0].criterios, 'Seleção 22')
  assert.equal(historico.at(-1).criterios, 'Seleção 3')
  assert.equal(registrar(historico, [], ''), historico)
})
