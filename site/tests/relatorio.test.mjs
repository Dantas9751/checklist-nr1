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

test('motivo do pilar diz o que falta, por que pesa e o efeito na nota', async () => {
  const { motivosDoPilar } = await import('../js/relatorio.js');
  const { avaliarSecoes } = await import('../js/score.js');
  const respostas = Object.fromEntries(perguntasDoPorte(dados, 'media').map(q => [q.id, 'atende']));
  respostas['M-07'] = 'nao_atende';
  respostas['M-08'] = 'parcial';
  const porte = dados.portes.find(p => p.id === 'media');
  const avaliacoes = avaliarSecoes(dados, 'media', respostas);
  const texto = av => motivosDoPilar(av, porte, dados).map(m => `${m.rotulo}. ${m.texto}`).join(' ').replaceAll('\u2011', '-');

  const c = texto(avaliacoes.find(s => s.id === 'C'));
  assert.match(c, /O que falta\. Documento de critérios de avaliação, em Não atende \(M-07\) e nível e classificação de cada risco, em Parcial \(M-08\)/);
  assert.match(c, /Por que pesa\. Sem critério escrito/);
  assert.match(c, /faixa Crítica pela régua do porte/);
  assert.match(c, /Abaixo do piso de 50%/);
  assert.match(c, /Item crítico em Não atende/);

  const a = texto(avaliacoes.find(s => s.id === 'A'));
  assert.match(a, /O que sustenta\. PGR em todos os estabelecimentos e atividades/);
  assert.match(a, /Por que conta\./);
});

test('todas as perguntas têm tema, impacto e explicação de cada marcação', () => {
  for (const secao of dados.secoes) for (const q of secao.perguntas) {
    assert.ok(q.tema && q.impacto, q.id);
    for (const id of ['atende', 'parcial', 'nao_atende']) assert.ok(q.marcacoes?.[id], `${q.id} sem explicação de ${id}`);
  }
});
