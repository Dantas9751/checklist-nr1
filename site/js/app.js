// Orquestração: carrega os dados, liga estado, renderização e score aos eventos da página.
import {
  criarEstado, carregar, salvar, limpar, escolherPorte, responder, avancar, voltar, irPara, progresso,
} from './estado.js';
import {
  renderBoasVindas, renderComoMarcar, renderContexto, renderPorte, detalhePorte, renderPergunta, renderRevisao, porteDe,
  ID_FIM_DA_LEITURA, TEMAS, renderMenuTema, renderMenuPrincipal, renderMenuFerramentas,
} from './render.js';
import { renderRelatorio, textoResumo } from './relatorio.js';
import { perguntasDoPorte, calcularScore } from './score.js';

const URL_DADOS = 'data/questionario.json';
const CHAVE_TEMA = 'checklist-nr1:tema';
const ORDEM_ETAPAS = ['boas-vindas', 'como-marcar', 'porte', 'perguntas', 'revisao', 'relatorio', 'contexto'];
const MARGEM_POPOVER = 16;
const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

let dados;
let estado;
let leituraConcluida = false;
let observadorDaLeitura = null;

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
  'boas-vindas': () => renderBoasVindas(dados, estado, { liberado: leituraConcluida }),
  'como-marcar': () => renderComoMarcar(dados),
  contexto: () => renderContexto(dados),
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
  $('.barra__link').toggleAttribute('aria-current', estado.etapa === 'contexto');
  if (estado.etapa === 'contexto') $('.barra__link').setAttribute('aria-current', 'page');
  animarEntrada(regiao, direcaoDaTransicao(anterior));
  if (focar) regiao.querySelector('[tabindex="-1"]')?.focus({ preventScroll: true });
  if (focar) window.scrollTo({ top: 0, behavior: movimentoReduzido.matches ? 'auto' : 'smooth' });
  if (estado.etapa === 'boas-vindas') vigiarLeitura();
}

// O botão Começar do topo só libera quando o fim da página inicial aparece na tela.
function liberarComeco() {
  leituraConcluida = true;
  observadorDaLeitura?.disconnect();
  for (const botao of document.querySelectorAll('[data-exige-leitura]')) {
    botao.disabled = false;
    botao.removeAttribute('aria-describedby');
  }
  const aviso = document.getElementById('aviso-leitura');
  if (aviso) aviso.textContent = 'Pronto, você já pode começar.';
}

function vigiarLeitura() {
  observadorDaLeitura?.disconnect();
  const fim = document.getElementById(ID_FIM_DA_LEITURA);
  if (leituraConcluida || !fim) return;
  observadorDaLeitura = new IntersectionObserver(entradas => {
    if (entradas.some(e => e.isIntersecting)) liberarComeco();
  });
  observadorDaLeitura.observe(fim);
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
  const botao = $('#botao-tema');
  botao.setAttribute('aria-label', `Tema: ${tema.nome}`);
  botao.title = `Tema: ${tema.nome}`;
  const opcao = document.querySelector(`input[name="tema"][value="${tema.id}"]`);
  if (opcao) opcao.checked = true;
  try {
    localStorage.setItem(CHAVE_TEMA, tema.id);
  } catch {
    // Preferência só vale nesta visita.
  }
  return tema;
}

// Confirmação ---------------------------------------------------------------

// Caixa de confirmação do próprio site: devolve true só quando a pessoa confirma.
function confirmar({ titulo, texto, rotuloConfirmar }) {
  const dialogo = $('#dialogo-confirmacao');
  $('#dialogo-titulo').textContent = titulo;
  $('#dialogo-texto').textContent = texto;
  $('#dialogo-confirmar').textContent = rotuloConfirmar;
  dialogo.returnValue = '';
  dialogo.showModal();
  return new Promise(resolver => {
    dialogo.addEventListener('close', () => resolver(dialogo.returnValue === 'confirmar'), { once: true });
  });
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
  comecar: () => atualizar(irPara(estado, 'como-marcar')),
  'como-marcar': () => atualizar(irPara(estado, 'como-marcar')),
  porte: () => atualizar(irPara(estado, 'porte')),
  continuar: () => atualizar(irPara(estado, 'perguntas')),
  contexto: () => {
    if (estado.etapa === 'contexto') return;
    atualizar({ ...irPara(estado, 'contexto'), retorno: estado.etapa });
  },
  'sair-contexto': () => atualizar(irPara(estado, estado.retorno ?? 'boas-vindas')),
  voltar: () => atualizar(voltar(estado)),
  editar: botao => atualizar(irPara(estado, 'perguntas', Number(botao.dataset.posicao))),
  relatorio: () => atualizar(irPara(estado, 'relatorio')),
  revisar: () => atualizar(irPara(estado, 'revisao')),
  imprimir: () => window.print(),
  copiar: () => copiarResumo(),
  refazer: async () => {
    const confirmado = await confirmar({
      titulo: 'Refazer o checklist?',
      texto: 'Todas as respostas deste navegador serão apagadas, e você volta para o início. Se quiser guardar o resultado, baixe o relatório antes.',
      rotuloConfirmar: 'Apagar e refazer',
    });
    if (!confirmado) return;
    limpar();
    leituraConcluida = false;
    atualizar(criarEstado());
  },
  'em-breve': () => anunciar('Esta ferramenta estará disponível em breve.'),
};

function aoClicar(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  if (botao.tagName === 'A') evento.preventDefault();
  botao.closest('.menu-flutuante')?.hidePopover();
  ACOES[botao.dataset.acao]?.(botao);
}

function aoMudar(evento) {
  const campo = evento.target;
  if (campo.name === 'tema') {
    anunciar(`Tema ${aplicarTema(campo.value).nome}.`);
    return;
  }
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
  if (form.getAttribute('method') === 'dialog') return;
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

// Popovers abrem colados ao botão que os chamou. A explicação das opções usa coordenadas da página,
// para rolar junto com o conteúdo; os menus do cabeçalho ficam fixos na tela, como o cabeçalho.
function posicionarPopover(evento) {
  const popover = evento.target;
  const ehMenu = popover.classList?.contains('menu-flutuante');
  if (evento.newState !== 'open' || !(ehMenu || popover.classList?.contains('explicacao'))) return;
  const gatilhos = [...document.querySelectorAll(`[popovertarget="${popover.id}"]`)];
  const gatilho = (gatilhos.find(g => g.offsetParent !== null) ?? gatilhos[0]).getBoundingClientRect();
  const rolagem = ehMenu ? { x: 0, y: 0 } : { x: window.scrollX, y: window.scrollY };
  const largura = popover.offsetWidth;
  const esquerda = Math.min(Math.max(MARGEM_POPOVER, gatilho.right - largura), window.innerWidth - largura - MARGEM_POPOVER);
  const abaixo = gatilho.bottom + 8;
  const cabe = abaixo + popover.offsetHeight < window.innerHeight - MARGEM_POPOVER;
  popover.style.left = `${esquerda + rolagem.x}px`;
  popover.style.top = `${(cabe || ehMenu ? abaixo : gatilho.top - popover.offsetHeight - 8) + rolagem.y}px`;
}

// Início --------------------------------------------------------------------

async function iniciar() {
  $('#menu-tema').replaceChildren(renderMenuTema(lerTema()));
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
  $('#menu-ferramentas').replaceChildren(...renderMenuFerramentas(dados));
  $('#menu-principal').replaceChildren(...renderMenuPrincipal(dados));
  const salvo = carregar();
  estado = salvo.porteId && !porteDe(dados, salvo.porteId) ? criarEstado() : salvo;
  document.addEventListener('click', aoClicar);
  document.addEventListener('change', aoMudar);
  document.addEventListener('submit', aoEnviar);
  document.addEventListener('keydown', aoTeclar);
  document.addEventListener('toggle', posicionarPopover, true);
  if (!('popover' in HTMLElement.prototype)) document.documentElement.classList.add('sem-popover');
  render(null, false);
}

iniciar();
