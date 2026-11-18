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

export const ID_FIM_DA_LEITURA = 'fim-da-leitura';

function botaoComecar(liberado) {
  return h('button', {
    type: 'button',
    class: 'botao botao--primario',
    'data-acao': 'comecar',
    'data-exige-leitura': '',
    disabled: !liberado,
    'aria-describedby': liberado ? null : 'aviso-leitura',
  }, 'Começar');
}

// Quem já começou continua de onde parou; quem chega pela primeira vez lê a página antes de começar.
function acoesDeAbertura(dados, estado, liberado, noFim) {
  const respondidas = Object.keys(estado.respostas).length;
  if (estado.porteId && respondidas > 0) {
    return [
      botao('Continuar de onde parei', 'continuar', { primario: true }),
      botao('Trocar o porte', 'porte'),
      h('p', { class: 'nota acoes__nota' }, `Você já respondeu ${plural(respondidas, 'pergunta', 'perguntas')} do porte ${porteDe(dados, estado.porteId).nome}.`),
    ];
  }
  if (noFim) return [botaoComecar(true)];
  return [
    botaoComecar(liberado),
    h('p', { class: 'nota acoes__nota', id: 'aviso-leitura', 'aria-live': 'polite' }, liberado ?
      'Pronto, você já pode começar.' :
      'Leia a página até o fim para liberar o botão. São poucos minutos e explicam como o score funciona.'),
  ];
}

function captura(passo) {
  return h('figure', { class: 'captura' },
    TEMAS_DAS_CAPTURAS.map(tema => h('img', {
      class: `captura__img captura__img--${tema.id}`,
      src: `img/passo-${passo.imagem}-${tema.id}.webp`,
      alt: passo.alt,
      loading: 'lazy',
      decoding: 'async',
    })));
}

const idDoPasso = passo => `passo-${passo.numero.replace('.', '-')}`;

function itemPasso(passo, x, subpassos = []) {
  return h('li', { class: 'passo', id: idDoPasso(passo) },
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

// Ferramentas adicionais: com "acao" abrem dentro do site; com "url", em nova aba.
function linkFerramenta(ferramenta) {
  const atributos = ferramenta.acao
    ? { href: `#${ferramenta.acao}`, 'data-acao': ferramenta.acao }
    : { href: ferramenta.url, target: '_blank', rel: 'noopener' };
  return h('a', { class: 'ferramenta', ...atributos },
    h('span', { class: 'ferramenta__titulo' }, ferramenta.titulo),
    h('span', { class: 'ferramenta__descricao' }, ferramenta.descricao));
}

export function renderFerramentas(dados) {
  return h('ul', { class: 'lista-ferramentas' }, dados.meta.ferramentas.itens.map(f => h('li', {}, linkFerramenta(f))));
}

export function renderMenuPrincipal(dados) {
  return [
    h('a', { class: 'menu-flutuante__item', href: '#contexto-legal', 'data-acao': 'contexto' }, 'Contexto legal e fontes'),
    h('p', { class: 'menu-flutuante__titulo' }, dados.meta.ferramentas.titulo),
    renderFerramentas(dados),
  ];
}

export function renderMenuFerramentas(dados) {
  return [h('p', { class: 'menu-flutuante__titulo' }, dados.meta.ferramentas.titulo), renderFerramentas(dados)];
}

export const TEMAS = [
  { id: 'auto', nome: 'Automático', descricao: 'Check-One, segue o sistema', cores: ['#f4f5fb', '#070b2e'] },
  { id: 'light', nome: 'Check-One claro', cores: ['#f4f5fb', '#2a1fa6'] },
  { id: 'dark', nome: 'Check-One escuro', cores: ['#070b2e', '#9b94ff'] },
  { id: 'midnight', nome: 'Midnight', cores: ['#121a2e', '#8aa9ff'] },
  { id: 'sunlight', nome: 'Sunlight', cores: ['#fff4dc', '#8a4b00'] },
  { id: 'ciee', nome: 'CIEE', cores: ['#ffffff', '#0b4ea2'] },
];

export function renderMenuTema(temaAtual) {
  return h('fieldset', { class: 'menu-tema' },
    h('legend', { class: 'menu-flutuante__titulo' }, 'Tema'),
    TEMAS.map(t => h('label', { class: 'menu-tema__opcao' },
      h('input', { type: 'radio', name: 'tema', value: t.id, checked: t.id === temaAtual }),
      h('span', { class: 'menu-tema__amostra', 'aria-hidden': 'true', style: `--amostra-fundo: ${t.cores[0]}; --amostra-destaque: ${t.cores[1]}` }),
      h('span', { class: 'menu-tema__nome' }, t.nome, t.descricao ? h('small', {}, t.descricao) : null))));
}

function indice(meta) {
  return h('nav', { class: 'indice', 'aria-label': 'Nesta página' },
    h('p', { class: 'indice__titulo' }, 'Nesta página'),
    h('ul', {},
      h('li', {}, h('a', { href: '#sobre' }, 'O que é')),
      h('li', {}, h('a', { href: '#passo-a-passo' }, 'Passo a passo'),
        h('ul', { class: 'indice__sub' }, meta.workflow.map(p => h('li', {}, h('a', { href: `#${idDoPasso(p)}` }, `${p.numero} ${p.titulo}`))))),
      h('li', {}, h('a', { href: '#comecar' }, 'Antes de começar')),
      h('li', {}, linkContexto('Contexto legal')),
      h('li', { class: 'indice__ferramentas' },
        h('span', { class: 'indice__grupo' }, meta.ferramentas.titulo),
        h('ul', { class: 'indice__lista-ferramentas' }, meta.ferramentas.itens.map(f => h('li', {}, linkDoIndice(f)))))));
}

function linkDoIndice(f) {
  if (f.acao) return h('a', { href: `#${f.acao}`, 'data-acao': f.acao }, f.titulo);
  return h('a', { href: f.url, target: '_blank', rel: 'noopener' }, f.titulo);
}

// Estrelas de quatro pontas e globo em linhas, como no convite do Check-One. Só decoração.
const ESTRELA = 'M12 1c.9 5.6 3.6 8.6 11 11-7.4 2.4-10.1 5.4-11 11-.9-5.6-3.6-8.6-11-11 7.4-2.4 10.1-5.4 11-11z';

function decoracaoDaAbertura() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'abertura__decoracao');
  svg.setAttribute('viewBox', '0 0 400 240');
  svg.setAttribute('aria-hidden', 'true');
  const meridianos = [0, 22, 44, 62, 76].map(rx => `<ellipse cx="300" cy="90" rx="${rx}" ry="80"/>`).join('');
  const paralelos = [-60, -30, 0, 30, 60].map(dy => {
    const largura = Math.sqrt(1 - (dy / 80) ** 2) * 80;
    return `<line x1="${300 - largura}" y1="${90 + dy}" x2="${300 + largura}" y2="${90 + dy}"/>`;
  }).join('');
  const pontas = 18;
  const estouro = Array.from({ length: pontas * 2 }, (_, i) => {
    const raio = i % 2 ? 84 : 104;
    const angulo = (Math.PI * i) / pontas;
    return `${(300 + raio * Math.sin(angulo)).toFixed(1)},${(90 - raio * Math.cos(angulo)).toFixed(1)}`;
  }).join(' ');
  svg.innerHTML = `<polygon class="abertura__estouro" points="${estouro}" transform="translate(-28 22)"/>
    <g class="abertura__globo"><circle cx="300" cy="90" r="80"/>${meridianos}${paralelos}</g>
    <g class="abertura__estrelas">
      <path d="${ESTRELA}" transform="translate(186 20) scale(1)"/>
      <path d="${ESTRELA}" transform="translate(372 150) scale(0.6)"/>
      <path d="${ESTRELA}" transform="translate(206 196) scale(0.45)"/>
    </g>`;
  return svg;
}

export function renderBoasVindas(dados, estado, { liberado = false } = {}) {
  const { meta } = dados;
  const x = expansorDaTela(dados);
  const arvore = arvoreDePassos(meta.workflow);
  const minimo = minutosEstimados(dados, dados.portes[0].id);
  const maximo = minutosEstimados(dados, dados.portes.at(-1).id);
  return h('div', { class: 'inicio' },
    indice(meta),
    h('div', { class: 'inicio__conteudo' },
      h('div', { class: 'abertura' },
        decoracaoDaAbertura(),
        h('p', { class: 'chamada' }, meta.chamada),
        h('h1', { id: 'titulo-boas-vindas', tabindex: '-1', class: 'marca' }, meta.marca),
        h('p', { class: 'abertura__titulo' }, meta.titulo),
        h('p', { class: 'subtitulo' }, x(meta.subtitulo)),
        h('p', { class: 'nota' }, `Leva de ${minimo} a ${maximo} minutos, conforme o porte. As respostas ficam só neste navegador.`),
        h('div', { class: 'acoes' }, acoesDeAbertura(dados, estado, liberado, false))),
      h('section', { class: 'secao-inicial', id: 'sobre', 'aria-labelledby': 'titulo-sobre' },
        h('h2', { id: 'titulo-sobre' }, 'O que é este checklist'),
        meta.introducao.map(t => h('p', {}, x(t))),
        h('p', {}, x(meta.glossario))),
      h('section', { class: 'secao-inicial', id: 'passo-a-passo', 'aria-labelledby': 'titulo-passos' },
        h('h2', { id: 'titulo-passos' }, 'Passo a passo'),
        h('ol', { class: 'passos' }, arvore.map(({ passo, subpassos }) => itemPasso(passo, x, subpassos)))),
      h('section', { class: 'secao-inicial', id: 'comecar', 'aria-labelledby': 'titulo-comecar' },
        h('h2', { id: 'titulo-comecar' }, 'Antes de começar'),
        h('p', { class: 'aviso' }, x(meta.aviso)),
        h('div', { class: 'acoes' }, acoesDeAbertura(dados, estado, true, true)),
        h('span', { id: ID_FIM_DA_LEITURA, 'aria-hidden': 'true' }))));
}

// Como marcar e pontuação ---------------------------------------------------

function tabelaFaixas(dados) {
  const faixas = dados.portes[0].score.faixas;
  return h('div', { class: 'tabela-rolagem' },
    h('table', { class: 'tabela' },
      h('caption', { class: 'visualmente-oculto' }, 'Faixas do score por porte, de 0 a 100'),
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
    h('p', { class: 'subtitulo' }, meta.como_marcar),
    h('section', { class: 'resumo-regras', 'aria-labelledby': 'titulo-marcacoes' },
      h('h2', { id: 'titulo-marcacoes' }, 'As quatro marcações'),
      h('ul', { class: 'grade-marcacoes' }, opcoes.map(o =>
        h('li', {}, h('strong', {}, o.texto), h('span', {}, o.descricao))))),
    h('div', { class: 'duas-colunas' },
    h('section', { class: 'resumo-regras', 'aria-labelledby': 'titulo-pesos' },
      h('h2', { id: 'titulo-pesos' }, 'O peso de cada pergunta'),
      h('ul', { class: 'lista-pesos' }, meta.pesos.map(p =>
        h('li', {}, h('span', { class: `peso peso--${p.peso}` }, `Peso ${p.peso} · ${p.nome}`), h('span', {}, x(p.texto)))))),
    h('section', { class: 'resumo-regras', 'aria-labelledby': 'titulo-faixas' },
      h('h2', { id: 'titulo-faixas' }, 'Faixas do score'),
      h('p', {}, 'A pequena empresa soma os pontos de todas as perguntas. A média e a grande dão um peso a cada pilar e aplicam pisos e travas. O detalhe do seu porte aparece quando você o escolher.'),
      tabelaFaixas(dados),
      h('p', { class: 'nota' }, 'Pesos, faixas, travas e prazos são desenho deste material, não exigências legais.'))),
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
    h('div', { class: 'blocos-em-colunas' },
      meta.contexto_legal.map(bloco => h('section', { class: 'bloco' }, h('h2', {}, bloco.titulo), lista(bloco.itens.map(x), 'lista-fontes')))),
    h('section', { class: 'bloco' },
      h('h2', {}, 'Fontes'),
      h('div', { class: 'blocos-em-colunas' },
        h('div', {}, blocoFontes('Documentos de base', meta.fontes.base)),
        h('div', {}, blocoFontes('Pesquisa complementar', meta.fontes.complementar)),
        h('div', {}, blocoFontes('O que verificar antes de decidir', meta.fontes.verificar)))),
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

function explicacaoDaOpcao(pergunta, opcao, x) {
  const especifica = pergunta.marcacoes?.[opcao.id];
  if (!especifica) return [h('strong', {}, opcao.texto), ' ', opcao.descricao];
  return [
    h('span', { class: 'explicacao__titulo' }, `Marcar ${opcao.texto} nesta pergunta quer dizer:`),
    h('span', { class: 'explicacao__texto' }, x(especifica)),
    h('span', { class: 'explicacao__criterio' }, `Critério geral: ${opcao.descricao}`),
  ];
}

function renderUnica(dados, pergunta, resposta, x) {
  const opcoes = pergunta.opcoes ?? dados.opcoes;
  return h('div', { class: 'opcoes' }, opcoes.map(o => {
    const idPopover = `${pergunta.id}-${o.id}-explica`;
    return h('div', { class: 'opcao' },
      h('label', { class: 'opcao__rotulo' },
        h('input', { type: 'radio', name: pergunta.id, value: o.id, checked: resposta === o.id, 'aria-describedby': idPopover }),
        h('span', { class: 'opcao__marca', 'aria-hidden': 'true' }),
        h('span', { class: 'opcao__texto' }, o.texto)),
      botaoInfo(idPopover, o.texto),
      h('div', { class: 'explicacao', id: idPopover, popover: 'auto' }, explicacaoDaOpcao(pergunta, o, x)));
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
    h('div', { class: 'pergunta__lado' },
    h('div', { class: 'pilar' },
      h('span', { class: 'pilar__letra', 'aria-hidden': 'true' }, secao.id),
      h('p', { class: 'pilar__nome', tabindex: '-1' }, h('span', {}, `Pilar ${secaoIndice + 1} de ${dados.secoes.length}`), ` ${secao.titulo}`)),
    primeiraDaSecao && h('p', { class: 'ponte' }, secao.ponte),
    h('div', { class: 'contexto' },
      h('h2', {}, 'Contexto e impacto'),
      h('p', {}, contexto),
      h('p', { class: 'base' }, `Base: ${pergunta.base}`))),
    h('div', { class: 'pergunta__principal' },
    h('fieldset', {},
      h('legend', {},
        h('span', { class: 'pergunta__meta' }, `${pergunta.id} · Pergunta ${estado.posicao + 1} de ${perguntas.length}`),
        h('h1', { class: 'pergunta__texto' }, enunciado)),
      h('p', { class: `peso peso--${pergunta.peso}` }, `Peso ${pergunta.peso} · ${pergunta.classe}`),
      renderizar(dados, pergunta, resposta, x)),
    h('p', { class: 'reflita' }, h('strong', {}, 'Reflita. '), reflita),
    h('div', { class: 'navegacao' },
      botao('Voltar', 'voltar'),
      h('button', { type: 'submit', class: 'botao botao--primario', 'data-botao': 'avancar' }, resposta ? 'Próxima' : 'Pular'))),
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
      puladas > 0 ? ` ${plural(puladas, 'ficou sem resposta e não entra', 'ficaram sem resposta e não entram')} no score. Você pode voltar e responder agora.` : ''),
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
