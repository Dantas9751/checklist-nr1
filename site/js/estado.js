// Estado do formulário: objeto simples e funções que devolvem um novo estado.
import { perguntasDoPorte } from './score.js';

export const ETAPAS = ['boas-vindas', 'porte', 'perguntas', 'revisao', 'relatorio'];
export const CHAVE_ARMAZENAMENTO = 'checklist-nr1:estado';

export const criarEstado = () => ({ etapa: 'boas-vindas', porteId: null, respostas: {}, posicao: 0 });

const idsDoPorte = (dados, porteId) => new Set(perguntasDoPorte(dados, porteId).map(q => q.id));

export function respostasDescartadas(estado, dados, porteId) {
  const novas = idsDoPorte(dados, porteId);
  return Object.keys(estado.respostas).filter(id => !novas.has(id));
}

export function escolherPorte(estado, dados, porteId) {
  const novas = idsDoPorte(dados, porteId);
  const respostas = Object.fromEntries(Object.entries(estado.respostas).filter(([id]) => novas.has(id)));
  const posicao = estado.porteId === porteId ? estado.posicao : 0;
  return { ...estado, etapa: 'perguntas', porteId, respostas, posicao };
}

export const responder = (estado, perguntaId, opcaoId) => ({
  ...estado,
  respostas: { ...estado.respostas, [perguntaId]: opcaoId },
});

export const irPara = (estado, etapa, posicao = estado.posicao) => ({ ...estado, etapa, posicao });

export function avancar(estado, dados) {
  const ultima = perguntasDoPorte(dados, estado.porteId).length - 1;
  if (estado.posicao >= ultima) return irPara(estado, 'revisao', ultima);
  return { ...estado, posicao: estado.posicao + 1 };
}

export function voltar(estado) {
  if (estado.posicao <= 0) return irPara(estado, 'porte', 0);
  return { ...estado, posicao: estado.posicao - 1 };
}

export const perguntaAtual = (estado, dados) => perguntasDoPorte(dados, estado.porteId)[estado.posicao];

export function progresso(estado, dados) {
  const perguntas = perguntasDoPorte(dados, estado.porteId);
  const respondidas = perguntas.filter(q => estado.respostas[q.id]).length;
  return Math.round((respondidas / perguntas.length) * 100);
}

export function salvar(estado, armazenamento = globalThis.localStorage) {
  try {
    armazenamento.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
  } catch {
    // Sem armazenamento (aba privada, bloqueio): o formulário segue funcionando só na memória.
  }
}

export function carregar(armazenamento = globalThis.localStorage) {
  try {
    const salvo = JSON.parse(armazenamento.getItem(CHAVE_ARMAZENAMENTO));
    return ETAPAS.includes(salvo?.etapa) ? { ...criarEstado(), ...salvo } : criarEstado();
  } catch {
    return criarEstado();
  }
}

export function limpar(armazenamento = globalThis.localStorage) {
  try {
    armazenamento.removeItem(CHAVE_ARMAZENAMENTO);
  } catch {
    // Ver salvar().
  }
}
