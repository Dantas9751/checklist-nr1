// Renderizadores: transformam dados + estado em elementos. Não guardam estado nem tratam eventos.
import { perguntasDoPorte, opcaoEscolhida } from './score.js';
import { respostasDescartadas } from './estado.js';

const SEGUNDOS_POR_PERGUNTA = 20;

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

export function minutosEstimados(dados, porteId) {
  return Math.ceil((perguntasDoPorte(dados, porteId).length * SEGUNDOS_POR_PERGUNTA) / 60);
}

const lista = (itens, classe) => h('ul', { class: classe }, itens.map(i => h('li', {}, i)));

const paragrafos = textos => textos.map(t => h('p', {}, t));

// Boas-vindas ---------------------------------------------------------------

function acoesDeAbertura(dados, estado) {
  const respondidas = Object.keys(estado.respostas).length;
  if (!estado.porteId || respondidas === 0) {
    return [h('button', { type: 'button', class: 'botao botao--primario', 'data-acao': 'comecar' }, 'Começar')];
  }
  return [
    h('button', { type: 'button', class: 'botao botao--primario', 'data-acao': 'continuar' }, 'Continuar de onde parei'),
    h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'comecar' }, 'Trocar o porte'),
    h('p', { class: 'nota' }, `Você já respondeu ${plural(respondidas, 'pergunta', 'perguntas')} do porte ${porteDe(dados, estado.porteId).nome}.`),
  ];
}

export function renderBoasVindas(dados, estado) {
  const { meta, opcoes } = dados;
  return [
    h('div', { class: 'abertura' },
      h('p', { class: 'chamada' }, meta.chamada),
      h('h1', { id: 'titulo-boas-vindas', tabindex: '-1' }, meta.titulo),
      h('p', { class: 'subtitulo' }, meta.subtitulo),
      h('div', { class: 'acoes' }, acoesDeAbertura(dados, estado)),
      h('p', { class: 'nota' }, `Leva de ${minutosEstimados(dados, dados.portes[0].id)} a ${minutosEstimados(dados, dados.portes.at(-1).id)} minutos, conforme o porte. As respostas ficam só neste navegador.`),
    ),
    h('div', { class: 'texto-corrido' }, paragrafos(meta.introducao), h('p', {}, meta.glossario)),
    h('h2', {}, 'Como funciona'),
    h('ol', { class: 'passos' }, meta.workflow.map(p => h('li', {}, h('strong', {}, p.titulo), h('span', {}, p.texto)))),
    h('h2', {}, 'Como marcar'),
    h('p', {}, meta.como_marcar),
    h('dl', { class: 'definicoes' }, opcoes.flatMap(o => [h('dt', {}, o.texto), h('dd', {}, o.descricao)])),
    h('dl', { class: 'definicoes' }, meta.pesos.flatMap(p => [h('dt', {}, `Peso ${p.peso} · ${p.nome}`), h('dd', {}, p.texto)])),
    h('details', { class: 'recolhivel' },
      h('summary', {}, 'Contexto legal em uma página'),
      meta.contexto_legal.map(bloco => h('div', {}, h('h3', {}, bloco.titulo), lista(bloco.itens)))),
    h('p', { class: 'aviso' }, meta.aviso),
  ];
}

// Porte ---------------------------------------------------------------------

function cartaoPorte(dados, porte, selecionado) {
  const total = perguntasDoPorte(dados, porte.id).length;
  const idDescricao = `porte-${porte.id}-descricao`;
  return h('label', { class: 'cartao-porte' },
    h('input', { type: 'radio', name: 'porte', value: porte.id, checked: selecionado, 'aria-describedby': idDescricao }),
    h('span', { class: 'cartao-porte__nome' }, porte.nome),
    h('span', { class: 'cartao-porte__descricao', id: idDescricao },
      h('span', {}, porte.descricao),
      h('span', { class: 'cartao-porte__foco' }, `Foco: ${porte.foco}`),
      h('span', { class: 'cartao-porte__total' }, `${total} perguntas · cerca de ${minutosEstimados(dados, porte.id)} min`)),
  );
}

export function detalhePorte(dados, estado, porteId) {
  if (!porteId) return h('p', { class: 'nota' }, 'Escolha um porte para ver o que vem a seguir.');
  const porte = porteDe(dados, porteId);
  const descartadas = estado.porteId && estado.porteId !== porteId ? respostasDescartadas(estado, dados, porteId) : [];
  return h('div', { class: 'detalhe-porte' },
    h('p', { class: 'detalhe-porte__total' }, `Você vai responder ${perguntasDoPorte(dados, porteId).length} perguntas, em 8 pilares.`),
    h('p', {}, porte.o_que_muda),
    h('p', {}, h('strong', {}, `Score: ${porte.score.nome}. `), porte.score.texto),
    descartadas.length > 0 &&
      h('p', { class: 'alerta', role: 'note' },
        `Ao trocar para ${porte.nome}, ${plural(descartadas.length, 'resposta do porte anterior será descartada', 'respostas do porte anterior serão descartadas')}, porque as perguntas são outras.`),
  );
}

export function renderPorte(dados, estado, porteSelecionado = estado.porteId) {
  return [
    h('h1', { id: 'titulo-porte', tabindex: '-1' }, 'Qual é o porte da sua empresa?'),
    h('p', {}, dados.meta.triagem_nota),
    h('form', { class: 'form-porte', 'data-form': 'porte' },
      h('fieldset', {},
        h('legend', { class: 'visualmente-oculto' }, 'Porte da empresa'),
        h('div', { class: 'grade-portes' }, dados.portes.map(p => cartaoPorte(dados, p, p.id === porteSelecionado)))),
      h('div', { class: 'detalhe-porte-regiao', 'aria-live': 'polite', id: 'detalhe-porte' }, detalhePorte(dados, estado, porteSelecionado)),
      h('div', { class: 'navegacao' },
        h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'inicio' }, 'Voltar'),
        h('button', { type: 'submit', class: 'botao botao--primario', disabled: !porteSelecionado }, 'Continuar')),
    ),
  ];
}

// Perguntas -----------------------------------------------------------------

function renderUnica(dados, pergunta, resposta) {
  const opcoes = pergunta.opcoes ?? dados.opcoes;
  return h('div', { class: 'opcoes' }, opcoes.map(o => {
    const idDescricao = `${pergunta.id}-${o.id}-descricao`;
    return h('label', { class: 'opcao' },
      h('input', { type: 'radio', name: pergunta.id, value: o.id, checked: resposta === o.id, 'aria-describedby': idDescricao }),
      h('span', { class: 'opcao__marca', 'aria-hidden': 'true' }),
      h('span', { class: 'opcao__texto' }, o.texto),
      h('span', { class: 'opcao__descricao', id: idDescricao }, o.descricao),
    );
  }));
}

// O PDF só usa escolha única. Novos tipos entram aqui, com o mesmo contrato.
export const RENDERIZADORES = { unica: renderUnica };

export function renderPergunta(dados, estado) {
  const perguntas = perguntasDoPorte(dados, estado.porteId);
  const pergunta = perguntas[estado.posicao];
  const secaoIndice = dados.secoes.findIndex(s => s.id === pergunta.secaoId);
  const secao = dados.secoes[secaoIndice];
  const primeiraDaSecao = perguntas[estado.posicao - 1]?.secaoId !== pergunta.secaoId;
  const resposta = estado.respostas[pergunta.id];
  const renderizar = RENDERIZADORES[pergunta.tipo];

  return h('form', { class: 'pergunta', 'data-form': 'pergunta', 'data-pergunta': pergunta.id },
    h('div', { class: 'pilar' },
      h('span', { class: 'pilar__letra', 'aria-hidden': 'true' }, secao.id),
      h('p', { class: 'pilar__nome' }, h('span', {}, `Pilar ${secaoIndice + 1} de ${dados.secoes.length}`), ` ${secao.titulo}`)),
    primeiraDaSecao && h('p', { class: 'ponte' }, secao.ponte),
    h('fieldset', {},
      h('legend', {},
        h('span', { class: 'pergunta__meta' }, `${pergunta.id} · Pergunta ${estado.posicao + 1} de ${perguntas.length}`),
        h('h1', { class: 'pergunta__texto', tabindex: '-1' }, pergunta.texto)),
      h('p', { class: `peso peso--${pergunta.peso}` }, `Peso ${pergunta.peso} · ${pergunta.classe}`),
      renderizar(dados, pergunta, resposta)),
    h('div', { class: 'contexto' },
      h('h2', {}, 'Contexto e impacto'),
      h('p', {}, pergunta.ajuda),
      h('p', { class: 'reflita' }, h('strong', {}, 'Reflita. '), pergunta.reflita),
      h('p', { class: 'base' }, `Base: ${pergunta.base}`)),
    h('div', { class: 'navegacao' },
      h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'voltar' }, 'Voltar'),
      h('button', { type: 'submit', class: 'botao botao--primario', 'data-botao': 'avancar' }, resposta ? 'Próxima' : 'Pular')),
  );
}

// Revisão -------------------------------------------------------------------

export function renderRevisao(dados, estado) {
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
            h('span', { class: 'revisao-lista__texto' }, q.texto),
            h('span', { class: 'revisao-lista__resposta' }, opcao ? opcao.texto : 'Sem resposta'),
            h('button', { type: 'button', class: 'botao-link', 'data-acao': 'editar', 'data-posicao': String(posicao), 'aria-label': `Alterar resposta de ${q.id}` }, 'Alterar'));
        })))),
    h('div', { class: 'navegacao' },
      h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'editar', 'data-posicao': String(perguntas.length - 1) }, 'Voltar às perguntas'),
      h('button', { type: 'button', class: 'botao botao--primario', 'data-acao': 'relatorio' }, 'Ver relatório')),
  ];
}
