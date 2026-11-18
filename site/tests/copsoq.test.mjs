import test from 'node:test';
import assert from 'node:assert/strict';
import { itensEmOrdem, paginas, pontuar, faixaDosPontos, comportamentosOfensivos, respondidas } from '../js/copsoq.js';
import dados from '../data/copsoq.json' with { type: 'json' };

const dimensoes = dados.dominios.flatMap(d => d.dimensoes);
const responderTudo = escolha => Object.fromEntries(itensEmOrdem(dados).filter(i => i.tipo === 'escala').map(i => [i.id, escolha(i)]));

test('40 itens em 23 dimensões, 8 páginas de 5, como no COPSOQ II-Br versão curta', () => {
  assert.equal(itensEmOrdem(dados).length, 40);
  assert.equal(dimensoes.length + dados.ofensivos.length, 23);
  const p = paginas(dados);
  assert.equal(p.length, 8);
  assert.ok(p.every(pg => pg.length === 5));
  assert.deepEqual(p[7].map(i => i.id), ['19B', '20', '21', '22', '23']);
});

test('faixas de cada dimensão cobrem de 0 ao máximo sem buracos nem sobreposição', () => {
  for (const d of dimensoes) {
    const maximo = d.itens.reduce((s, i) => s + Math.max(...dados.escalas[i.escala].map(o => o.valor)), 0);
    for (let pontos = 0; pontos <= maximo; pontos++) {
      const casos = Object.values(d.faixas).filter(([min, max]) => pontos >= min && pontos <= max);
      assert.equal(casos.length, 1, `${d.titulo}: ${pontos} pontos`);
    }
  }
});

test('1B é pontuado ao contrário: tempo suficiente "Sempre" vale 0', () => {
  const r = pontuar(dados, { '1A': 'Nunca', '1B': 'Sempre' }).find(d => d.id === '1');
  assert.equal(r.pontos, 0);
  assert.equal(r.faixa, 'seguro');
  const pior = pontuar(dados, { '1A': 'Sempre', '1B': 'Nunca' }).find(d => d.id === '1');
  assert.equal(pior.pontos, 8);
  assert.equal(pior.faixa, 'risco');
});

test('classificação segue a Tabela 1 nos dois sentidos', () => {
  const tudo = pontuar(dados, responderTudo(() => 'Às vezes'));
  assert.equal(tudo.find(d => d.id === '2').faixa, 'atencao'); // ritmo 4 pontos
  assert.equal(faixaDosPontos(dimensoes.find(d => d.id === '4').faixas, 8), 'seguro'); // influência alta protege
  assert.equal(faixaDosPontos(dimensoes.find(d => d.id === '4').faixas, 2), 'risco');
  assert.equal(faixaDosPontos(dimensoes.find(d => d.id === '13').faixas, 1), 'risco'); // satisfação: só seguro ou risco
  assert.equal(faixaDosPontos(dimensoes.find(d => d.id === '17').faixas, 2), 'atencao');
});

test('dimensão incompleta fica sem pontos e sem faixa', () => {
  const r = pontuar(dados, { '18A': 'Sempre' }).find(d => d.id === '18');
  assert.equal(r.pontos, null);
  assert.equal(r.faixa, null);
});

test('comportamentos ofensivos: só relatam, com quem praticou', () => {
  const r = comportamentosOfensivos(dados, { 20: 'nao', 23: 'sim_semanal' }, { 23: ['Colegas'] });
  assert.equal(r.find(o => o.id === '20').relatado, false);
  assert.equal(r.find(o => o.id === '23').relatado, true);
  assert.deepEqual(r.find(o => o.id === '23').quem, ['Colegas']);
  assert.equal(r.find(o => o.id === '21').resposta, null);
});

test('conta respostas dadas', () => {
  assert.equal(respondidas(dados, { '1A': 'Sempre', 20: 'nao' }), 2);
});
