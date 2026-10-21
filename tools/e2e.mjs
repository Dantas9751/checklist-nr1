// Teste de ponta a ponta com Playwright: percorre o fluxo inteiro em cada porte e tira capturas.
// Uso: NODE_PATH=$(npm root -g) node tools/e2e.mjs [url] [pasta-capturas]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const URL_SITE = process.argv[2] ?? 'http://localhost:8080/';
const PASTA = process.argv[3] ?? 'capturas';
mkdirSync(PASTA, { recursive: true });

const ESTRATEGIAS = {
  melhor: () => 'Atende',
  pior: () => 'Não atende',
  media: i => ['Atende', 'Parcial', 'Não atende', 'Parcial'][i % 4],
};
const TRILHAS = [
  { porte: 'Pequena', estrategia: 'melhor', esperado: 18 },
  { porte: 'Média', estrategia: 'media', esperado: 24 },
  { porte: 'Grande', estrategia: 'pior', esperado: 32 },
];

async function percorrer(navegador, { porte, estrategia, esperado }, capturar) {
  const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  const erros = [];
  pagina.on('console', m => m.type() === 'error' && erros.push(m.text()));
  pagina.on('pageerror', e => erros.push(e.message));
  await pagina.goto(URL_SITE);
  await pagina.getByRole('button', { name: 'Começar' }).click();
  await pagina.getByRole('radio', { name: new RegExp(`^${porte}`) }).check();
  await pagina.getByRole('button', { name: 'Continuar' }).click();

  let total = 0;
  for (let i = 0; ; i++) {
    const meta = await pagina.locator('.pergunta__meta').textContent();
    total = Number(meta.match(/de (\d+)/)[1]);
    await pagina.locator('.opcao', { hasText: ESTRATEGIAS[estrategia](i) }).first().locator('input').check();
    if (capturar && i === 0) await capturar(pagina, 'pergunta');
    await pagina.getByRole('button', { name: 'Próxima' }).click();
    if (await pagina.locator('#titulo-revisao').isVisible()) break;
  }
  await pagina.getByRole('button', { name: 'Ver relatório' }).click();
  const score = Number((await pagina.locator('.anel__numero').textContent()).match(/^\d+/)[0]);
  const faixa = await pagina.locator('.selo-faixa').textContent();
  if (capturar) await capturar(pagina, 'relatorio');
  await pagina.close();
  return { porte, estrategia, perguntas: total, esperado, score, faixa, erros };
}

const navegador = await chromium.launch();
const resultados = [];
for (const trilha of TRILHAS) {
  resultados.push(await percorrer(navegador, trilha, trilha.estrategia === 'media' ? async (pagina, nome) => {
    for (const largura of [390, 1280]) {
      for (const tema of ['light', 'dark']) {
        await pagina.setViewportSize({ width: largura, height: largura === 390 ? 844 : 900 });
        await pagina.emulateMedia({ colorScheme: tema, reducedMotion: 'reduce' });
        await pagina.screenshot({ path: `${PASTA}/${nome}-${largura}-${tema}.png`, fullPage: nome === 'relatorio' });
      }
    }
    await pagina.setViewportSize({ width: 390, height: 844 });
  } : null));
}

const boasVindas = await navegador.newPage();
for (const largura of [390, 1280]) {
  for (const tema of ['light', 'dark']) {
    await boasVindas.setViewportSize({ width: largura, height: largura === 390 ? 844 : 900 });
    await boasVindas.emulateMedia({ colorScheme: tema });
    await boasVindas.goto(URL_SITE);
    await boasVindas.evaluate(() => localStorage.clear());
    await boasVindas.reload();
    await boasVindas.getByRole('button', { name: 'Começar' }).waitFor();
    await boasVindas.screenshot({ path: `${PASTA}/boas-vindas-${largura}-${tema}.png`, fullPage: true });
    const larguraPagina = await boasVindas.evaluate(() => document.documentElement.scrollWidth);
    if (larguraPagina > largura) console.log(`ROLAGEM HORIZONTAL em ${largura}px: ${larguraPagina}px`);
  }
}
await navegador.close();
console.table(resultados.map(({ erros, ...r }) => ({ ...r, erros: erros.length })));
for (const r of resultados) for (const e of r.erros) console.log('ERRO', r.porte, e);
const falhas = resultados.filter(r => r.perguntas !== r.esperado || r.erros.length);
process.exit(falhas.length ? 1 : 0);
