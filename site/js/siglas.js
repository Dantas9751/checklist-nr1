// Escreve siglas por extenso na primeira vez que aparecem numa tela: "Nome (SIGLA)".

const escapar = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CHAVE_NORMAS = 'NR';

function dentroDeParenteses(texto, posicao) {
  const antes = texto.slice(0, posicao);
  return antes.split('(').length > antes.split(')').length;
}

export function criarExpansor({ itens, normas, ignorar_apos: ignorarApos = [] }) {
  const vistas = new Set();
  const nomes = Object.keys(itens).sort((a, b) => b.length - a.length).map(escapar);
  const padrao = new RegExp(`(?<![\\p{L}\\d-])(NR-(\\d+)|NR|${nomes.join('|')})(?![\\p{L}\\d])`, 'gu');

  const nomeDe = (sigla, numero) => {
    if (sigla.startsWith('NR')) return numero ? normas.singular.replace('{n}', numero) : normas.plural;
    return itens[sigla];
  };

  return function expandir(texto) {
    if (!texto) return texto;
    return texto.replace(padrao, (sigla, _grupo, numero, posicao) => {
      const chave = sigla.startsWith('NR') ? CHAVE_NORMAS : sigla;
      const nome = nomeDe(sigla, numero);
      const antes = texto.slice(0, posicao);
      const depois = texto.slice(posicao + sigla.length);
      if (vistas.has(chave) || ignorarApos.some(p => antes.endsWith(p))) return sigla;
      vistas.add(chave);
      if (depois.toLowerCase().startsWith(` (${nome.toLowerCase()}`)) return sigla;
      return dentroDeParenteses(texto, posicao) ? `${nome}, ${sigla}` : `${nome} (${sigla})`;
    });
  };
}
