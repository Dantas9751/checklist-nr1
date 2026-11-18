# Formulário complementar: COPSOQ II-Br (versão curta)

O formulário complementar do Check-One é o **COPSOQ II-Br, versão curta**: 40 perguntas em 23 dimensões, das quais 19 são pontuadas e classificadas em seguro, atenção ou risco. As outras 4 são comportamentos ofensivos, que apenas registram o relato, sem classificação.

## De onde vêm as perguntas

- **copsoqbr.com.br**: o questionário individual gratuito foi percorrido página a página (8 páginas de 5 perguntas). Os prints estão nesta pasta (`site-pagina-01.webp` a `site-pagina-08.webp`) e o texto exato extraído da página está em `perguntas-site.json`. O botão "Finalizar" não foi clicado, para não enviar respostas de teste ao site.
- **Sato TO et al.** Copenhagen Psychosocial Questionnaire – versão curta brasileira (COPSOQ II-Br): aplicação e potencialidades para avaliação dos fatores psicossociais do trabalho no contexto da NR-1. *Rev Bras Saude Ocup.* 2026;51:e21. https://doi.org/10.1590/2317-6369/30925pt2026v51e21 (o PDF enviado). O Quadro 3 dá as escalas de resposta e a Tabela 1 dá as faixas de interpretação de cada dimensão.

Os enunciados e as opções do site e do artigo coincidem item a item.

## Validação brasileira

Gonçalves JS, Moriguchi CS, Chaves TC, Sato TO. Cross-cultural adaptation and psychometric properties of the short version of COPSOQ II-Brazil. *Rev Saúde Pública.* 2021;55:69. O COPSOQ é de uso livre (domínio público/Creative Commons, segundo o próprio copsoqbr.com.br); o Check-One não tem vínculo com os desenvolvedores.

## Como o site usa

- Dados: `site/data/copsoq.json`, gerado por `tools/montar_copsoq.py`.
- Cálculo: `site/js/copsoq.js` (soma dos pontos dos itens de cada dimensão, faixas da Tabela 1). Testes em `site/tests/copsoq.test.mjs`.
- Telas: `site/js/render-copsoq.js`.
- Uso individual: como no copsoqbr.com.br, o resultado é só para reflexão pessoal. Não serve para diagnóstico de grupos, laudos ou decisões de gestão de pessoas. Uma aplicação coletiva precisa ser anônima, com análise por profissional competente.
