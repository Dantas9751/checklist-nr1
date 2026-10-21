import test from 'node:test';
import assert from 'node:assert/strict';
import { perguntasDoPorte, calcularScore, faixaDoScore, pontosFortesEFracos, lacunasPrioritarias } from '../js/score.js';
import dados from '../data/questionario.json' with { type: 'json' };

const responderTudo = (porteId, opcaoId) =>
  Object.fromEntries(perguntasDoPorte(dados, porteId).map(q => [q.id, opcaoId]));

const CONTAGEM_DO_PDF = { pequena: 18, media: 24, grande: 32 };

test('filtra perguntas pelo porte', () => {
  for (const porte of dados.portes) {
    const lista = perguntasDoPorte(dados, porte.id);
    assert.equal(lista.length, CONTAGEM_DO_PDF[porte.id]);
    assert.ok(lista.every(q => !q.portes || q.portes.includes(porte.id)));
    assert.ok(lista.every(q => q.id.startsWith(porte.prefixo)));
  }
});

test('mantém a ordem do PDF e informa a seção de cada pergunta', () => {
  const lista = perguntasDoPorte(dados, 'media');
  assert.deepEqual(lista.map(q => q.id), [...lista.map(q => q.id)].sort());
  assert.equal(lista[0].secaoId, 'A');
  assert.equal(lista.at(-1).secaoId, 'H');
});

test('melhor resposta em tudo dá 100 e a melhor faixa', () => {
  for (const porte of dados.portes) {
    const r = calcularScore(dados, porte.id, responderTudo(porte.id, 'atende'));
    assert.equal(r.geral, 100);
    assert.equal(r.faixa.id, 'conformidade');
    assert.ok(r.porSecao.every(s => s.score === 100));
  }
});

test('pior resposta em tudo dá 0 e a pior faixa', () => {
  for (const porte of dados.portes) {
    const r = calcularScore(dados, porte.id, responderTudo(porte.id, 'nao_atende'));
    assert.equal(r.geral, 0);
    assert.equal(r.faixa.id, 'critica');
  }
});

test('parcial em tudo dá 50', () => {
  for (const porte of dados.portes) {
    assert.equal(calcularScore(dados, porte.id, responderTudo(porte.id, 'parcial')).geral, 50);
  }
});

test('perguntas sem pontuação não entram na conta', () => {
  const copia = structuredClone(dados);
  const p01 = copia.secoes[0].perguntas.find(q => q.id === 'P-01');
  p01.pontua = false;
  const respostas = { ...responderTudo('pequena', 'atende'), 'P-01': 'nao_atende' };
  const r = calcularScore(copia, 'pequena', respostas);
  assert.equal(r.geral, 100);
  assert.equal(r.total, 17);
});

test('N/A sai do cálculo e não puxa a nota para baixo', () => {
  const respostas = { ...responderTudo('pequena', 'atende'), 'P-02': 'na', 'P-18': 'na' };
  const r = calcularScore(dados, 'pequena', respostas);
  assert.equal(r.geral, 100);
  assert.equal(r.respondidas, 18);
});

test('pergunta não respondida não pune nem premia: sai do denominador', () => {
  const respostas = responderTudo('pequena', 'atende');
  delete respostas['P-05'];
  delete respostas['P-08'];
  const r = calcularScore(dados, 'pequena', respostas);
  assert.equal(r.geral, 100);
  assert.equal(r.respondidas, 16);
  assert.equal(r.total, 18);
  assert.equal(r.porSecao.find(s => s.id === 'C').score, null);
});

test('sem nenhuma resposta aplicável, o score é nulo e não há faixa', () => {
  const r = calcularScore(dados, 'grande', {});
  assert.equal(r.geral, null);
  assert.equal(r.faixa, null);
});

test('pequena: SCE é pontos obtidos ÷ pontos aplicáveis, sem peso por seção', () => {
  // Só P-08 (peso 1) em Não atende: 38 de 39 pontos.
  const r = calcularScore(dados, 'pequena', { ...responderTudo('pequena', 'atende'), 'P-08': 'nao_atende' });
  assert.equal(r.geral, Math.floor((38 / 39) * 100));
});

test('média: score geral é a média dos % das seções ponderada pelo peso do pilar', () => {
  // Seção D (peso 15) inteira em Parcial: 100 - 15 × 50 / 100 = 92,5 → 92.
  const respostas = responderTudo('media', 'atende');
  for (const id of ['M-10', 'M-11', 'M-12']) respostas[id] = 'parcial';
  const r = calcularScore(dados, 'media', respostas);
  assert.equal(r.porSecao.find(s => s.id === 'D').score, 50);
  assert.equal(r.geral, 92);
});

test('score por seção e geral batem', () => {
  const respostas = responderTudo('grande', 'atende');
  for (const id of ['G-28', 'G-29', 'G-31']) respostas[id] = 'parcial';
  const r = calcularScore(dados, 'grande', respostas);
  const porte = dados.portes.find(p => p.id === 'grande');
  const pesos = porte.score.pesos_secoes;
  const h = r.porSecao.find(s => s.id === 'H');
  assert.equal(h.obtidos, 11 - 3.5);
  assert.equal(h.aplicaveis, 11);
  const esperado = r.porSecao.reduce((soma, s) => soma + (s.scoreExato * pesos[s.id]) / 100, 0);
  assert.equal(r.geral, Math.floor(esperado + 1e-9));
});

test('seção inteira N/A sai do score geral (divide pelos pesos restantes)', () => {
  const respostas = responderTudo('media', 'atende');
  for (const id of ['M-22', 'M-23', 'M-24']) respostas[id] = 'na';
  respostas['M-01'] = 'parcial';
  const r = calcularScore(dados, 'media', respostas);
  // A: (7 - 1,5) / 7 = 78,57%; peso 10; demais seções 100%; soma dos pesos aplicáveis = 87.
  const esperado = ((5.5 / 7) * 100 * 10 + 100 * 77) / 87;
  assert.equal(r.geral, Math.floor(esperado));
});

test('trava da pequena: um item de peso 3 em Não atende limita a Atenção', () => {
  const r = calcularScore(dados, 'pequena', { ...responderTudo('pequena', 'atende'), 'P-04': 'nao_atende' });
  assert.ok(r.geral >= 85);
  assert.equal(r.faixaDoNumero.id, 'conformidade');
  assert.equal(r.faixa.id, 'atencao');
  assert.equal(r.travas.length, 1);
});

test('travas da média: 3 itens de peso 3 em Não atende limitam a Exposta', () => {
  const respostas = responderTudo('media', 'atende');
  for (const id of ['M-01', 'M-04', 'M-07']) respostas[id] = 'nao_atende';
  const r = calcularScore(dados, 'media', respostas);
  assert.equal(r.faixa.id, 'exposta');
});

test('trava de pilar D abaixo do mínimo limita a Atenção', () => {
  const respostas = responderTudo('grande', 'atende');
  for (const id of ['G-13', 'G-14', 'G-15', 'G-16']) respostas[id] = 'nao_atende';
  const r = calcularScore(dados, 'grande', respostas);
  assert.ok(r.porSecao.find(s => s.id === 'D').score < 50);
  assert.equal(r.faixa.id, 'atencao');
});

test('piso por pilar impede a melhor faixa', () => {
  const respostas = responderTudo('grande', 'atende');
  for (const id of ['G-08']) respostas[id] = 'nao_atende';
  respostas['G-07'] = 'parcial';
  const r = calcularScore(dados, 'grande', respostas);
  // B: (8 - 2 - 1,5) / 8 = 56% < piso de 60%.
  assert.equal(r.porSecao.find(s => s.id === 'B').score, 56);
  assert.equal(r.faixa.id, 'atencao');
});

test('faixaDoScore cobre 0 e 100 sem buracos', () => {
  for (const porte of dados.portes) {
    const faixas = porte.score.faixas;
    assert.equal(faixaDoScore(dados, porte.id, 0).id, faixas.at(-1).id);
    assert.equal(faixaDoScore(dados, porte.id, 100).id, faixas[0].id);
    for (let v = 0; v <= 100; v++) {
      const f = faixaDoScore(dados, porte.id, v);
      assert.ok(f && v >= f.min && v <= f.max, `${porte.id} ${v}`);
    }
  }
});

test('pontosFortesEFracos devolve as melhores e as piores seções', () => {
  const respostas = responderTudo('media', 'atende');
  for (const id of ['M-10', 'M-11', 'M-12']) respostas[id] = 'nao_atende';
  for (const id of ['M-13', 'M-14']) respostas[id] = 'parcial';
  const { fortes, fracos } = pontosFortesEFracos(calcularScore(dados, 'media', respostas));
  assert.equal(fortes.length, 3);
  assert.deepEqual(fracos.slice(0, 2).map(s => s.id), ['D', 'E']);
  assert.ok(fortes.every(s => s.score === 100));
});

test('lacunasPrioritarias segue a ordem do PDF: peso 3 em Não atende primeiro', () => {
  const respostas = responderTudo('media', 'atende');
  respostas['M-02'] = 'nao_atende';
  respostas['M-07'] = 'parcial';
  respostas['M-13'] = 'nao_atende';
  respostas['M-20'] = 'parcial';
  const lacunas = lacunasPrioritarias(dados, 'media', respostas);
  assert.deepEqual(lacunas.map(l => l.pergunta.id), ['M-13', 'M-07', 'M-02']);
});
