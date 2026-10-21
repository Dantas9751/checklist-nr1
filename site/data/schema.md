# Formato do `questionario.json`

O arquivo é a fonte da verdade do site. Ele é gerado por `tools/montar_questionario.py` a partir de `docs/extracao/original.json` (estrutura e pesos tirados do PDF) e `docs/extracao/humanizado.json` (textos). Para mudar um texto, edite `humanizado.json` e rode o script; para mudar uma regra de score, edite o dicionário `SCORE` do script. Também dá para editar o JSON direto, se preferir.

```jsonc
{
  "meta": {
    "titulo": "", "chamada": "", "subtitulo": "",
    "introducao": [""],            // parágrafos da tela de boas-vindas
    "glossario": "", "como_marcar": "", "triagem_nota": "", "aviso": "", "rodape": "",
    "encerramento": "", "prazos_nota": "",
    "pesos": [{ "peso": 3, "nome": "", "texto": "" }],
    "workflow": [{ "titulo": "", "texto": "" }],
    "contexto_legal": [{ "titulo": "", "itens": [""] }],
    "fontes": { "base": [""], "complementar": [""], "verificar": [""] }
  },

  // Marcações, iguais para todas as perguntas. "pontos" vai de 0 a 100; null tira a pergunta do cálculo (N/A).
  "opcoes": [{ "id": "atende", "texto": "Atende", "descricao": "", "pontos": 100 }],

  "portes": [{
    "id": "pequena", "nome": "", "prefixo": "P",
    "descricao": "",               // critério de enquadramento (nº de empregados)
    "foco": "", "subtitulo": "", "o_que_muda": "", "particularidade": "",
    "score": {
      "sigla": "SCE", "nome": "", "texto": "",
      "modelo": "simples | pilares", // simples: obtidos ÷ aplicáveis; pilares: média ponderada dos % das seções
      "pesos_secoes": { "A": 10 },   // só no modelo "pilares"
      "piso_secao": 50,              // % mínimo de cada seção para ficar na melhor faixa (ou null)
      "travas_peso3": [{ "a_partir_de": 1, "faixa_maxima": "atencao" }],
      "trava_secao": { "secao": "D", "abaixo_de": 40, "faixa_maxima": "atencao" },
      "faixas": [{ "id": "", "titulo": "", "min": 0, "max": 100, "resumo": "", "proximos_passos": [""], "prazo": "" }],
      "origem_peso": "pdf"
    },
    "priorizacao": { "texto": "", "quantidade": 3 },
    "indicadores": { "titulo": "", "itens": [""], "nota": "" }   // opcional (só grande)
  }],

  "secoes": [{
    "id": "A", "titulo": "", "ponte": "", "origem_ponte": "proposto",
    "perguntas": [{
      "id": "P-01", "texto": "", "ajuda": "",   // ajuda = card "Contexto e impacto"
      "reflita": "", "base": "",                // base = citação literal da norma
      "tipo": "unica",
      "portes": ["pequena"],                    // sem "portes" = vale para todos
      "peso": 3, "classe": "Crítico (trava)",
      "pontua": true, "origem_peso": "pdf"
    }]
  }]
}
```

## Diferenças em relação ao esquema mínimo do plano

- **Faixas por porte.** O PDF usa faixas diferentes para cada porte, então `faixas` fica dentro de `portes[].score`, e não na raiz.
- **Opções na raiz.** As 74 perguntas usam as mesmas quatro marcações, então `opcoes` fica uma vez só na raiz (DRY). Uma pergunta pode ter `opcoes` própria se um dia precisar.
- **Campos extras por pergunta:** `reflita`, `base` e `classe`, que vêm do card do PDF.
- **Regras de trava e piso** (`travas_peso3`, `piso_secao`, `trava_secao`), que o PDF define.
- **Origem.** Todos os pesos, faixas e travas têm `origem_peso: "pdf"`. Nada de pontuação foi proposto. O único texto marcado como `proposto` é a `ponte` de cada seção.
