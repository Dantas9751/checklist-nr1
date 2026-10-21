import test from 'node:test';
import assert from 'node:assert/strict';
import { textoResumo } from '../js/relatorio.js';
import { calcularScore, perguntasDoPorte } from '../js/score.js';
import dados from '../data/questionario.json' with { type: 'json' };

const DATA_FIXA = new Date(2026, 9, 21);

function respostasFixas(porteId) {
  const ciclo = ['atende', 'parcial', 'nao_atende', 'na'];
  return Object.fromEntries(perguntasDoPorte(dados, porteId).map((q, i) => [q.id, ciclo[i % ciclo.length]]));
}

for (const porte of dados.portes) {
  test(`resumo copiado (${porte.nome}) traz score, faixa e todas as seções`, () => {
    const resultado = calcularScore(dados, porte.id, respostasFixas(porte.id));
    const texto = textoResumo(dados, porte.id, resultado, DATA_FIXA);
    assert.match(texto, new RegExp(`Porte: ${porte.nome}`));
    assert.match(texto, new RegExp(`: ${resultado.geral} de 100`));
    assert.match(texto, new RegExp(`Faixa: ${resultado.faixa.titulo}`));
    assert.match(texto, /Data: 21\/10\/2026/);
    for (const secao of dados.secoes) {
      const nota = resultado.porSecao.find(s => s.id === secao.id);
      assert.ok(texto.includes(`${secao.id} · ${secao.titulo}: ${nota.score === null ? 'sem resposta aplicável' : `${nota.score}%`}`), secao.id);
    }
  });
}

test('resumo registra as travas que limitaram a faixa', () => {
  const respostas = Object.fromEntries(perguntasDoPorte(dados, 'pequena').map(q => [q.id, 'atende']));
  respostas['P-06'] = 'nao_atende';
  const texto = textoResumo(dados, 'pequena', calcularScore(dados, 'pequena', respostas), DATA_FIXA);
  assert.match(texto, /Faixa: Atenção/);
  assert.match(texto, /Trava: 1 item de peso 3 em Não atende \(P-06\)/);
});

test('resumo sem respostas não quebra', () => {
  const texto = textoResumo(dados, 'media', calcularScore(dados, 'media', {}), DATA_FIXA);
  assert.match(texto, /sem respostas aplicáveis/);
  assert.match(texto, /Faixa: não calculada/);
});
