# Dúvidas e leituras conservadoras

Pontos em que o PDF não decide sozinho. Em cada um, escolhi a leitura mais conservadora e segui. Nenhum deles muda o score de uma empresa que respondeu tudo com Atende, Parcial, Não atende ou N/A, exceto o item 1, que só mexe em casas decimais.

1. **Arredondamento do score.** O PDF dá as faixas em números inteiros (por exemplo, 65 a 84) e não diz como arredondar. O site arredonda **para baixo**: 84,6 vira 84 e fica em Atenção, não em Em conformidade. O mesmo vale para o % de cada pilar, que é o número comparado com os pisos e travas. Assim, o número mostrado é sempre o número usado na regra.

2. **Pergunta sem resposta.** O PDF só prevê quatro marcações. No site é possível pular uma pergunta. A pergunta pulada sai do cálculo, como um N/A (pedido do plano), mas aparece como "Puladas" no relatório e na revisão, para não ser confundida com N/A. Ela também não dispara trava.

3. **Pilar sem nenhuma resposta aplicável.** O PDF diz: "Se um pilar inteiro for N/A, divida o score global pela soma dos pesos dos demais." O site aplica isso também a um pilar todo pulado. Esse pilar não entra no piso nem na trava do pilar D.

4. **Ordem das lacunas prioritárias.** O PDF dá três regras próximas: pequena ("as 3 de maior peso; em empate, a que atinge mais pessoas"), média ("peso 3 em Não atende, depois o pilar de menor %, depois os que atingem mais trabalhadores") e grande ("peso 3 primeiro, depois unidades e pilares mais fracos"). O site usa uma ordem só, compatível com as três: peso 3 em Não atende, depois maior peso, depois Não atende antes de Parcial, depois o pilar com menor %. O critério "atinge mais pessoas" não tem como ser medido pelo site e fica para quem lê o relatório (o texto do PDF aparece junto da lista).

5. **Consolidação corporativa da grande empresa (ICM, camada 2).** O PDF manda calcular um ICM por estabelecimento e depois consolidar, ponderando pelo número de trabalhadores e limitando pela pior unidade. O site avalia **um estabelecimento por vez** (a camada 1). A consolidação precisaria de cadastro de unidades e de número de trabalhadores, o que foge de "site básico, sem backend". O relatório da grande empresa deve ser repetido por CNPJ e consolidado à parte.

6. **"Pontos fortes" relativos.** O plano pede destaque para as 3 melhores seções. Se todas forem fracas, as "melhores" ainda podem ter nota baixa. Por isso o rótulo é "Entre os mais fortes", e um pilar só aparece como "Precisa de atenção" se estiver abaixo de 100%.

7. **Linhas de ponte entre pilares.** O PDF não tem texto de transição entre pilares. O plano permite uma linha curta; escrevi uma por pilar, marcada no JSON com `origem_ponte: "proposto"`. É o único texto novo do site.

8. **Tipos de pergunta.** O plano pede um renderizador para cada tipo (`unica`, `multipla`, `escala`, `sim_nao`, `numero`, `texto`). O PDF só tem perguntas de escolha única com quatro marcações. Implementei só `unica`, com um mapa de renderizadores pronto para receber outros tipos, seguindo a regra de YAGNI do próprio plano. Não há perguntas de texto livre ou demográficas, então nenhuma tem `pontua: false`.

9. **Comando de teste.** `node --test site/tests/` (com pasta) não funciona no Node 22. O comando equivalente é `npm test`, que roda `node --test site/tests/*.test.mjs`.
