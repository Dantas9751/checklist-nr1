// Renderizadores: transformam dados + estado em elementos. Não guardam estado nem tratam eventos.
import { perguntasDoPorte, opcaoEscolhida } from './score.js';
import { respostasDescartadas } from './estado.js';
import { criarExpansor } from './siglas.js';

const SEGUNDOS_POR_PERGUNTA = 20;
const TEMAS_DAS_CAPTURAS = [{ id: 'claro' }, { id: 'escuro' }];

export const plural = (n, singular, plural_) => `${n} ${n === 1 ? singular : plural_}`;

export function h(tag, atributos = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (nome === 'class') el.className = valor;
    else if (nome in el && typeof valor !== 'string') el[nome] = valor;
    else el.setAttribute(nome, valor === true ? '' : valor);
  }
  el.append(...filhos.flat(Infinity).filter(f => f !== null && f !== undefined && f !== false));
  return el;
}

export const porteDe = (dados, porteId) => dados.portes.find(p => p.id === porteId);

// Cada tela tem o seu expansor: a sigla aparece por extenso na primeira vez que surge nela.
export const expansorDaTela = dados => criarExpansor(dados.meta.siglas);

export function minutosEstimados(dados, porteId) {
  return Math.ceil((perguntasDoPorte(dados, porteId).length * SEGUNDOS_POR_PERGUNTA) / 60);
}

export const lista = (itens, classe) => h('ul', { class: classe }, itens.map(i => h('li', {}, i)));

const botao = (rotulo, acao, { primario = false, ...extra } = {}) =>
  h('button', { type: 'button', class: `botao botao--${primario ? 'primario' : 'secundario'}`, 'data-acao': acao, ...extra }, rotulo);

const linkContexto = rotulo => h('a', { href: '#contexto-legal', class: 'link-pagina', 'data-acao': 'contexto' }, rotulo);

// Boas-vindas ---------------------------------------------------------------

function acoesDeAbertura(dados, estado) {
  const respondidas = Object.keys(estado.respostas).length;
  if (!estado.porteId || respondidas === 0) return [botao('Começar', 'comecar', { primario: true })];
  return [
    botao('Continuar de onde parei', 'continuar', { primario: true }),
    botao('Trocar o porte', 'porte'),
    h('p', { class: 'nota' }, `Você já respondeu ${plural(respondidas, 'pergunta', 'perguntas')} do porte ${porteDe(dados, estado.porteId).nome}.`),
  ];
}

function captura(passo) {
  return h('figure', { class: 'captura' },
    TEMAS_DAS_CAPTURAS.map(tema => h('img', {
      class: `captura__img captura__img--${tema.id}`,
      src: `img/passo-${passo.imagem}-${tema.id}.webp`,
      alt: passo.alt,
      width: '1440',
      height: '900',
      loading: 'lazy',
      decoding: 'async',
    })));
}

function itemPasso(passo, x, subpassos = []) {
  return h('li', { class: 'passo', id: `passo-${passo.numero.replace('.', '-')}` },
    h('h3', { class: 'passo__titulo' }, h('span', { class: 'passo__numero' }, passo.numero), passo.titulo),
    h('p', {}, x(passo.texto)),
    captura(passo),
    subpassos.length > 0 && h('ol', { class: 'passos passos--sub' }, subpassos.map(s => itemPasso(s, x))));
}

// Os passos com número "2.x" ficam dentro do passo "2".
function arvoreDePassos(workflow) {
  const principais = workflow.filter(p => !p.numero.includes('.'));
  return principais.map(p => ({ passo: p, subpassos: workflow.filter(s => s.numero.startsWith(`${p.numero}.`)) }));
}

export function renderBoasVindas(dados, estado) {
  const { meta } = dados;
  const x = expansorDaTela(dados);
  const arvore = arvoreDePassos(meta.workflow);
  const minimo = minutosEstimados(dados, dados.portes[0].id);
  const maximo = minutosEstimados(dados, dados.portes.at(-1).id);
  return [
    h('div', { class: 'abertura' },
      h('p', { class: 'chamada' }, meta.chamada),
      h('h1', { id: 'titulo-boas-vindas', tabindex: '-1' }, meta.titulo),
      h('p', { class: 'subtitulo' }, x(meta.subtitulo))),
    h('nav', { class: 'indice', 'aria-labelledby': 'titulo-indice' },
      h('h2', { id: 'titulo-indice' }, 'Nesta página'),
      h('ol', {},
        h('li', {}, h('a', { href: '#sobre' }, 'O que é este checklist')),
        h('li', {}, h('a', { href: '#passo-a-passo' }, 'Passo a passo'),
          h('ol', {}, meta.workflow.map(p => h('li', {}, h('a', { href: `#passo-${p.numero.replace('.', '-')}` }, `${p.numero} ${p.titulo}`))))),
        h('li', {}, h('a', { href: '#comecar' }, 'Antes de começar'))),
      h('p', { class: 'indice__extra' }, 'Para ler à parte: ', linkContexto('Contexto legal e fontes'), '.')),
    h('section', { class: 'secao-inicial', id: 'sobre', 'aria-labelledby': 'titulo-sobre' },
      h('h2', { id: 'titulo-sobre' }, 'O que é este checklist'),
      meta.introducao.map(t => h('p', {}, x(t))),
      h('p', {}, x(meta.glossario))),
    h('section', { class: 'secao-inicial', id: 'passo-a-passo', 'aria-labelledby': 'titulo-passos' },
      h('h2', { id: 'titulo-passos' }, 'Passo a passo'),
      h('ol', { class: 'passos' }, arvore.map(({ passo, subpassos }) => itemPasso(passo, x, subpassos)))),
    h('section', { class: 'secao-inicial', id: 'comecar', 'aria-labelledby': 'titulo-comecar' },
      h('h2', { id: 'titulo-comecar' }, 'Antes de começar'),
      h('p', {}, `Leva de ${minimo} a ${maximo} minutos, conforme o porte. As respostas ficam só neste navegador.`),
      h('p', { class: 'aviso' }, x(meta.aviso)),
      h('div', { class: 'acoes' }, acoesDeAbertura(dados, estado))),
  ];
}

// Como marcar e pontuação ---------------------------------------------------

function tabelaFaixas(dados) {
  const faixas = dados.portes[0].score.faixas;
  return h('div', { class: 'tabela-rolagem' },
    h('table', { class: 'tabela' },
      h('caption', {}, 'Faixas do score por porte (0 a 100)'),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Faixa'), dados.portes.map(p => h('th', { scope: 'col' }, p.nome)))),
      h('tbody', {}, faixas.map((faixa, i) => h('tr', {},
        h('th', { scope: 'row' }, faixa.titulo),
        dados.portes.map(p => {
          const f = p.score.faixas[i];
          return h('td', {}, f.min === 0 ? `abaixo de ${f.max + 1}` : `${f.min} a ${f.max}`);
        }))))));
}

export function renderComoMarcar(dados) {
  const { meta, opcoes } = dados;
  const x = expansorDaTela(dados);
  return [
    h('h1', { id: 'titulo-como-marcar', tabindex: '-1' }, 'Como marcar e como o score funciona'),
    h('p', {}, meta.como_marcar),
    h('h2', {}, 'As quatro marcações'),
    h('dl', { class: 'definicoes' }, opcoes.flatMap(o => [h('dt', {}, o.texto), h('dd', {}, o.descricao)])),
    h('h2', {}, 'O peso de cada pergunta'),
    h('dl', { class: 'definicoes' }, meta.pesos.flatMap(p => [h('dt', {}, `Peso ${p.peso} · ${p.nome}`), h('dd', {}, x(p.texto))])),
    h('h2', {}, 'Como cada porte calcula o score'),
    h('ul', { class: 'lista-scores' }, dados.portes.map(p => h('li', {}, h('strong', {}, `${p.nome} · ${p.score.nome}. `), x(p.score.texto)))),
    tabelaFaixas(dados),
    h('p', { class: 'nota' }, meta.prazos_nota.replace('Os prazos', 'Os pesos, as faixas e os prazos')),
    h('div', { class: 'navegacao' },
      botao('Voltar', 'inicio'),
      botao('Escolher o porte', 'porte', { primario: true })),
  ];
}

// Contexto legal e fontes ---------------------------------------------------

export function renderContexto(dados) {
  const { meta } = dados;
  const x = expansorDaTela(dados);
  const blocoFontes = (titulo, itens) => [h('h3', {}, titulo), lista(itens.map(x), 'lista-fontes')];
  return [
    h('h1', { id: 'titulo-contexto', tabindex: '-1' }, 'Contexto legal e fontes'),
    h('p', { class: 'subtitulo' }, x(meta.contexto_intro)),
    meta.contexto_legal.map(bloco => h('section', { class: 'bloco' }, h('h2', {}, bloco.titulo), lista(bloco.itens.map(x), 'lista-fontes'))),
    h('section', { class: 'bloco' },
      h('h2', {}, 'Fontes'),
      blocoFontes('Documentos de base', meta.fontes.base),
      blocoFontes('Pesquisa complementar', meta.fontes.complementar),
      blocoFontes('O que verificar antes de decidir', meta.fontes.verificar)),
    h('p', { class: 'aviso' }, x(meta.aviso)),
    h('div', { class: 'navegacao' }, botao('Voltar', 'sair-contexto')),
  ];
}

// Porte ---------------------------------------------------------------------

function cartaoPorte(dados, porte, selecionado) {
  const x = expansorDaTela(dados);
  const total = perguntasDoPorte(dados, porte.id).length;
  const idDescricao = `porte-${porte.id}-descricao`;
  return h('label', { class: 'cartao-porte' },
    h('input', { type: 'radio', name: 'porte', value: porte.id, checked: selecionado, 'aria-describedby': idDescricao }),
    h('span', { class: 'cartao-porte__nome' }, porte.nome),
    h('span', { class: 'cartao-porte__descricao', id: idDescricao },
      h('span', {}, x(porte.descricao)),
      h('span', { class: 'cartao-porte__foco' }, `Foco: ${x(porte.foco)}`),
      h('span', { class: 'cartao-porte__total' }, `${total} perguntas · cerca de ${minutosEstimados(dados, porte.id)} min`)),
  );
}

export function detalhePorte(dados, estado, porteId) {
  if (!porteId) return h('p', { class: 'nota' }, 'Escolha um porte para ver o que vem a seguir.');
  const x = expansorDaTela(dados);
  const porte = porteDe(dados, porteId);
  const descartadas = estado.porteId && estado.porteId !== porteId ? respostasDescartadas(estado, dados, porteId) : [];
  return h('div', { class: 'detalhe-porte' },
    h('p', { class: 'detalhe-porte__total' }, `Você vai responder ${perguntasDoPorte(dados, porteId).length} perguntas, em 8 pilares.`),
    h('p', {}, x(porte.o_que_muda)),
    h('p', {}, h('strong', {}, `Score: ${porte.score.nome}. `), x(porte.score.texto)),
    descartadas.length > 0 &&
      h('p', { class: 'alerta', role: 'note' },
        `Ao trocar para ${porte.nome}, ${plural(descartadas.length, 'resposta do porte anterior será descartada', 'respostas do porte anterior serão descartadas')}, porque as perguntas são outras.`),
  );
}

export function renderPorte(dados, estado, porteSelecionado = estado.porteId) {
  return [
    h('h1', { id: 'titulo-porte', tabindex: '-1' }, 'Qual é o porte da sua empresa?'),
    h('p', {}, expansorDaTela(dados)(dados.meta.triagem_nota)),
    h('form', { class: 'form-porte', 'data-form': 'porte' },
      h('fieldset', {},
        h('legend', { class: 'visualmente-oculto' }, 'Porte da empresa'),
        h('div', { class: 'grade-portes' }, dados.portes.map(p => cartaoPorte(dados, p, p.id === porteSelecionado)))),
      h('div', { class: 'detalhe-porte-regiao', 'aria-live': 'polite', id: 'detalhe-porte' }, detalhePorte(dados, estado, porteSelecionado)),
      h('div', { class: 'navegacao' },
        botao('Voltar', 'como-marcar'),
        h('button', { type: 'submit', class: 'botao botao--primario', disabled: !porteSelecionado }, 'Continuar')),
    ),
  ];
}

// Perguntas -----------------------------------------------------------------

const ICONE_INFO = 'M12 10.5v6M12 7.5v.01';

function botaoInfo(idPopover, rotulo) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<circle cx="12" cy="12" r="9.5"/><path d="${ICONE_INFO}"/>`;
  return h('button', { type: 'button', class: 'opcao__info', popovertarget: idPopover, 'aria-label': `O que significa ${rotulo}?` }, svg);
}

function renderUnica(dados, pergunta, resposta) {
  const opcoes = pergunta.opcoes ?? dados.opcoes;
  return h('div', { class: 'opcoes' }, opcoes.map(o => {
    const idPopover = `${pergunta.id}-${o.id}-explica`;
    return h('div', { class: 'opcao' },
      h('label', { class: 'opcao__rotulo' },
        h('input', { type: 'radio', name: pergunta.id, value: o.id, checked: resposta === o.id, 'aria-describedby': idPopover }),
        h('span', { class: 'opcao__marca', 'aria-hidden': 'true' }),
        h('span', { class: 'opcao__texto' }, o.texto)),
      botaoInfo(idPopover, o.texto),
      h('div', { class: 'explicacao', id: idPopover, popover: 'auto' },
        h('strong', {}, o.texto), ' ', o.descricao));
  }));
}

// O PDF só usa escolha única. Novos tipos entram aqui, com o mesmo contrato.
export const RENDERIZADORES = { unica: renderUnica };

export function renderPergunta(dados, estado) {
  const x = expansorDaTela(dados);
  const perguntas = perguntasDoPorte(dados, estado.porteId);
  const pergunta = perguntas[estado.posicao];
  const secaoIndice = dados.secoes.findIndex(s => s.id === pergunta.secaoId);
  const secao = dados.secoes[secaoIndice];
  const primeiraDaSecao = perguntas[estado.posicao - 1]?.secaoId !== pergunta.secaoId;
  const resposta = estado.respostas[pergunta.id];
  const renderizar = RENDERIZADORES[pergunta.tipo];
  // A ordem importa: o expansor explica cada sigla no primeiro texto em que ela aparece.
  const contexto = x(pergunta.ajuda);
  const enunciado = x(pergunta.texto);
  const reflita = x(pergunta.reflita);

  return h('form', { class: 'pergunta', 'data-form': 'pergunta', 'data-pergunta': pergunta.id },
    h('div', { class: 'pilar' },
      h('span', { class: 'pilar__letra', 'aria-hidden': 'true' }, secao.id),
      h('p', { class: 'pilar__nome', tabindex: '-1' }, h('span', {}, `Pilar ${secaoIndice + 1} de ${dados.secoes.length}`), ` ${secao.titulo}`)),
    primeiraDaSecao && h('p', { class: 'ponte' }, secao.ponte),
    h('div', { class: 'contexto' },
      h('h2', {}, 'Contexto e impacto'),
      h('p', {}, contexto),
      h('p', { class: 'base' }, `Base: ${pergunta.base}`)),
    h('fieldset', {},
      h('legend', {},
        h('span', { class: 'pergunta__meta' }, `${pergunta.id} · Pergunta ${estado.posicao + 1} de ${perguntas.length}`),
        h('h1', { class: 'pergunta__texto' }, enunciado)),
      h('p', { class: `peso peso--${pergunta.peso}` }, `Peso ${pergunta.peso} · ${pergunta.classe}`),
      renderizar(dados, pergunta, resposta)),
    h('p', { class: 'reflita' }, h('strong', {}, 'Reflita. '), reflita),
    h('div', { class: 'navegacao' },
      botao('Voltar', 'voltar'),
      h('button', { type: 'submit', class: 'botao botao--primario', 'data-botao': 'avancar' }, resposta ? 'Próxima' : 'Pular')),
  );
}

// Revisão -------------------------------------------------------------------

export function renderRevisao(dados, estado) {
  const x = expansorDaTela(dados);
  const perguntas = perguntasDoPorte(dados, estado.porteId);
  const puladas = perguntas.filter(q => !estado.respostas[q.id]).length;
  const porSecao = dados.secoes
    .map(secao => ({ secao, itens: perguntas.map((q, posicao) => ({ q, posicao })).filter(({ q }) => q.secaoId === secao.id) }))
    .filter(({ itens }) => itens.length > 0);

  return [
    h('h1', { id: 'titulo-revisao', tabindex: '-1' }, 'Revise suas respostas'),
    h('p', {}, `${perguntas.length - puladas} de ${perguntas.length} perguntas respondidas.`,
      puladas > 0 ? ` ${puladas} ficaram sem resposta e não entram no score. Você pode voltar e responder agora.` : ''),
    porSecao.map(({ secao, itens }) =>
      h('div', { class: 'revisao-secao' },
        h('h2', {}, `${secao.id} · ${secao.titulo}`),
        h('ul', { class: 'revisao-lista' }, itens.map(({ q, posicao }) => {
          const opcao = opcaoEscolhida(dados, q, estado.respostas);
          return h('li', { class: opcao ? '' : 'revisao-lista__pendente' },
            h('span', { class: 'revisao-lista__codigo' }, q.id),
            h('span', { class: 'revisao-lista__texto' }, x(q.texto)),
            h('span', { class: 'revisao-lista__resposta' }, opcao ? opcao.texto : 'Sem resposta'),
            h('button', { type: 'button', class: 'botao-link', 'data-acao': 'editar', 'data-posicao': String(posicao), 'aria-label': `Alterar resposta de ${q.id}` }, 'Alterar'));
        })))),
    h('div', { class: 'navegacao' },
      h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'editar', 'data-posicao': String(perguntas.length - 1) }, 'Voltar'),
      botao('Ver relatório', 'relatorio', { primario: true })),
  ];
}
