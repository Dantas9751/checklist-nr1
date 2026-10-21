"""Monta site/data/questionario.json a partir do original extraído, da versão humanizada e das regras de score do PDF."""
import json

orig = json.load(open('docs/extracao/original.json'))
hum = json.load(open('docs/extracao/humanizado.json'))

PONTOS_OPCAO = {'atende': 100, 'parcial': 50, 'nao_atende': 0, 'na': None}  # PDF p. 2
TITULOS_FAIXA = {'conformidade': 'Em conformidade', 'atencao': 'Atenção', 'exposta': 'Exposta', 'critica': 'Crítica'}

# Regras de score por porte (PDF p. 10-11, 19-20, 30-31). Faixas da melhor para a pior.
SCORE = {
    'pequena': dict(sigla='SCE', modelo='simples', pesos_secoes=None, piso_secao=None,
                    travas_peso3=[{'a_partir_de': 1, 'faixa_maxima': 'atencao'}], trava_secao=None,
                    limites=[85, 65, 40, 0]),
    'media': dict(sigla='SPP', modelo='pilares',
                  pesos_secoes=dict(A=10, B=12, C=13, D=15, E=15, F=10, G=12, H=13), piso_secao=50,
                  travas_peso3=[{'a_partir_de': 1, 'faixa_maxima': 'atencao'}, {'a_partir_de': 3, 'faixa_maxima': 'exposta'}],
                  trava_secao={'secao': 'D', 'abaixo_de': 40, 'faixa_maxima': 'atencao'}, limites=[85, 70, 50, 0]),
    'grande': dict(sigla='ICM', modelo='pilares',
                   pesos_secoes=dict(A=12, B=10, C=12, D=16, E=14, F=8, G=10, H=18), piso_secao=60,
                   travas_peso3=[{'a_partir_de': 1, 'faixa_maxima': 'atencao'}, {'a_partir_de': 3, 'faixa_maxima': 'exposta'}],
                   trava_secao={'secao': 'D', 'abaixo_de': 50, 'faixa_maxima': 'atencao'}, limites=[90, 75, 55, 0]),
}
PREFIXO = {'pequena': 'P', 'media': 'M', 'grande': 'G'}
N_LACUNAS = {'pequena': 3, 'media': 3, 'grande': 5}


def faixas_do_porte(porte_id, limites):
    textos = hum['faixas'][porte_id]
    maximos = [100] + [m - 1 for m in limites[:-1]]
    return [dict(id=fid, titulo=TITULOS_FAIXA[fid], min=mn, max=mx, resumo=textos[fid]['resumo'],
                 proximos_passos=textos[fid]['passos'], prazo=textos[fid]['prazo'])
            for fid, mn, mx in zip(TITULOS_FAIXA, limites, maximos)]


def montar_porte(p):
    regras = dict(SCORE[p['id']])
    limites = regras.pop('limites')
    score = dict(nome=p['score_nome'], texto=p['score_texto'], **regras,
                 faixas=faixas_do_porte(p['id'], limites), origem_peso='pdf')
    extra = {k: p[k] for k in ('indicadores',) if k in p}
    return dict(id=p['id'], nome=p['nome'], prefixo=PREFIXO[p['id']], descricao=p['criterio'], foco=p['foco'],
                subtitulo=p['subtitulo'], o_que_muda=p['o_que_muda'], particularidade=p['particularidade'],
                score=score, priorizacao=dict(texto=p['priorizacao'], quantidade=N_LACUNAS[p['id']]), **extra)


def montar_pergunta(o):
    h = hum['perguntas'][o['id']]
    porte = next(k for k, v in PREFIXO.items() if v == o['id'][0])
    return dict(id=o['id'], texto=h['texto'], ajuda=h['contexto'], reflita=h['reflita'], base=o['base'],
                tipo='unica', portes=[porte], peso=o['peso'], classe=o['classe'].capitalize(),
                pontua=True, origem_peso='pdf')


letra_do_pilar = {v['titulo']: k for k, v in hum['pilares'].items()}
secoes = [dict(id=letra, titulo=pil['titulo'], ponte=pil['ponte'], origem_ponte='proposto',
               perguntas=[montar_pergunta(o) for o in orig if letra_do_pilar[o['pilar']] == letra])
          for letra, pil in hum['pilares'].items()]

dados = dict(
    meta=hum['meta'],
    opcoes=[dict(o, pontos=PONTOS_OPCAO[o['id']]) for o in hum['opcoes']],
    portes=[montar_porte(p) for p in hum['portes']],
    secoes=secoes,
)
json.dump(dados, open('site/data/questionario.json', 'w'), ensure_ascii=False, indent=2)
print(sum(len(s['perguntas']) for s in secoes), 'perguntas')
