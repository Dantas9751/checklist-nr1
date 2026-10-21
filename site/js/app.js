// Orquestração: carrega os dados, liga estado, renderização e score aos eventos da página.
import {
  criarEstado, carregar, salvar, limpar, escolherPorte, responder, avancar, voltar, irPara, progresso,
} from './estado.js';
import { renderBoasVindas, renderPorte, detalhePorte, renderPergunta, renderRevisao, porteDe } from './render.js';
import { renderRelatorio, textoResumo } from './relatorio.js';
import { perguntasDoPorte, calcularScore } from './score.js';

const URL_DADOS = 'data/questionario.json';
const CHAVE_TEMA = 'checklist-nr1:tema';
const TEMAS = [
  { id: 'auto', nome: 'automático' },
  { id: 'light', nome: 'claro' },
  { id: 'dark', nome: 'escuro' },
];
const ORDEM_ETAPAS = ['boas-vindas', 'porte', 'perguntas', 'revisao', 'relatorio'];
const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

let dados;
let estado;

const $ = seletor => document.querySelector(seletor);
const regiaoDa = etapa => document.getElementById(`etapa-${etapa}`);

function anunciar(texto) {
  const regiao = $('#anuncio');
  regiao.textContent = '';
  requestAnimationFrame(() => { regiao.textContent = texto; });
}

function atualizar(novoEstado, { focar = true } = {}) {
  const anterior = estado;
  estado = novoEstado;
  salvar(estado);
  render(anterior, focar);
}

// Renderização --------------------------------------------------------------

const CONTEUDO_DA_ETAPA = {
  'boas-vindas': () => renderBoasVindas(dados, estado),
  porte: () => renderPorte(dados, estado),
  perguntas: () => renderPergunta(dados, estado),
  revisao: () => renderRevisao(dados, estado),
  relatorio: () => renderRelatorio(dados, estado.porteId, estado.respostas, calcularScore(dados, estado.porteId, estado.respostas)),
};

function direcaoDaTransicao(anterior) {
  if (!anterior) return 0;
  const diferencaEtapa = ORDEM_ETAPAS.indexOf(estado.etapa) - ORDEM_ETAPAS.indexOf(anterior.etapa);
  return Math.sign(diferencaEtapa || estado.posicao - anterior.posicao);
}

function animarEntrada(el, direcao) {
  if (direcao === 0) return;
  const deslocamento = movimentoReduzido.matches ? 0 : direcao * 24;
  el.animate(
    [{ opacity: 0, transform: `translateX(${deslocamento}px)` }, { opacity: 1, transform: 'none' }],
    { duration: movimentoReduzido.matches ? 120 : 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  );
}

function render(anterior, focar) {
  for (const regiao of document.querySelectorAll('.etapa')) regiao.hidden = regiao.dataset.etapa !== estado.etapa;
  const regiao = regiaoDa(estado.etapa);
  regiao.getAnimations().forEach(a => a.cancel());
  regiao.replaceChildren(...[CONTEUDO_DA_ETAPA[estado.etapa]()].flat(Infinity));
  atualizarBarra();
  animarEntrada(regiao, direcaoDaTransicao(anterior));
  if (focar) regiao.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
  if (focar) window.scrollTo({ top: 0, behavior: movimentoReduzido.matches ? 'auto' : 'smooth' });
}

function atualizarBarra() {
  const barra = $('.progresso');
  const contexto = $('#barra-contexto');
  const comPorte = ['perguntas', 'revisao'].includes(estado.etapa) && estado.porteId;
  barra.hidden = !comPorte;
  contexto.textContent = '';
  if (!comPorte) return;

  const total = perguntasDoPorte(dados, estado.porteId).length;
  const respondidas = Object.keys(estado.respostas).length;
  const porcentagem = progresso(estado, dados);
  barra.setAttribute('aria-valuenow', String(porcentagem));
  barra.setAttribute('aria-valuetext', `${respondidas} de ${total} perguntas respondidas`);
  barra.style.setProperty('--progresso', `${porcentagem}%`);
  contexto.textContent = `${porteDe(dados, estado.porteId).nome} · ${respondidas} de ${total}`;
}

// Tema ----------------------------------------------------------------------

function lerTema() {
  try {
    return localStorage.getItem(CHAVE_TEMA) ?? 'auto';
  } catch {
    return 'auto';
  }
}

function aplicarTema(id) {
  const tema = TEMAS.find(t => t.id === id) ?? TEMAS[0];
  if (tema.id === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = tema.id;
  const botao = $('[data-acao="tema"]');
  botao.setAttribute('aria-label', `Tema: ${tema.nome}`);
  botao.title = `Tema: ${tema.nome}`;
  try {
    localStorage.setItem(CHAVE_TEMA, tema.id);
  } catch {
    // Preferência só vale nesta visita.
  }
  return tema;
}

// Ações ---------------------------------------------------------------------

async function copiarResumo() {
  const texto = textoResumo(dados, estado.porteId, calcularScore(dados, estado.porteId, estado.respostas), new Date());
  try {
    await navigator.clipboard.writeText(texto);
    anunciar('Resumo copiado.');
  } catch {
    anunciar('Não deu para copiar automaticamente. Selecione o texto do relatório e copie manualmente.');
  }
}

const ACOES = {
  inicio: () => atualizar(irPara(estado, 'boas-vindas')),
  comecar: () => atualizar(irPara(estado, 'porte')),
  continuar: () => atualizar(irPara(estado, 'perguntas')),
  'trocar-porte': () => atualizar(irPara(estado, 'porte')),
  voltar: () => atualizar(voltar(estado)),
  editar: botao => atualizar(irPara(estado, 'perguntas', Number(botao.dataset.posicao))),
  relatorio: () => atualizar(irPara(estado, 'relatorio')),
  revisar: () => atualizar(irPara(estado, 'revisao')),
  imprimir: () => window.print(),
  copiar: () => copiarResumo(),
  refazer: () => {
    if (!window.confirm('Apagar todas as respostas e começar de novo?')) return;
    limpar();
    atualizar(criarEstado());
  },
  tema: () => {
    const atual = TEMAS.findIndex(t => t.id === lerTema());
    anunciar(`Tema ${aplicarTema(TEMAS[(atual + 1) % TEMAS.length].id).nome}.`);
  },
};

function aoClicar(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (botao) ACOES[botao.dataset.acao]?.(botao);
}

function aoMudar(evento) {
  const campo = evento.target;
  if (campo.name === 'porte') {
    $('#detalhe-porte').replaceChildren(detalhePorte(dados, estado, campo.value));
    campo.form.querySelector('[type="submit"]').disabled = false;
    return;
  }
  if (campo.form?.dataset.form === 'pergunta') {
    estado = responder(estado, campo.name, campo.value);
    salvar(estado);
    campo.form.querySelector('[data-botao="avancar"]').textContent = 'Próxima';
    atualizarBarra();
  }
}

function aoEnviar(evento) {
  const form = evento.target;
  evento.preventDefault();
  if (form.dataset.form === 'porte') {
    const escolhido = form.querySelector('input[name="porte"]:checked');
    if (escolhido) atualizar(escolherPorte(estado, dados, escolhido.value));
  }
  if (form.dataset.form === 'pergunta') atualizar(avancar(estado, dados));
}

function aoTeclar(evento) {
  const campo = evento.target;
  if (evento.key !== 'Enter' || campo.type !== 'radio' || !campo.form) return;
  evento.preventDefault();
  campo.form.requestSubmit();
}

// Início --------------------------------------------------------------------

async function iniciar() {
  aplicarTema(lerTema());
  try {
    const resposta = await fetch(URL_DADOS);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    dados = await resposta.json();
  } catch (erro) {
    $('#conteudo').replaceChildren(
      Object.assign(document.createElement('p'), {
        className: 'aviso-js',
        textContent: `Não foi possível carregar o questionário (${erro.message}). Abra o site por um servidor (por exemplo, python3 -m http.server) e recarregue a página.`,
      }),
    );
    return;
  }
  const salvo = carregar();
  estado = salvo.porteId && !porteDe(dados, salvo.porteId) ? criarEstado() : salvo;
  document.addEventListener('click', aoClicar);
  document.addEventListener('change', aoMudar);
  document.addEventListener('submit', aoEnviar);
  document.addEventListener('keydown', aoTeclar);
  render(null, false);
}

iniciar();
