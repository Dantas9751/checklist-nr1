// Telas do formulário complementar (COPSOQ II-Br): introdução, perguntas em páginas e resultado.
import { h, plural } from './render.js';
import { paginas, opcoesDoItem, pontuar, comportamentosOfensivos, NAO } from './copsoq.js';

export const ROTULO_DA_FAIXA = { seguro: 'Seguro', atencao: 'Atenção', risco: 'Risco' };
const STATUS_DA_FAIXA = { seguro: 'bom', atencao: 'atencao', risco: 'critico' };
const ICONE = {
  bom: 'M7 12.5l3.2 3.2L17 9', atencao: 'M12 8v5M12 16.5v.01', critico: 'M8.5 8.5l7 7M15.5 8.5l-7 7', neutro: 'M8 12h8',
};

export const estadoInicialCopsoq = () => ({ fase: 'intro', pagina: 0, respostas: {}, quem: {} });

function icone(status) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'icone-status');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<circle cx="12" cy="12" r="10"/><path d="${ICONE[status]}"/>`;
  return svg;
}

const selo = faixa => {
  const status = faixa ? STATUS_DA_FAIXA[faixa] : 'neutro';
  return h('span', { class: `selo-pilar status--${status}` }, icone(status), faixa ? ROTULO_DA_FAIXA[faixa] : 'Incompleta');
};

const botao = (rotulo, acao, primario = false, extra = {}) =>
  h('button', { type: 'button', class: `botao botao--${primario ? 'primario' : 'secundario'}`, 'data-acao': acao, ...extra }, rotulo);

// Introdução ----------------------------------------------------------------

function renderIntro(dados, c) {
  const { meta } = dados;
  const temRespostas = Object.keys(c.respostas).length > 0;
  return [
    h('p', { class: 'chamada' }, `Ferramenta adicional · ${meta.sigla}`),
    h('h1', { id: 'titulo-copsoq', tabindex: '-1' }, meta.titulo),
    h('p', { class: 'subtitulo' }, meta.subtitulo),
    meta.introducao.map(t => h('p', {}, t)),
    h('section', { class: 'aviso-individual', 'aria-labelledby': 'titulo-aviso-individual' },
      h('h2', { id: 'titulo-aviso-individual' }, meta.aviso_titulo),
      h('ul', {}, meta.aviso.map(t => h('li', {}, t)))),
    h('div', { class: 'navegacao' },
      botao('Voltar', 'sair-copsoq'),
      botao(temRespostas ? 'Continuar de onde parei' : 'Li e entendi, começar', 'copsoq-comecar', true)),
    referencia(meta),
  ];
}

const referencia = meta => h('details', { class: 'recolhivel' },
  h('summary', {}, 'Referência científica'),
  h('ul', { class: 'lista-fontes' }, meta.referencia.map(r => h('li', {}, r))));

// Perguntas -----------------------------------------------------------------

function campoItem(dados, item, c, numero) {
  const nome = `copsoq:${item.id}`;
  const resposta = c.respostas[item.id];
  const opcoes = opcoesDoItem(dados, item).map(o => {
    const valor = item.tipo === 'ofensivo' ? o.id : o.texto;
    return h('div', { class: 'opcao' },
      h('label', { class: 'opcao__rotulo opcao__rotulo--simples' },
        h('input', { type: 'radio', name: nome, value: valor, checked: resposta === valor }),
        h('span', { class: 'opcao__marca', 'aria-hidden': 'true' }),
        h('span', { class: 'opcao__texto' }, o.texto)));
  });
  const relatou = item.tipo === 'ofensivo' && resposta && resposta !== NAO;
  return h('fieldset', { class: 'copsoq-item', 'data-item': item.id },
    h('legend', {},
      h('span', { class: 'pergunta__meta' }, `Pergunta ${numero} de 40`),
      h('span', { class: 'copsoq-item__texto' }, item.texto)),
    h('div', { class: 'opcoes' }, opcoes),
    relatou && h('fieldset', { class: 'copsoq-quem' },
      h('legend', {}, 'Se sim, de quem? (pode marcar mais de uma)'),
      dados.quem.map(q => h('label', { class: 'copsoq-quem__opcao' },
        h('input', { type: 'checkbox', name: `copsoq-quem:${item.id}`, value: q, checked: (c.quem[item.id] ?? []).includes(q) }),
        h('span', {}, q)))));
}

export function paginaCompleta(dados, c) {
  return paginas(dados)[c.pagina].every(item => c.respostas[item.id]);
}

function renderPerguntas(dados, c) {
  const todas = paginas(dados);
  const pagina = todas[c.pagina];
  const ultima = c.pagina === todas.length - 1;
  const inicio = c.pagina * dados.meta.por_pagina;
  const faltam = pagina.filter(item => !c.respostas[item.id]).length;
  return h('form', { class: 'copsoq-pagina', 'data-form': 'copsoq' },
    h('p', { class: 'pilar__nome', tabindex: '-1' },
      h('span', {}, `Página ${c.pagina + 1} de ${todas.length}`), ` ${pagina[0].dominio ?? 'Comportamentos ofensivos'}`),
    h('h1', { class: 'visualmente-oculto', id: 'titulo-copsoq' }, `${dados.meta.titulo}: página ${c.pagina + 1} de ${todas.length}`),
    h('div', { class: 'progresso-copsoq', role: 'progressbar', 'aria-label': 'Progresso do formulário', 'aria-valuemin': '0', 'aria-valuemax': String(todas.length), 'aria-valuenow': String(c.pagina + 1) },
      h('span', { style: `width: ${((c.pagina + 1) / todas.length) * 100}%` })),
    pagina.map((item, i) => campoItem(dados, item, c, inicio + i + 1)),
    h('p', { class: 'nota', id: 'copsoq-faltam', 'aria-live': 'polite' },
      faltam > 0 ? `Responda ${plural(faltam, 'pergunta', 'perguntas')} para continuar.` : ''),
    h('div', { class: 'navegacao' },
      botao('Voltar', 'copsoq-anterior'),
      h('button', { type: 'submit', class: 'botao botao--primario', disabled: faltam > 0, 'data-botao': 'copsoq-avancar' },
        ultima ? 'Ver resultado' : 'Próxima')));
}

// Resultado -----------------------------------------------------------------

function linhaDimensao(d) {
  const largura = d.pontos === null ? 0 : (d.pontos / d.maximo) * 100;
  const status = d.faixa ? STATUS_DA_FAIXA[d.faixa] : 'neutro';
  return h('li', { class: `copsoq-dimensao copsoq-dimensao--${d.faixa ?? 'incompleta'}` },
    h('span', { class: 'copsoq-dimensao__nome' }, d.titulo),
    selo(d.faixa),
    h('span', { class: `barra-nota status--${status}`, 'aria-hidden': 'true' },
      h('span', { class: 'barra-nota__valor', style: `width: ${largura}%` })),
    h('span', { class: 'copsoq-dimensao__pontos' }, d.pontos === null ? 'Sem resposta completa' : `${d.pontos} de ${d.maximo} pontos`));
}

function renderResultado(dados, c) {
  const { meta } = dados;
  const dims = pontuar(dados, c.respostas);
  const contagem = faixa => dims.filter(d => d.faixa === faixa).length;
  const dominios = [...new Set(dims.map(d => d.dominio))];
  const ofensivos = comportamentosOfensivos(dados, c.respostas, c.quem);
  const relatados = ofensivos.filter(o => o.relatado);
  return [
    h('p', { class: 'chamada' }, `Ferramenta adicional · ${meta.sigla}`),
    h('h1', { id: 'titulo-copsoq', tabindex: '-1' }, 'Seu resultado'),
    h('p', { class: 'alerta', role: 'note' }, meta.aviso[0], ' ', meta.aviso[2]),
    h('dl', { class: 'resumo-respostas' },
      ['risco', 'atencao', 'seguro'].map(f => h('div', { class: `resumo-faixa resumo-faixa--${f}` },
        h('dt', {}, ROTULO_DA_FAIXA[f]), h('dd', {}, plural(contagem(f), 'dimensão', 'dimensões'))))),
    h('ul', { class: 'legenda-faixas' }, Object.entries(meta.faixas).map(([f, t]) => h('li', {}, selo(f), h('span', {}, t)))),
    dominios.map(dom => h('section', { class: 'bloco' },
      h('h2', {}, dom),
      h('ul', { class: 'copsoq-dimensoes' }, dims.filter(d => d.dominio === dom).map(linhaDimensao)))),
    h('section', { class: 'bloco' },
      h('h2', {}, 'Comportamentos ofensivos'),
      h('p', { class: 'nota' }, meta.ofensivos_texto),
      h('ul', { class: 'copsoq-ofensivos' }, ofensivos.map(o => h('li', { class: o.relatado ? 'copsoq-ofensivos__relatado' : '' },
        h('strong', {}, o.titulo),
        h('span', {}, o.resposta ? o.resposta.texto : 'Sem resposta'),
        o.quem.length > 0 && h('span', { class: 'nota' }, `Quem: ${o.quem.join(', ')}`)))),
      relatados.length > 0 && h('p', { class: 'alerta', role: 'note' },
        'Você relatou pelo menos um comportamento ofensivo. Procure o canal de denúncia da empresa, a CIPA ou o RH, e, se precisar, apoio de um profissional de saúde.')),
    h('div', { class: 'acoes acoes--relatorio' },
      botao('Baixar resultado', 'imprimir', true),
      botao('Revisar respostas', 'copsoq-revisar'),
      botao('Refazer formulário', 'copsoq-refazer'),
      botao('Voltar ao checklist', 'sair-copsoq')),
    referencia(meta),
  ];
}

export function renderCopsoq(dados, c) {
  if (!dados) return h('p', { class: 'nota', tabindex: '-1' }, 'Carregando o formulário...');
  if (c.fase === 'perguntas') return renderPerguntas(dados, c);
  if (c.fase === 'resultado') return renderResultado(dados, c);
  return renderIntro(dados, c);
}
