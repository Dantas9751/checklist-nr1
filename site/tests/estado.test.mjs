import test from 'node:test';
import assert from 'node:assert/strict';
import {
  criarEstado, escolherPorte, respostasDescartadas, responder, avancar, voltar, irPara,
  perguntaAtual, progresso, salvar, carregar, CHAVE_ARMAZENAMENTO,
} from '../js/estado.js';
import dados from '../data/questionario.json' with { type: 'json' };

// Dados mínimos com uma pergunta comum a dois portes, para testar a troca de porte.
const DADOS_TESTE = {
  opcoes: dados.opcoes,
  portes: [{ id: 'a' }, { id: 'b' }],
  secoes: [{
    id: 'S', titulo: 'Seção',
    perguntas: [
      { id: 'comum', portes: ['a', 'b'], pontua: true, peso: 1 },
      { id: 'so-a', portes: ['a'], pontua: true, peso: 1 },
      { id: 'so-b', portes: ['b'], pontua: true, peso: 1 },
    ],
  }],
};

const armazenamentoFalso = () => {
  const mapa = new Map();
  return { getItem: k => mapa.get(k) ?? null, setItem: (k, v) => mapa.set(k, v), removeItem: k => mapa.delete(k) };
};

test('começa nas boas-vindas, sem porte e sem respostas', () => {
  assert.deepEqual(criarEstado(), { etapa: 'boas-vindas', porteId: null, respostas: {}, posicao: 0 });
});

test('escolher porte reconstrói a lista de perguntas', () => {
  const pequena = escolherPorte(criarEstado(), dados, 'pequena');
  assert.equal(pequena.etapa, 'perguntas');
  assert.equal(perguntaAtual(pequena, dados).id, 'P-01');
  const grande = escolherPorte(pequena, dados, 'grande');
  assert.equal(perguntaAtual(grande, dados).id, 'G-01');
});

test('trocar de porte preserva respostas em comum e descarta as que saíram', () => {
  let estado = escolherPorte(criarEstado(), DADOS_TESTE, 'a');
  estado = responder(estado, 'comum', 'atende');
  estado = responder(estado, 'so-a', 'parcial');
  assert.deepEqual(respostasDescartadas(estado, DADOS_TESTE, 'b'), ['so-a']);
  estado = escolherPorte(estado, DADOS_TESTE, 'b');
  assert.deepEqual(estado.respostas, { comum: 'atende' });
});

test('escolher o mesmo porte de novo mantém tudo', () => {
  let estado = escolherPorte(criarEstado(), dados, 'media');
  estado = responder(estado, 'M-01', 'atende');
  assert.deepEqual(escolherPorte(estado, dados, 'media').respostas, { 'M-01': 'atende' });
});

test('avançar e voltar mantém a posição', () => {
  let estado = escolherPorte(criarEstado(), dados, 'pequena');
  estado = avancar(avancar(estado, dados), dados);
  assert.equal(perguntaAtual(estado, dados).id, 'P-03');
  estado = voltar(estado);
  assert.equal(perguntaAtual(estado, dados).id, 'P-02');
});

test('voltar da primeira pergunta leva à escolha de porte; avançar da última leva à revisão', () => {
  const inicio = escolherPorte(criarEstado(), dados, 'pequena');
  assert.equal(voltar(inicio).etapa, 'porte');
  let estado = inicio;
  for (let i = 0; i < 18; i++) estado = avancar(estado, dados);
  assert.equal(estado.etapa, 'revisao');
  assert.equal(estado.posicao, 17);
});

test('irPara muda a etapa sem perder respostas', () => {
  const estado = responder(escolherPorte(criarEstado(), dados, 'pequena'), 'P-01', 'na');
  const relatorio = irPara(estado, 'relatorio');
  assert.equal(relatorio.etapa, 'relatorio');
  assert.deepEqual(relatorio.respostas, { 'P-01': 'na' });
});

test('progresso em porcentagem das perguntas respondidas', () => {
  let estado = escolherPorte(criarEstado(), dados, 'media');
  assert.equal(progresso(estado, dados), 0);
  for (const id of ['M-01', 'M-02', 'M-03', 'M-04', 'M-05', 'M-06']) estado = responder(estado, id, 'atende');
  assert.equal(progresso(estado, dados), 25);
});

test('responder não altera o estado anterior', () => {
  const antes = escolherPorte(criarEstado(), dados, 'pequena');
  responder(antes, 'P-01', 'atende');
  assert.deepEqual(antes.respostas, {});
});

test('salva e carrega do armazenamento', () => {
  const armazenamento = armazenamentoFalso();
  const estado = responder(escolherPorte(criarEstado(), dados, 'grande'), 'G-01', 'parcial');
  salvar(estado, armazenamento);
  assert.deepEqual(carregar(armazenamento), estado);
});

test('falha silenciosa quando o armazenamento não funciona', () => {
  const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.doesNotThrow(() => salvar(criarEstado(), quebrado));
  assert.deepEqual(carregar(quebrado), criarEstado());
  assert.deepEqual(carregar(undefined), criarEstado());
});

test('dado salvo corrompido volta ao estado inicial', () => {
  const armazenamento = armazenamentoFalso();
  armazenamento.setItem(CHAVE_ARMAZENAMENTO, '{quebrado');
  assert.deepEqual(carregar(armazenamento), criarEstado());
});
