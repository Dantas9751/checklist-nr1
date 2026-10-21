# Resumo final

## O que foi entregue

- `site/`: site estático que roda com `python3 -m http.server`. O fluxo é boas-vindas → escolha de porte → perguntas (uma por tela) → revisão → relatório. Funciona com teclado, nos temas claro e escuro, a partir de 360px, e respeita movimento reduzido.
- `docs/extracao/original.md` e `mapa.md`: texto do PDF página a página e mapa estrutural com as contagens.
- `docs/extracao/humanizado.md`: a versão humanizada completa, para comparar com o PDF.
- `docs/extracao/diff-tom.md`: o que mudou e o que ficou, e a tabela de fidelidade pergunta a pergunta (texto, contexto e "Reflita").
- `docs/DUVIDAS.md`: as leituras conservadoras que precisei fazer.

## Perguntas por porte

| Porte | Perguntas | Pontos | Score |
|---|---|---|---|
| Pequena | 18 (P-01 a P-18) | 39 | SCE: obtidos ÷ aplicáveis |
| Média | 24 (M-01 a M-24) | 55 | SPP: média dos pilares ponderada |
| Grande | 32 (G-01 a G-32) | 72 | ICM: média dos pilares ponderada, faixas mais exigentes |

As contagens batem com o PDF (capa e quadros de pilares) e são conferidas por teste automático e pelo teste de ponta a ponta.

## O que foi mantido

- Todas as 74 perguntas, na ordem do PDF, com código, pilar, peso, classe e base legal (literal).
- Os 8 pilares de A a H e o agrupamento por porte. As perguntas são diferentes em cada porte, como no PDF.
- As quatro marcações (Atende, Parcial, Não atende, N/A) e o critério de cada uma.
- O card "Contexto e impacto" e a pergunta "Reflita" de cada item.
- Guia de uso: workflow em 5 passos, triagem de porte, pesos, contexto legal em uma página (recolhível nas boas-vindas).
- Faixas, prazos sugeridos, regra de priorização das lacunas, indicadores para a alta direção (grande) e fontes (recolhível no rodapé do relatório).

## O que foi humanizado

- O "nós" da empresa virou "você", "vocês" e "sua empresa".
- Perguntas longas foram divididas em frases curtas, sem tirar nenhuma exigência.
- Abreviações e barras ("responsável(is)", "trabalhadores/CIPA", "ex.:") viraram texto corrido.
- Palavras burocráticas trocadas quando não eram termo técnico ("aferição" → "medição", "elaborado" → "feito").
- Notas de aplicação viraram instrução direta ("Se vocês têm PGR, marque N/A").
- Siglas técnicas (GRO, PGR, AEP, AET, PCMSO, CIPA, SESMT, ASO) e as frases de consequência do PDF ficaram.
- Verificação automática de padrões de texto de IA (travessões, aspas curvas, vocabulário inflado): zero ocorrências.

## Pesos e faixas propostos

**Nenhum.** O PDF define a pontuação por completo: peso por pergunta (1 a 3), pontos por marcação (100%, 50%, 0, fora), peso dos pilares de média e grande, pisos por pilar, travas e faixas por porte. Tudo está no JSON com `origem_peso: "pdf"`. O próprio PDF avisa que esses números são "desenho deste material, não exigências legais", e o relatório repete o aviso.

O único conteúdo novo é uma linha de ponte por pilar (`origem_ponte: "proposto"`).

## Regras de score aplicadas

| | Pequena | Média | Grande |
|---|---|---|---|
| Em conformidade | 85 a 100 | 85 a 100, sem travas | 90 a 100, sem travas |
| Atenção | 65 a 84, ou trava | 70 a 84, ou trava | 75 a 89, ou trava |
| Exposta | 40 a 64 | 50 a 69 | 55 a 74 |
| Crítica | abaixo de 40 | abaixo de 50 | abaixo de 55 |
| Trava de peso 3 | 1 item → máx. Atenção | 1 → Atenção; 3+ → Exposta | 1 → Atenção; 3+ → Exposta |
| Piso por pilar | não tem | 50% | 60% |
| Trava do pilar D | não tem | abaixo de 40% → Atenção | abaixo de 50% → Atenção |

Testado: melhor resposta em tudo dá 100 e Em conformidade; pior dá 0 e Crítica; Parcial em tudo dá 50. No teste de ponta a ponta: Pequena melhor = 100, Média média = 50 (Exposta), Grande pior = 0 (Crítica).

## Verificação

- 37 testes unitários passando (`npm test`): score, travas, faixas, estado, troca de porte, persistência, resumo copiado.
- Ponta a ponta com Playwright nos três portes, sem erros no console.
- axe-core (WCAG 2.1 A/AA e boas práticas) em todas as telas, nos dois temas: nenhuma violação.
- Contraste calculado dos tokens: texto no mínimo 5,16:1 (claro) e 6,3:1 (escuro); controles acima de 3:1.
- Percurso completo só com teclado (Tab, setas, Enter) do início ao relatório.
- Impressão conferida em PDF: fundo branco, sem botões, respostas abertas, sem itens cortados entre páginas.

## O que não coube no site

- **Consolidação corporativa da grande empresa** (ICM ponderado pelo número de trabalhadores e limitado pela pior unidade). O site avalia um estabelecimento por vez. Ver `DUVIDAS.md`, item 5.
- **Tabelas de plano de ação para preencher** (Lacuna, Ação concreta, Responsável, Prazo). O site lista as lacunas prioritárias automaticamente, mas não tem campos para ação, responsável e prazo, porque o plano pediu um site sem cadastro. O relatório impresso serve de base.
- **Campos de formulário do PDF** (o PDF é preenchível). Substituídos pelo próprio site.

## O que precisa de decisão humana

1. **Consolidação de várias unidades** na grande empresa: fica fora (como está) ou entra numa próxima versão?
2. **Plano de ação editável** no relatório (ação, responsável e prazo por lacuna, salvos no navegador): vale a pena?
3. **Linhas de ponte** entre pilares: aprovar o texto ou remover.
4. **Arredondamento para baixo** do score (DUVIDAS, item 1): confirmar.
5. **Revisão jurídica e técnica** do texto humanizado por alguém de SST, porque é a versão que o cliente vai ver.
