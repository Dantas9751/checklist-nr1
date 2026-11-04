// Gera as capturas do passo a passo da página inicial (site/img/passo-*-{claro,escuro}.webp).
// Uso, com o site rodando em localhost:8080:
//   NODE_PATH=$(npm root -g) node tools/capturas.mjs [url]
// Depois converte os PNG para WebP com: python3 tools/png_para_webp.py site/img
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const URL_SITE = process.argv[2] ?? 'http://localhost:8080/';
const PASTA = 'site/img';
const LARGURA = 720;
const ALTURA = 450;
const TEMAS = [{ id: 'claro', esquema: 'light' }, { id: 'escuro', esquema: 'dark' }];
const RESPOSTAS = ['Atende', 'Atende', 'Parcial', 'Atende', 'Não atende', 'Atende', 'Parcial'];

async function recortar(pagina, nome, tema, seletor, acima = 24) {
  const caixa = await pagina.locator(seletor).first().evaluate((el, acima) => {
    const r = el.getBoundingClientRect();
    return { y: r.top + window.scrollY - acima };
  }, acima);
  const x = (await pagina.evaluate(() => document.querySelector('.etapa:not([hidden])').getBoundingClientRect().left)) - 24;
  await pagina.screenshot({
    path: `${PASTA}/passo-${nome}-${tema}.png`,
    fullPage: true,
    clip: { x, y: Math.max(0, caixa.y), width: LARGURA, height: ALTURA },
  });
}

const navegador = await chromium.launch();
for (const tema of TEMAS) {
  const pagina = await navegador.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 2 });
  await pagina.emulateMedia({ colorScheme: tema.esquema, reducedMotion: 'reduce' });
  await pagina.goto(URL_SITE);
  await pagina.addStyleTag({ content: '.barra { display: none !important; }' });
  await pagina.getByRole('button', { name: 'Começar' }).click();
  await pagina.getByRole('button', { name: 'Escolher o porte' }).click();
  await pagina.getByRole('radio', { name: /^Média/ }).check();
  await pagina.waitForTimeout(400);
  await recortar(pagina, 'triagem', tema.id, '.grade-portes');

  await pagina.getByRole('button', { name: 'Continuar' }).click();
  await pagina.waitForTimeout(400);
  await recortar(pagina, 'checklist', tema.id, '.pilar');

  await pagina.locator('.opcao', { hasText: 'Parcial' }).locator('input').check();
  await pagina.locator('.opcao__info').first().click();
  await pagina.waitForTimeout(400);
  await recortar(pagina, 'marcar', tema.id, '.pergunta .peso', 100);
  await pagina.keyboard.press('Escape');

  for (let i = 0; ; i++) {
    if (i > 0) await pagina.locator('.opcao', { hasText: RESPOSTAS[i % RESPOSTAS.length] }).first().locator('input').check();
    await pagina.getByRole('button', { name: /Próxima|Pular/ }).click();
    if (await pagina.locator('#titulo-revisao').isVisible()) break;
  }
  await pagina.getByRole('button', { name: 'Ver relatório' }).click();
  await pagina.waitForTimeout(800);
  await recortar(pagina, 'score', tema.id, '.resultado');
  await recortar(pagina, 'agir', tema.id, '#titulo-proximos');
  await pagina.close();
}
await navegador.close();
console.log('capturas geradas em', PASTA);
