// COPSOQ II-Br versão curta: ordem das perguntas, páginas e pontuação por dimensão. Funções puras, sem DOM.
// Cada dimensão soma os pontos dos seus itens e é classificada pelas faixas da Tabela 1 de Sato et al. (2026).

export const NAO = 'nao';

export function itensEmOrdem(dados) {
  const comuns = dados.dominios.flatMap(dominio => dominio.dimensoes.flatMap(dimensao =>
    dimensao.itens.map(item => ({ ...item, tipo: 'escala', dimensaoId: dimensao.id, dominio: dominio.titulo }))));
  const ofensivos = dados.ofensivos.map(o => ({ ...o, tipo: 'ofensivo' }));
  return [...comuns, ...ofensivos];
}

export function paginas(dados) {
  const itens = itensEmOrdem(dados);
  const tamanho = dados.meta.por_pagina;
  return Array.from({ length: Math.ceil(itens.length / tamanho) }, (_, i) => itens.slice(i * tamanho, (i + 1) * tamanho));
}

export const opcoesDoItem = (dados, item) => (item.tipo === 'ofensivo' ? dados.ofensivo_opcoes : dados.escalas[item.escala]);

const valorDe = (dados, item, resposta) => dados.escalas[item.escala].find(o => o.texto === resposta)?.valor;

export function faixaDosPontos(faixas, pontos) {
  return Object.entries(faixas).find(([, [min, max]]) => pontos >= min && pontos <= max)?.[0] ?? null;
}

// Dimensão com alguma pergunta sem resposta fica sem pontos e sem faixa.
export function pontuar(dados, respostas) {
  return dados.dominios.flatMap(dominio => dominio.dimensoes.map(dimensao => {
    const valores = dimensao.itens.map(item => valorDe(dados, item, respostas[item.id]));
    const completa = valores.every(v => v !== undefined);
    const pontos = completa ? valores.reduce((soma, v) => soma + v, 0) : null;
    const maximo = dimensao.itens.reduce((soma, item) => soma + Math.max(...dados.escalas[item.escala].map(o => o.valor)), 0);
    return {
      id: dimensao.id,
      titulo: dimensao.titulo,
      dominio: dominio.titulo,
      pontos,
      maximo,
      faixa: completa ? faixaDosPontos(dimensao.faixas, pontos) : null,
    };
  }));
}

export function comportamentosOfensivos(dados, respostas, quem = {}) {
  return dados.ofensivos.map(o => {
    const resposta = dados.ofensivo_opcoes.find(op => op.id === respostas[o.id]) ?? null;
    return { id: o.id, titulo: o.titulo, resposta, relatado: Boolean(resposta && resposta.id !== NAO), quem: quem[o.id] ?? [] };
  });
}

export const respondidas = (dados, respostas) => itensEmOrdem(dados).filter(item => respostas[item.id]).length;
