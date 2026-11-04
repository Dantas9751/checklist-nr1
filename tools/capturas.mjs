// Gera as capturas do passo a passo da página inicial (site/img/passo-*-{claro,escuro}.png).
// Cada captura recorta o componente inteiro: a união das caixas dos seletores, com uma margem.
// Uso, com o site rodando em localhost:8080:
//   NODE_PATH=$(npm root -g) node tools/capturas.mjs [url]
// Depois converte os PNG para WebP com: python3 tools/png_para_webp.py site/img
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const URL_SITE = process.argv[2] ?? 'http://localhost:8080/';
const PASTA = 'site/img';
const MARGEM = 16;
const TEMAS = [{ id: 'claro', esquema: 'light' }, { id: 'escuro', esquema: 'dark' }];
// Ciclo escolhido para o score da captura dar 70 (faixa Atenção, sem travas) no porte Média.
const RESPOSTAS = ['Atende', 'Atende', 'Parcial', 'Parcial', 'Parcial', 'Atende', 'Parcial'];

async function recortar(pagina, nome, tema, seletores) {
  const clip = await pagina.evaluate(({ seletores, margem }) => {
    const caixas = seletores.map(s => document.querySelector(s)).filter(Boolean).map(el => el.getBoundingClientRect());
    const coluna = document.querySelector('.etapa:not([hidden])').getBoundingClientRect();
    const topo = Math.min(...caixas.map(c => c.top)) + window.scrollY - margem;
    const base = Math.max(...caixas.map(c => c.bottom)) + window.scrollY + margem;
    return { x: coluna.left - margem, y: Math.max(0, topo), width: coluna.width + 2 * margem, height: base - topo };
  }, { seletores, margem: MARGEM });
  await pagina.screenshot({ path: `${PASTA}/passo-${nome}-${tema}.png`, fullPage: true, clip });
}

const navegador = await chromium.launch();
for (const tema of TEMAS) {
  const pagina = await navegador.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
  await pagina.emulateMedia({ colorScheme: tema.esquema, reducedMotion: 'reduce' });
  await pagina.goto(URL_SITE);
  await pagina.addStyleTag({ content: '.barra { display: none !important; } .explicacao:popover-open { animation: none !important; }' });
  await pagina.locator('#fim-da-leitura').scrollIntoViewIfNeeded();
  await pagina.getByRole('button', { name: 'Começar' }).first().click();
  await pagina.getByRole('button', { name: 'Escolher o porte' }).click();
  await pagina.getByRole('radio', { name: /^Média/ }).check();
  await pagina.waitForTimeout(400);
  await recortar(pagina, 'triagem', tema.id, ['.grade-portes']);

  await pagina.getByRole('button', { name: 'Continuar' }).click();
  await pagina.waitForTimeout(400);
  await recortar(pagina, 'checklist', tema.id, ['.pilar', '.pergunta legend']);

  await pagina.locator('.opcao', { hasText: 'Parcial' }).locator('input').check();
  await pagina.locator('.opcao__info').first().click();
  await pagina.waitForTimeout(300);
  await recortar(pagina, 'marcar', tema.id, ['.pergunta .peso', '.opcoes', '.explicacao:popover-open']);
  await pagina.keyboard.press('Escape');

  for (let i = 0; ; i++) {
    if (i > 0) await pagina.locator('.opcao', { hasText: RESPOSTAS[i % RESPOSTAS.length] }).first().locator('input').check();
    await pagina.getByRole('button', { name: /Próxima|Pular/ }).click();
    if (await pagina.locator('#titulo-revisao').isVisible()) break;
  }
  await pagina.getByRole('button', { name: 'Ver relatório' }).click();
  await pagina.waitForTimeout(900);
  await recortar(pagina, 'score', tema.id, ['.resultado']);
  await recortar(pagina, 'agir', tema.id, ['#titulo-proximos', '.bloco[aria-labelledby="titulo-proximos"] .lacunas']);
  await pagina.close();
}
await navegador.close();
console.log('capturas geradas em', PASTA);
