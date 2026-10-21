# Site do Checklist NR-1

Site estático (HTML, CSS e JavaScript puro, sem build e sem dependências). Lê tudo de `data/questionario.json`.

## Como rodar

O site precisa ser aberto por um servidor, porque carrega o JSON com `fetch` (abrir o `index.html` direto do disco não funciona).

```bash
cd site
python3 -m http.server 8080
```

Depois, abra http://localhost:8080.

## Testes

Na raiz do repositório:

```bash
npm test
```

Roda os testes do motor de score, do estado do formulário e do resumo do relatório (`node --test`, sem instalar nada).

O teste de ponta a ponta usa o Playwright instalado globalmente e um servidor rodando em `localhost:8080`:

```bash
NODE_PATH=$(npm root -g) node tools/e2e.mjs http://localhost:8080/ capturas
```

Ele percorre os três portes (melhor, média e pior resposta), confere a contagem de perguntas e tira capturas em 390px e 1280px, nos temas claro e escuro.

## Como editar o questionário

O `questionario.json` é gerado a partir de dois arquivos em `docs/extracao/`:

- `original.json`: estrutura, pesos e base legal, extraídos do PDF. Não edite à mão.
- `humanizado.json`: todos os textos que aparecem no site (introdução, portes, perguntas, contexto, "Reflita", faixas).

Para mudar um texto, edite `humanizado.json` e rode, na raiz:

```bash
npm run dados
```

Isso regera `site/data/questionario.json`, `docs/extracao/humanizado.md` e a tabela de `docs/extracao/diff-tom.md`.

Se preferir, dá para editar `site/data/questionario.json` direto. Só lembre que a próxima execução de `npm run dados` sobrescreve o arquivo.

O formato completo está em `data/schema.md`.

## Como mudar pesos e faixas

- **Peso de uma pergunta:** campo `peso` (1, 2 ou 3) da pergunta. Peso 3 é tratado como crítico e entra nas travas.
- **Pontos de cada marcação:** `opcoes[].pontos` (Atende 100, Parcial 50, Não atende 0, N/A `null`, que tira a pergunta do cálculo).
- **Peso dos pilares, pisos e travas:** `portes[].score` (`pesos_secoes`, `piso_secao`, `travas_peso3`, `trava_secao`).
- **Faixas:** `portes[].score.faixas`, da melhor para a pior. Cada faixa vale a partir do seu `min`; mantenha os intervalos sem buracos entre 0 e 100 (há um teste que confere isso).

No gerador (`tools/montar_questionario.py`), essas regras ficam no dicionário `SCORE`. Hoje todas vêm do PDF (`origem_peso: "pdf"`).

## Estrutura

```
site/
  index.html          esqueleto: uma região por etapa
  css/base.css        tokens, tema claro/escuro, tipografia
  css/componentes.css componentes
  css/print.css       versão impressa do relatório
  js/score.js         motor de score (funções puras, testadas)
  js/estado.js        estado e navegação (funções puras, testadas)
  js/render.js        telas de boas-vindas, porte, pergunta e revisão
  js/relatorio.js     relatório final e texto do resumo
  js/app.js           liga dados, estado, telas e eventos
  data/               questionario.json e schema.md
  tests/              testes com node --test
```

As respostas ficam só no `localStorage` do navegador. Não há backend, cadastro nem analytics.
