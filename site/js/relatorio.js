// Relatório final: texto do resumo (puro, testável) e renderização da tela.
import { perguntasDoPorte, opcaoEscolhida, lacunasPrioritarias, avaliarSecoes } from './score.js';
import { h, porteDe, expansorDaTela, lista } from './render.js';

export const STATUS_DA_FAIXA = { conformidade: 'bom', atencao: 'atencao', exposta: 'serio', critica: 'critico' };
const ROTULO_DO_DESTAQUE = { fraco: 'Precisa de atenção', forte: 'Entre os mais fortes', nenhum: 'Sem destaque' };
const ICONE_DO_DESTAQUE = { fraco: 'critico', forte: 'bom', nenhum: 'neutro' };
const SVG = 'http://www.w3.org/2000/svg';

const formatarData = data => data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatarPontos = valor => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const notaDaSecao = s => (s.score === null ? 'sem resposta aplicável' : `${s.score}%`);
const statusDaFaixa = faixa => (faixa ? STATUS_DA_FAIXA[faixa.id] : 'neutro');

const HIFEN_INSEPARAVEL = '\u2011';

// Junta códigos de pergunta ("M-01, M-02 e M-03") sem deixar a linha quebrar no hífen.
function juntar(codigos) {
  const ids = codigos.map(id => id.replace('-', HIFEN_INSEPARAVEL));
  if (ids.length <= 1) return ids.join('');
  return `${ids.slice(0, -1).join(', ')} e ${ids.at(-1)}`;
}

function contarRespostas(dados, porteId, respostas) {
  const perguntas = perguntasDoPorte(dados, porteId);
  const opcoes = perguntas.map(q => opcaoEscolhida(dados, q, respostas));
  return {
    total: perguntas.length,
    respondidas: opcoes.filter(Boolean).length,
    puladas: opcoes.filter(o => !o).length,
    naoSeAplica: opcoes.filter(o => o && o.pontos === null).length,
  };
}

export function textoResumo(dados, porteId, resultado, data) {
  const porte = porteDe(dados, porteId);
  const linhas = [
    `${dados.meta.titulo}`,
    `Porte: ${porte.nome}`,
    `Data: ${formatarData(data)}`,
    '',
    `Score (${porte.score.nome}): ${resultado.geral === null ? 'sem respostas aplicáveis' : `${resultado.geral} de 100`}`,
    `Faixa: ${resultado.faixa ? resultado.faixa.titulo : 'não calculada'}`,
    ...resultado.travas.map(t => `Trava: ${t.motivo}`),
    '',
    'Notas por pilar:',
    ...resultado.porSecao.map(s => `${s.id} · ${s.titulo}: ${notaDaSecao(s)}`),
    '',
    `Perguntas respondidas: ${resultado.respondidas} de ${perguntasDoPorte(dados, porteId).length}`,
    '',
    dados.meta.rodape,
  ];
  return linhas.join('\n');
}

// Por que cada pilar recebeu a sua avaliação: o que falta (ou o que sustenta a nota), por que isso pesa
// e o efeito na nota. Os temas e impactos vêm de cada pergunta no JSON, tirados do card de contexto.
const MAX_ITENS_LISTADOS = 3;
const capitalizar = texto => texto.charAt(0).toUpperCase() + texto.slice(1);

function listarFrases(itens) {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join('; ')} e ${itens.at(-1)}`;
}

function efeitoNaNota(av, regras) {
  const frases = [`${av.score}%, ou ${formatarPontos(av.obtidos)} de ${formatarPontos(av.aplicaveis)} pontos: faixa ${av.faixa.titulo} pela régua do porte.`];
  if (av.criticosEmFalta.length > 0) frases.push('Item crítico em Não atende limita a faixa do score geral.');
  if (av.abaixoDoPiso) frases.push(`Abaixo do piso de ${regras.piso_secao}%, o score geral não pode ficar em ${regras.faixas[0].titulo}.`);
  if (av.acionaTravaDaSecao) {
    const limite = regras.faixas.find(f => f.id === regras.trava_secao.faixa_maxima).titulo;
    frases.push(`Abaixo de ${regras.trava_secao.abaixo_de}% neste pilar, a faixa geral não passa de ${limite}.`);
  }
  const outraRegra = av.criticosEmFalta.length > 0 || av.abaixoDoPiso || av.acionaTravaDaSecao;
  if (av.entreOsPiores && !outraRegra) frases.push('Está entre os 3 pilares com menor nota.');
  if (av.destaque === 'forte') frases.push('Está entre os 3 pilares com maior nota.');
  const foraDaConta = [...av.naoSeAplica, ...av.puladas];
  if (foraDaConta.length > 0) frases.push(`${juntar(foraDaConta)} ${foraDaConta.length === 1 ? 'ficou' : 'ficaram'} fora da conta (N/A ou sem resposta).`);
  return frases.join(' ');
}

export function motivosDoPilar(av, porte, dados) {
  if (av.score === null) {
    return [{ rotulo: 'Sem nota', texto: 'Nenhuma resposta deste pilar entra na nota: todas ficaram sem resposta ou N/A.' }];
  }
  const pergunta = id => dados.secoes.find(s => s.id === av.id).perguntas.find(q => q.id === id);
  const marcacao = id => (av.parciais.includes(id) ? 'Parcial' : 'Não atende');
  const lacunas = [...av.criticosEmFalta, ...av.naoAtende, ...av.parciais];
  const partes = [];

  if (lacunas.length > 0) {
    const itens = lacunas.slice(0, MAX_ITENS_LISTADOS).map(id => `${pergunta(id).tema}, em ${marcacao(id)} (${juntar([id])})`);
    const resto = lacunas.length - itens.length;
    partes.push({ rotulo: 'O que falta', texto: `${capitalizar(listarFrases(itens))}${resto > 0 ? `, e mais ${resto}` : ''}.` });
    partes.push({ rotulo: 'Por que pesa', texto: pergunta(lacunas[0]).impacto });
  } else {
    const porPeso = [...av.atendidas].sort((a, b) => pergunta(b).peso - pergunta(a).peso);
    const destaques = porPeso.slice(0, MAX_ITENS_LISTADOS);
    const itens = destaques.map(id => pergunta(id).tema);
    partes.push({ rotulo: 'O que sustenta', texto: `${capitalizar(listarFrases(itens))}: em Atende, com evidência (${juntar(destaques)}).` });
    partes.push({ rotulo: 'Por que conta', texto: pergunta(porPeso[0]).impacto });
  }
  partes.push({ rotulo: 'Efeito na nota', texto: efeitoNaNota(av, porte.score) });
  return partes;
}

// Peças visuais -------------------------------------------------------------

function svg(tag, atributos = {}, ...filhos) {
  const el = document.createElementNS(SVG, tag);
  for (const [nome, valor] of Object.entries(atributos)) el.setAttribute(nome, valor);
  el.append(...filhos);
  return el;
}

const ICONES_STATUS = {
  bom: 'M7 12.5l3.2 3.2L17 9',
  atencao: 'M12 8v5M12 16.5v.01',
  serio: 'M12 7.5v6M12 16.5v.01',
  critico: 'M8.5 8.5l7 7M15.5 8.5l-7 7',
  neutro: 'M8 12h8',
};

function iconeStatus(status) {
  return svg('svg', { viewBox: '0 0 24 24', class: 'icone-status', 'aria-hidden': 'true' },
    svg('circle', { cx: '12', cy: '12', r: '10' }),
    svg('path', { d: ICONES_STATUS[status] }));
}

function seloFaixa(faixa) {
  const status = STATUS_DA_FAIXA[faixa.id];
  return h('p', { class: `selo-faixa status--${status}` }, iconeStatus(status), h('span', {}, `Faixa: ${faixa.titulo}`));
}

function anelScore(valor, faixa) {
  return h('div', { class: `anel status--${statusDaFaixa(faixa)}`, role: 'img', 'aria-label': `Score ${valor} de 100, faixa ${faixa.titulo}` },
    svg('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' },
      svg('circle', { class: 'anel__trilho', cx: '60', cy: '60', r: '52', pathLength: '100' }),
      svg('circle', { class: 'anel__valor', cx: '60', cy: '60', r: '52', pathLength: '100', 'stroke-dasharray': `${valor} 100` })),
    h('span', { class: 'anel__numero', 'aria-hidden': 'true' }, String(valor), h('small', {}, 'de 100')));
}

// Blocos do relatório -------------------------------------------------------

function blocoResultado(porte, resultado, x) {
  const { faixa, faixaDoNumero, travas } = resultado;
  const limitada = faixa.id !== faixaDoNumero.id;
  return h('section', { class: 'bloco resultado', 'aria-labelledby': 'titulo-resultado' },
    h('h2', { id: 'titulo-resultado', class: 'visualmente-oculto' }, 'Resultado'),
    anelScore(resultado.geral, faixa),
    h('div', { class: 'resultado__texto' },
      h('p', { class: 'resultado__sigla' }, porte.score.nome),
      seloFaixa(faixa),
      h('p', { class: 'resultado__resumo' }, x(faixa.resumo)),
      limitada && h('p', { class: 'nota' },
        `Pela nota, a faixa seria ${faixaDoNumero.titulo}. Ela foi limitada por trava: `,
        travas.map(t => t.motivo).join('; '), '.')));
}

function linhaPilar(av, porte, dados, x) {
  const destaque = av.destaque ?? 'nenhum';
  const peso = porte.score.pesos_secoes?.[av.id];
  return h('tr', { class: `pilar-linha pilar-linha--${destaque}` },
    h('th', { scope: 'row' },
      h('span', { class: 'pilar-linha__letra' }, av.id), ' ', av.titulo,
      peso ? h('span', { class: 'pilar-linha__peso' }, `Peso do pilar: ${peso}`) : null),
    h('td', { 'data-rotulo': 'Nota' },
      h('span', { class: 'pilar-linha__valor' }, notaDaSecao(av)),
      h('span', { class: `barra-nota status--${statusDaFaixa(av.faixa)}`, 'aria-hidden': 'true' },
        h('span', { class: 'barra-nota__valor', style: `width: ${av.score ?? 0}%` }))),
    h('td', { 'data-rotulo': 'Avaliação' },
      h('span', { class: `selo-pilar status--${ICONE_DO_DESTAQUE[destaque]}` },
        iconeStatus(ICONE_DO_DESTAQUE[destaque]), ROTULO_DO_DESTAQUE[destaque])),
    h('td', { 'data-rotulo': 'Por quê', class: 'pilar-linha__motivo' },
      motivosDoPilar(av, porte, dados).map(m => h('p', {}, h('strong', {}, `${m.rotulo}. `), x(m.texto)))));
}

function blocoPilares(dados, porte, avaliacoes, x) {
  return h('section', { class: 'bloco', 'aria-labelledby': 'titulo-pilares' },
    h('h2', { id: 'titulo-pilares' }, 'Nota por pilar'),
    h('p', { class: 'nota' }, porte.score.modelo === 'pilares' ?
      'O score geral é a média dos pilares ponderada pelo peso de cada um. A cor da barra segue a régua de faixas do porte.' :
      'O score geral é a soma dos pontos obtidos dividida pelos pontos aplicáveis, sem peso por pilar. A cor da barra segue a régua de faixas do porte.'),
    h('table', { class: 'tabela tabela-pilares' },
      h('caption', { class: 'visualmente-oculto' }, 'Nota, avaliação e motivo de cada pilar'),
      h('thead', {}, h('tr', {}, ['Pilar', 'Nota', 'Avaliação', 'Por quê'].map(t => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, avaliacoes.map(av => linhaPilar(av, porte, dados, x)))));
}

function itemLacuna({ pergunta, opcao }, x) {
  return h('li', {},
    h('span', { class: 'lacuna__meta' }, `${pergunta.id} · ${opcao.texto} · Peso ${pergunta.peso}`),
    h('span', {}, x(pergunta.texto)));
}

function blocoProximosPassos(dados, porte, respostas, resultado, avaliacoes, x) {
  const lacunas = lacunasPrioritarias(dados, porte.id, respostas);
  const fracos = avaliacoes.filter(a => a.destaque === 'fraco').sort((a, b) => a.scoreExato - b.scoreExato);
  const perguntas = perguntasDoPorte(dados, porte.id);
  const lacunasDaSecao = secao => perguntas
    .map(q => ({ pergunta: q, opcao: opcaoEscolhida(dados, q, respostas) }))
    .filter(({ pergunta, opcao }) => pergunta.secaoId === secao.id && opcao && opcao.pontos !== null && opcao.pontos < 100);

  return h('section', { class: 'bloco', 'aria-labelledby': 'titulo-proximos' },
    h('h2', { id: 'titulo-proximos' }, 'Próximos passos'),
    h('ul', { class: 'passos-faixa' }, resultado.faixa.proximos_passos.map(p => h('li', {}, x(p)))),
    h('p', {}, h('strong', {}, 'Prazo sugerido: '), resultado.faixa.prazo, '.'),
    lacunas.length > 0 && [
      h('h3', {}, `As ${lacunas.length} maiores lacunas`),
      h('p', { class: 'nota' }, x(porte.priorizacao.texto)),
      h('ol', { class: 'lacunas' }, lacunas.map(l => itemLacuna(l, x))),
    ],
    fracos.length > 0 && [
      h('h3', {}, 'Pilares que precisam de atenção'),
      h('div', { class: 'pilares-fracos' }, fracos.map(secao => h('div', { class: 'pilar-fraco' },
        h('h4', {}, `${secao.id} · ${secao.titulo} (${secao.score}%)`),
        h('ul', { class: 'lacunas' }, lacunasDaSecao(secao).map(l => itemLacuna(l, x)))))),
    ],
    porte.indicadores && h('div', { class: 'indicadores' },
      h('h3', {}, porte.indicadores.titulo),
      lista(porte.indicadores.itens.map(x)),
      h('p', { class: 'nota' }, x(porte.indicadores.nota))),
    h('p', { class: 'nota' }, dados.meta.prazos_nota));
}

function blocoRespostas(dados, porte, respostas, x) {
  const contagem = contarRespostas(dados, porte.id, respostas);
  const perguntas = perguntasDoPorte(dados, porte.id);
  return h('section', { class: 'bloco', 'aria-labelledby': 'titulo-respostas' },
    h('h2', { id: 'titulo-respostas' }, 'Suas respostas'),
    h('dl', { class: 'resumo-respostas' },
      h('div', {}, h('dt', {}, 'Porte'), h('dd', {}, porte.nome)),
      h('div', {}, h('dt', {}, 'Respondidas'), h('dd', {}, `${contagem.respondidas} de ${contagem.total}`)),
      h('div', {}, h('dt', {}, 'Puladas'), h('dd', {}, String(contagem.puladas))),
      h('div', {}, h('dt', {}, 'N/A'), h('dd', {}, String(contagem.naoSeAplica)))),
    dados.secoes.map(secao => {
      const daSecao = perguntas.filter(q => q.secaoId === secao.id);
      return h('details', { class: 'recolhivel' },
        h('summary', {}, `${secao.id} · ${secao.titulo}`),
        h('ul', { class: 'respostas-lista' }, daSecao.map(q => h('li', {},
          h('span', { class: 'respostas-lista__codigo' }, q.id),
          h('span', {}, x(q.texto)),
          h('strong', {}, opcaoEscolhida(dados, q, respostas)?.texto ?? 'Sem resposta')))));
    }));
}

function blocoAcoes() {
  return h('div', { class: 'acoes acoes--relatorio' },
    h('button', { type: 'button', class: 'botao botao--primario', 'data-acao': 'imprimir' }, 'Baixar relatório'),
    h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'copiar' }, 'Copiar resumo'),
    h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'revisar' }, 'Revisar respostas'),
    h('button', { type: 'button', class: 'botao botao--secundario', 'data-acao': 'refazer' }, 'Refazer'));
}

function rodape(dados, x) {
  const { meta } = dados;
  return h('footer', { class: 'rodape' },
    h('p', {}, `Gerado em ${formatarData(new Date())}. Suas respostas ficaram só neste navegador; nada foi enviado.`),
    h('p', {}, 'Pesos, faixas, travas e prazos vêm do material original. ', x(meta.encerramento)),
    h('p', {}, x(meta.aviso)),
    h('p', { class: 'rodape__contexto' }, 'Documentos usados, pesquisa complementar e o que conferir antes de decidir: ',
      h('a', { href: '#contexto-legal', class: 'link-pagina', 'data-acao': 'contexto' }, 'Contexto legal e fontes'), '.'));
}

export function renderRelatorio(dados, porteId, respostas, resultado) {
  const porte = porteDe(dados, porteId);
  const x = expansorDaTela(dados);
  const cabecalho = h('div', { class: 'cabecalho-relatorio' },
    h('h1', { id: 'titulo-relatorio', tabindex: '-1' }, 'Seu relatório'),
    h('p', { class: 'subtitulo' }, `Checklist NR-1 · Porte ${porte.nome} · ${formatarData(new Date())}`));

  if (resultado.geral === null) {
    return [cabecalho,
      h('p', {}, 'Ainda não há respostas que entrem no score. Responda ao menos uma pergunta com Atende, Parcial ou Não atende.'),
      h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'botao botao--primario', 'data-acao': 'editar', 'data-posicao': '0' }, 'Responder perguntas'))];
  }
  const avaliacoes = avaliarSecoes(dados, porteId, respostas);
  return [
    cabecalho,
    blocoResultado(porte, resultado, x),
    blocoAcoes(),
    blocoPilares(dados, porte, avaliacoes, x),
    blocoProximosPassos(dados, porte, respostas, resultado, avaliacoes, x),
    blocoRespostas(dados, porte, respostas, x),
    rodape(dados, x),
  ];
}
