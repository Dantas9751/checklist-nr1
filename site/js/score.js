// Motor de score: funções puras, sem DOM. Regras descritas em data/schema.md.

const EPSILON = 1e-9;
const PESO_CRITICO = 3;

// Arredonda para baixo: na dúvida, a nota não sobe de faixa (ver docs/DUVIDAS.md).
const arredondar = valor => Math.floor(valor + EPSILON);

const porteDe = (dados, porteId) => dados.portes.find(p => p.id === porteId);

const valeParaPorte = (pergunta, porteId) => !pergunta.portes || pergunta.portes.includes(porteId);

export function perguntasDoPorte(dados, porteId) {
  return dados.secoes.flatMap(secao =>
    secao.perguntas
      .filter(q => valeParaPorte(q, porteId))
      .map(q => ({ ...q, secaoId: secao.id })),
  );
}

export function opcaoEscolhida(dados, pergunta, respostas) {
  const opcoes = pergunta.opcoes ?? dados.opcoes;
  return opcoes.find(o => o.id === respostas[pergunta.id]) ?? null;
}

function pontuarSecao(dados, secao, perguntas, respostas) {
  let obtidos = 0;
  let aplicaveis = 0;
  let respondidas = 0;
  for (const q of perguntas) {
    const opcao = opcaoEscolhida(dados, q, respostas);
    if (opcao) respondidas++;
    if (!q.pontua || !opcao || opcao.pontos === null) continue;
    obtidos += (q.peso * opcao.pontos) / 100;
    aplicaveis += q.peso;
  }
  const scoreExato = aplicaveis > 0 ? (obtidos / aplicaveis) * 100 : null;
  return {
    id: secao.id,
    titulo: secao.titulo,
    score: scoreExato === null ? null : arredondar(scoreExato),
    scoreExato,
    obtidos,
    aplicaveis,
    respondidas,
    total: perguntas.length,
  };
}

function scoreGeral(regras, secoes) {
  const aplicaveis = secoes.filter(s => s.scoreExato !== null);
  if (aplicaveis.length === 0) return null;
  if (regras.modelo === 'simples') {
    const obtidos = aplicaveis.reduce((soma, s) => soma + s.obtidos, 0);
    const pontos = aplicaveis.reduce((soma, s) => soma + s.aplicaveis, 0);
    return arredondar((obtidos / pontos) * 100);
  }
  const pesos = regras.pesos_secoes;
  const somaPesos = aplicaveis.reduce((soma, s) => soma + pesos[s.id], 0);
  const contribuicoes = aplicaveis.reduce((soma, s) => soma + s.scoreExato * pesos[s.id], 0);
  return arredondar(contribuicoes / somaPesos);
}

export function faixaDoScore(dados, porteId, valor) {
  if (valor === null) return null;
  return porteDe(dados, porteId).score.faixas.find(f => valor >= f.min) ?? null;
}

function travasAtivas(dados, porteId, respostas, secoes) {
  const regras = porteDe(dados, porteId).score;
  const melhorFaixaAbaixo = regras.faixas[1].id;
  const travas = [];

  const criticosEmFalta = perguntasDoPorte(dados, porteId).filter(
    q => q.pontua && q.peso === PESO_CRITICO && opcaoEscolhida(dados, q, respostas)?.pontos === 0,
  );
  for (const regra of regras.travas_peso3 ?? []) {
    if (criticosEmFalta.length >= regra.a_partir_de) {
      travas.push({
        motivo: `${criticosEmFalta.length === 1 ? '1 item' : `${criticosEmFalta.length} itens`} de peso 3 em Não atende (${criticosEmFalta.map(q => q.id).join(', ')})`,
        faixaMaxima: regra.faixa_maxima,
      });
    }
  }

  const avaliadas = secoes.filter(s => s.score !== null);
  const abaixoDoPiso = avaliadas.filter(s => regras.piso_secao !== null && s.score < regras.piso_secao);
  if (abaixoDoPiso.length > 0) {
    travas.push({
      motivo: `Pilar abaixo do piso de ${regras.piso_secao}% (${abaixoDoPiso.map(s => s.id).join(', ')})`,
      faixaMaxima: melhorFaixaAbaixo,
    });
  }

  const regraSecao = regras.trava_secao;
  const secaoVigiada = regraSecao && avaliadas.find(s => s.id === regraSecao.secao);
  if (secaoVigiada && secaoVigiada.score < regraSecao.abaixo_de) {
    travas.push({
      motivo: `Pilar ${regraSecao.secao} abaixo de ${regraSecao.abaixo_de}%`,
      faixaMaxima: regraSecao.faixa_maxima,
    });
  }
  return travas;
}

function aplicarTravas(faixas, faixa, travas) {
  if (!faixa) return null;
  const posicao = id => faixas.findIndex(f => f.id === id);
  const pior = Math.max(posicao(faixa.id), ...travas.map(t => posicao(t.faixaMaxima)));
  return faixas[pior];
}

export function calcularScore(dados, porteId, respostas) {
  const regras = porteDe(dados, porteId).score;
  const perguntas = perguntasDoPorte(dados, porteId);
  const porSecao = dados.secoes
    .map(secao => ({ secao, perguntas: perguntas.filter(q => q.secaoId === secao.id) }))
    .filter(({ perguntas: lista }) => lista.length > 0)
    .map(({ secao, perguntas: lista }) => pontuarSecao(dados, secao, lista, respostas));

  const geral = scoreGeral(regras, porSecao);
  const faixaDoNumero = faixaDoScore(dados, porteId, geral);
  const travas = geral === null ? [] : travasAtivas(dados, porteId, respostas, porSecao);
  return {
    porteId,
    geral,
    porSecao,
    respondidas: porSecao.reduce((soma, s) => soma + s.respondidas, 0),
    total: perguntas.filter(q => q.pontua).length,
    faixaDoNumero,
    travas,
    faixa: aplicarTravas(regras.faixas, faixaDoNumero, travas),
  };
}

export function pontosFortesEFracos(resultado, n = 3) {
  const avaliadas = resultado.porSecao.filter(s => s.score !== null);
  const crescente = [...avaliadas].sort((a, b) => a.scoreExato - b.scoreExato);
  return {
    fortes: [...crescente].reverse().slice(0, n),
    fracos: crescente.filter(s => s.score < 100).slice(0, n),
  };
}

// Ordem do PDF: peso 3 em Não atende primeiro, depois maior peso, depois Não atende antes de Parcial,
// depois o pilar com menor %. O critério "atinge mais pessoas" fica para quem responde.
export function lacunasPrioritarias(dados, porteId, respostas) {
  const porte = porteDe(dados, porteId);
  const { porSecao } = calcularScore(dados, porteId, respostas);
  const notaDaSecao = id => porSecao.find(s => s.id === id).scoreExato;
  const lacunas = perguntasDoPorte(dados, porteId)
    .filter(q => q.pontua)
    .map(q => ({ pergunta: q, opcao: opcaoEscolhida(dados, q, respostas) }))
    .filter(({ opcao }) => opcao && opcao.pontos !== null && opcao.pontos < 100);

  const criticoEmFalta = l => (l.pergunta.peso === PESO_CRITICO && l.opcao.pontos === 0 ? 0 : 1);
  return lacunas
    .sort(
      (a, b) =>
        criticoEmFalta(a) - criticoEmFalta(b) ||
        b.pergunta.peso - a.pergunta.peso ||
        a.opcao.pontos - b.opcao.pontos ||
        notaDaSecao(a.pergunta.secaoId) - notaDaSecao(b.pergunta.secaoId),
    )
    .slice(0, porte.priorizacao.quantidade);
}
