// Relatório final: texto do resumo (puro, testável) e renderização da tela.
import { perguntasDoPorte, opcaoEscolhida, pontosFortesEFracos, lacunasPrioritarias } from './score.js';
import { h, porteDe } from './render.js';

const STATUS_DA_FAIXA = { conformidade: 'bom', atencao: 'atencao', exposta: 'serio', critica: 'critico' };
const SVG = 'http://www.w3.org/2000/svg';

const formatarData = data => data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatarPontos = valor => valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const notaDaSecao = s => (s.score === null ? 'sem resposta aplicável' : `${s.score}%`);

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
};

function iconeStatus(status) {
  return svg('svg', { viewBox: '0 0 24 24', class: 'icone-status', 'aria-hidden': 'true' },
    svg('circle', { cx: '12', cy: '12', r: '10' }),
    svg('path', { d: ICONES_STATUS[status] }));
}

function seloFaixa(faixa) {
  const status = STATUS_DA_FAIXA[faixa.id];
  return h('p', { class: `selo-faixa selo-faixa--${status}` }, iconeStatus(status), h('span', {}, `Faixa: ${faixa.titulo}`));
}

function anelScore(valor) {
  return h('div', { class: 'anel', role: 'img', 'aria-label': `Score ${valor} de 100` },
    svg('svg', { viewBox: '0 0 120 120', 'aria-hidden': 'true' },
      svg('circle', { class: 'anel__trilho', cx: '60', cy: '60', r: '52', pathLength: '100' }),
      svg('circle', { class: 'anel__valor', cx: '60', cy: '60', r: '52', pathLength: '100', 'stroke-dasharray': `${valor} 100` })),
    h('span', { class: 'anel__numero', 'aria-hidden': 'true' }, String(valor), h('small', {}, 'de 100')));
}

// Blocos do relatório -------------------------------------------------------

function blocoResultado(porte, resultado) {
  const { faixa, faixaDoNumero, travas } = resultado;
  const limitada = faixa.id !== faixaDoNumero.id;
  return h('section', { class: 'bloco resultado', 'aria-labelledby': 'titulo-resultado' },
    h('h2', { id: 'titulo-resultado', class: 'visualmente-oculto' }, 'Resultado'),
    anelScore(resultado.geral),
    h('div', { class: 'resultado__texto' },
      h('p', { class: 'resultado__sigla' }, porte.score.nome),
      seloFaixa(faixa),
      h('p', { class: 'resultado__resumo' }, faixa.resumo),
      limitada && h('p', { class: 'nota' },
        `Pela nota, a faixa seria ${faixaDoNumero.titulo}. Ela foi limitada por trava: `,
        travas.map(t => t.motivo).join('; '), '.')));
}

function linhaSecao(secao, peso, destaque) {
  const largura = secao.score ?? 0;
  return h('li', { class: `secao-nota${destaque ? ` secao-nota--${destaque.tipo}` : ''}` },
    h('span', { class: 'secao-nota__nome' }, h('span', { class: 'secao-nota__letra' }, secao.id), secao.titulo),
    h('span', { class: 'secao-nota__valor' }, notaDaSecao(secao)),
    h('span', { class: 'secao-nota__trilho', 'aria-hidden': 'true' },
      h('span', { class: 'secao-nota__barra', style: `width: ${largura}%` })),
    h('span', { class: 'secao-nota__detalhe' },
      secao.score === null ? 'Todas as perguntas ficaram sem resposta ou N/A.' :
        `${formatarPontos(secao.obtidos)} de ${formatarPontos(secao.aplicaveis)} pontos`,
      peso ? ` · peso do pilar ${peso}` : '',
      destaque ? h('span', { class: 'secao-nota__destaque' }, destaque.rotulo) : ''));
}

function blocoSecoes(porte, resultado) {
  const { fortes, fracos } = pontosFortesEFracos(resultado);
  const destaqueDe = id => {
    if (fracos.some(s => s.id === id)) return { tipo: 'fraco', rotulo: 'Precisa de atenção' };
    if (fortes.some(s => s.id === id)) return { tipo: 'forte', rotulo: 'Ponto forte' };
    return null;
  };
  return h('section', { class: 'bloco', 'aria-labelledby': 'titulo-secoes' },
    h('h2', { id: 'titulo-secoes' }, 'Nota por pilar'),
    h('p', { class: 'nota' }, porte.score.modelo === 'pilares' ?
      'O score geral é a média dos pilares ponderada pelo peso de cada um.' :
      'O score geral é a soma dos pontos obtidos dividida pelos pontos aplicáveis, sem peso por pilar.'),
    h('ul', { class: 'secoes-notas' },
      resultado.porSecao.map(s => linhaSecao(s, porte.score.pesos_secoes?.[s.id], destaqueDe(s.id)))));
}

function itemLacuna({ pergunta, opcao }) {
  return h('li', {},
    h('span', { class: 'lacuna__meta' }, `${pergunta.id} · ${opcao.texto} · Peso ${pergunta.peso}`),
    h('span', {}, pergunta.texto));
}

function blocoProximosPassos(dados, porte, respostas, resultado) {
  const lacunas = lacunasPrioritarias(dados, porte.id, respostas);
  const { fracos } = pontosFortesEFracos(resultado);
  const perguntas = perguntasDoPorte(dados, porte.id);
  const lacunasDaSecao = secao => perguntas
    .map(q => ({ pergunta: q, opcao: opcaoEscolhida(dados, q, respostas) }))
    .filter(({ pergunta, opcao }) => pergunta.secaoId === secao.id && opcao && opcao.pontos !== null && opcao.pontos < 100);

  return h('section', { class: 'bloco', 'aria-labelledby': 'titulo-passos' },
    h('h2', { id: 'titulo-passos' }, 'Próximos passos'),
    h('ul', { class: 'passos-faixa' }, resultado.faixa.proximos_passos.map(p => h('li', {}, p))),
    h('p', {}, h('strong', {}, 'Prazo sugerido: '), resultado.faixa.prazo, '.'),
    lacunas.length > 0 && [
      h('h3', {}, `As ${lacunas.length} maiores lacunas`),
      h('p', { class: 'nota' }, porte.priorizacao.texto),
      h('ol', { class: 'lacunas' }, lacunas.map(itemLacuna)),
    ],
    fracos.length > 0 && [
      h('h3', {}, 'Pilares que precisam de atenção'),
      fracos.map(secao => h('div', { class: 'pilar-fraco' },
        h('h4', {}, `${secao.id} · ${secao.titulo} (${secao.score}%)`),
        h('ul', { class: 'lacunas' }, lacunasDaSecao(secao).map(itemLacuna)))),
    ],
    porte.indicadores && h('div', { class: 'indicadores' },
      h('h3', {}, porte.indicadores.titulo),
      h('ul', {}, porte.indicadores.itens.map(i => h('li', {}, i))),
      h('p', { class: 'nota' }, porte.indicadores.nota)),
    h('p', { class: 'nota' }, dados.meta.prazos_nota));
}

function blocoRespostas(dados, porte, respostas) {
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
          h('span', {}, q.texto),
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

function rodape(dados) {
  const { meta } = dados;
  return h('footer', { class: 'rodape' },
    h('p', {}, `Gerado em ${formatarData(new Date())}. Suas respostas ficaram só neste navegador; nada foi enviado.`),
    h('p', {}, 'Pesos, faixas, travas e prazos vêm do material original. ', meta.encerramento),
    h('p', {}, meta.aviso),
    h('details', { class: 'recolhivel' },
      h('summary', {}, 'Fontes e o que verificar antes de decidir'),
      h('h3', {}, 'Documentos de base'), h('ul', {}, meta.fontes.base.map(f => h('li', {}, f))),
      h('h3', {}, 'Pesquisa complementar'), h('ul', {}, meta.fontes.complementar.map(f => h('li', {}, f))),
      h('h3', {}, 'O que verificar'), h('ul', {}, meta.fontes.verificar.map(f => h('li', {}, f)))));
}

export function renderRelatorio(dados, porteId, respostas, resultado) {
  const porte = porteDe(dados, porteId);
  const cabecalho = h('div', { class: 'cabecalho-relatorio' },
    h('h1', { id: 'titulo-relatorio', tabindex: '-1' }, 'Seu relatório'),
    h('p', { class: 'subtitulo' }, `Checklist NR-1 · Porte ${porte.nome} · ${formatarData(new Date())}`));

  if (resultado.geral === null) {
    return [cabecalho,
      h('p', {}, 'Ainda não há respostas que entrem no score. Responda ao menos uma pergunta com Atende, Parcial ou Não atende.'),
      h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'botao botao--primario', 'data-acao': 'editar', 'data-posicao': '0' }, 'Responder perguntas'))];
  }
  return [
    cabecalho,
    blocoResultado(porte, resultado),
    blocoAcoes(),
    blocoSecoes(porte, resultado),
    blocoProximosPassos(dados, porte, respostas, resultado),
    blocoRespostas(dados, porte, respostas),
    rodape(dados),
  ];
}
