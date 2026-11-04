# Dúvidas e leituras conservadoras

Pontos em que o PDF não decide sozinho. Em cada um, escolhi a leitura mais conservadora e segui. Nenhum deles muda o score de uma empresa que respondeu tudo com Atende, Parcial, Não atende ou N/A, exceto o item 1, que só mexe em casas decimais.

1. **Arredondamento do score.** O PDF dá as faixas em números inteiros (por exemplo, 65 a 84) e não diz como arredondar. O site arredonda **para baixo**: 84,6 vira 84 e fica em Atenção, não em Em conformidade. O mesmo vale para o % de cada pilar, que é o número comparado com os pisos e travas. Assim, o número mostrado é sempre o número usado na regra.

2. **Pergunta sem resposta.** O PDF só prevê quatro marcações. No site é possível pular uma pergunta. A pergunta pulada sai do cálculo, como um N/A (pedido do plano), mas aparece como "Puladas" no relatório e na revisão, para não ser confundida com N/A. Ela também não dispara trava.

3. **Pilar sem nenhuma resposta aplicável.** O PDF diz: "Se um pilar inteiro for N/A, divida o score global pela soma dos pesos dos demais." O site aplica isso também a um pilar todo pulado. Esse pilar não entra no piso nem na trava do pilar D.

4. **Ordem das lacunas prioritárias.** O PDF dá três regras próximas: pequena ("as 3 de maior peso; em empate, a que atinge mais pessoas"), média ("peso 3 em Não atende, depois o pilar de menor %, depois os que atingem mais trabalhadores") e grande ("peso 3 primeiro, depois unidades e pilares mais fracos"). O site usa uma ordem só, compatível com as três: peso 3 em Não atende, depois maior peso, depois Não atende antes de Parcial, depois o pilar com menor %. O critério "atinge mais pessoas" não tem como ser medido pelo site e fica para quem lê o relatório (o texto do PDF aparece junto da lista).

5. **Consolidação corporativa da grande empresa (ICM, camada 2).** O PDF manda calcular um ICM por estabelecimento e depois consolidar, ponderando pelo número de trabalhadores e limitando pela pior unidade. O site avalia **um estabelecimento por vez** (a camada 1). A consolidação precisaria de cadastro de unidades e de número de trabalhadores, o que foge de "site básico, sem backend". O relatório da grande empresa deve ser repetido por CNPJ e consolidado à parte.

6. **Avaliação de cada pilar no relatório.** O PDF não classifica pilares, só o score geral. A tabela do relatório usa regras objetivas, todas explicadas na coluna "Por quê":
   - **Precisa de atenção:** o pilar tem item de peso 3 em Não atende, ou está abaixo do piso do porte, ou aciona a trava do pilar D, ou está entre os 3 com menor nota sem chegar à melhor faixa.
   - **Entre os mais fortes:** está entre os 3 com maior nota e já na melhor faixa do porte (85% na pequena e na média, 90% na grande).
   - **Sem destaque:** os demais.
   Assim, um pilar com 57% não aparece mais como "forte" só por ser relativo aos outros.
   O "Por quê" tem três partes: **O que falta** (ou **O que sustenta**, quando tudo está em Atende), com o tema de cada pergunta e a marcação; **Por que pesa** (ou **Por que conta**), com o impacto da lacuna mais grave; e **Efeito na nota**, com pontos, faixa equivalente e as regras acionadas. O tema e o impacto de cada pergunta (campos `tema` e `impacto` no JSON) são resumos do card "Contexto e impacto" do PDF: não trazem exigência nova.

7. **Linhas de ponte entre pilares.** O PDF não tem texto de transição entre pilares. O plano permite uma linha curta; escrevi uma por pilar, marcada no JSON com `origem_ponte: "proposto"`. Além delas, o passo a passo da página inicial descreve as telas do site a partir dos 5 passos do PDF (Triagem, Checklist, Marcar, Score, Agir), agora numerados 1, 2, 2.1, 2.2 e 3.

8. **Tipos de pergunta.** O plano pede um renderizador para cada tipo (`unica`, `multipla`, `escala`, `sim_nao`, `numero`, `texto`). O PDF só tem perguntas de escolha única com quatro marcações. Implementei só `unica`, com um mapa de renderizadores pronto para receber outros tipos, seguindo a regra de YAGNI do próprio plano. Não há perguntas de texto livre ou demográficas, então nenhuma tem `pontua: false`.

9. **Comando de teste.** `node --test site/tests/` (com pasta) não funciona no Node 22. O comando equivalente é `npm test`, que roda `node --test site/tests/*.test.mjs`.

10. **Cor das barras e do anel.** O anel usa a cor da faixa final, já com as travas. Cada barra de pilar usa a mesma régua de faixas do porte aplicada à nota do pilar. São quatro cores, uma por faixa: verde (Em conformidade), amarelo (Atenção), laranja (Exposta) e vermelho (Crítica). O laranja foi mantido para não juntar Exposta e Crítica numa cor só. A cor nunca aparece sozinha: o nome da faixa ou da avaliação vem junto.

11. **Siglas por extenso.** Cada sigla aparece como "nome (SIGLA)" na primeira vez que surge em cada tela, e só pela sigla nas vezes seguintes da mesma tela. Escrever o nome completo em todas as ocorrências deixaria perguntas como as da NR-1 com o dobro do tamanho. Quando a primeira ocorrência já está entre parênteses, o formato vira "nome, SIGLA", para não criar parêntese dentro de parêntese. Títulos, a chamada do topo, os nomes dos scores (SCE, SPP, ICM, que já vêm com o nome) e as citações de Base ficam como estão. "Portaria MTE" também fica, por ser nome de documento. Para isso, cerca de 25 frases foram reescritas sem mudar o sentido: barras como "GRO/PGR" e "AEP/AET" viraram "GRO e PGR" e "AEP ou AET", e siglas seguidas de parêntese ganharam outra construção. A lista está em `docs/extracao/diff-tom.md`.

12. **Cores do tema CIEE.** Não encontrei um manual de marca público do CIEE brasileiro: as buscas trouxeram só a paleta de outra organização com a mesma sigla (ciee.org, dos EUA), e os sites com a marca brasileira estão fora da rede desta sessão. As cores foram tiradas dos logos que você enviou: roxo institucional no cabeçalho (#47255f), azul como destaque (#0b4a9b) e o laranja do ponto do "i" na barra de progresso e na letra do pilar. Os valores são aproximados e ficam todos no bloco `:root[data-theme="ciee"]` de `css/base.css`. O logo em si não é usado no site.
