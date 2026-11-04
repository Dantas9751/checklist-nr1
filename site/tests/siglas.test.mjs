import test from 'node:test';
import assert from 'node:assert/strict';
import { criarExpansor } from '../js/siglas.js';
import dados from '../data/questionario.json' with { type: 'json' };

const SIGLAS = {
  ignorar_apos: ['Portaria '],
  normas: { singular: 'Norma Regulamentadora nº {n}', plural: 'Normas Regulamentadoras' },
  itens: { PGR: 'Programa de Gerenciamento de Riscos', ME: 'microempresa', MEI: 'microempreendedor individual', AEP: 'avaliação ergonômica preliminar', MTE: 'Ministério do Trabalho e Emprego' },
};

test('expande só a primeira ocorrência de cada sigla', () => {
  const x = criarExpansor(SIGLAS);
  assert.equal(x('O PGR existe.'), 'O Programa de Gerenciamento de Riscos (PGR) existe.');
  assert.equal(x('O PGR de novo.'), 'O PGR de novo.');
});

test('não confunde ME com MEI', () => {
  const x = criarExpansor(SIGLAS);
  assert.equal(x('MEI ou ME'), 'microempreendedor individual (MEI) ou microempresa (ME)');
});

test('dentro de parênteses usa vírgula em vez de parêntese aninhado', () => {
  const x = criarExpansor(SIGLAS);
  assert.equal(x('Etapa (inclusive AEP) feita.'), 'Etapa (inclusive avaliação ergonômica preliminar, AEP) feita.');
});

test('normas: a primeira NR-x é explicada, as seguintes não', () => {
  const x = criarExpansor(SIGLAS);
  assert.equal(x('Veja a NR-1 e a NR-17.'), 'Veja a Norma Regulamentadora nº 1 (NR-1) e a NR-17.');
  assert.equal(criarExpansor(SIGLAS)('As NR valem.'), 'As Normas Regulamentadoras (NR) valem.');
});

test('respeita expansão que o texto já traz e nomes de documento', () => {
  const x = criarExpansor(SIGLAS);
  assert.equal(x('A AEP (avaliação ergonômica preliminar) foi feita.'), 'A AEP (avaliação ergonômica preliminar) foi feita.');
  assert.equal(x('Portaria MTE nº 1.419'), 'Portaria MTE nº 1.419');
  assert.equal(x('o MTE publica'), 'o Ministério do Trabalho e Emprego (MTE) publica');
});

test('textos do questionário não ficam com parêntese duplo depois da expansão', () => {
  for (const secao of dados.secoes) {
    for (const q of secao.perguntas) {
      const x = criarExpansor(dados.meta.siglas);
      const tela = [q.ajuda, q.texto, q.reflita].map(x).join(' ');
      assert.doesNotMatch(tela, /\) \(/, q.id);
      assert.doesNotMatch(tela, /\(\w[^()]*\([^()]*\)[^()]*\)/, q.id);
    }
  }
});
