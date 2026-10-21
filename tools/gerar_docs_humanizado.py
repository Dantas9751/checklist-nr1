"""Gera humanizado.md e a tabela de fidelidade de diff-tom.md a partir de original.json e humanizado.json."""
import json

orig = {p['id']: p for p in json.load(open('docs/extracao/original.json'))}
hum = json.load(open('docs/extracao/humanizado.json'))
portes = {'P': 'Pequena', 'M': 'Média', 'G': 'Grande'}
letras = {v['titulo']: k for k, v in hum['pilares'].items()}
assert set(orig) == set(hum['perguntas']), 'IDs divergentes'

md = [f"# {hum['meta']['titulo']} · versão humanizada\n\n",
      f"_{hum['meta']['chamada']}_\n\n", *[f"{p}\n\n" for p in hum['meta']['introducao']],
      f"{hum['meta']['glossario']}\n\n## Como marcar\n\n{hum['meta']['como_marcar']}\n\n"]
md += [f"- **{o['texto']}**: {o['descricao']}\n" for o in hum['opcoes']]
md += ['\n'] + [f"- **Peso {p['peso']} · {p['nome']}**: {p['texto']}\n" for p in hum['meta']['pesos']]
md.append(f"\n{hum['meta']['triagem_nota']}\n\n> {hum['meta']['aviso']}\n")
for bloco in hum['meta']['contexto_legal']:
    md.append(f"\n### {bloco['titulo']}\n\n" + ''.join(f"- {i}\n" for i in bloco['itens']))
for porte in hum['portes']:
    x = porte['nome'][0]
    md.append(f"\n---\n\n## Checklist {porte['nome']}\n\n_{porte['subtitulo']}_\n\n"
              f"**Para quem é:** {porte['criterio']}\n\n**O que muda nas perguntas:** {porte['o_que_muda']}\n\n"
              f"**Score ({porte['score_nome']}):** {porte['score_texto']}\n")
    for letra, pil in hum['pilares'].items():
        ids = [i for i, p in orig.items() if i[0] == x and letras[p['pilar']] == letra]
        md.append(f"\n### {letra} · {pil['titulo']}\n\n_{pil['ponte']}_\n")
        for i in ids:
            h, o = hum['perguntas'][i], orig[i]
            md.append(f"\n**{i} · Peso {o['peso']} · {o['classe'].capitalize()}**\n\n{h['texto']}\n\n"
                      f"Base: {o['base']}\n\nContexto e impacto: {h['contexto']}\n\nReflita: {h['reflita']}\n")
    fx = hum['faixas'][porte['id']]
    md.append(f"\n### Faixas e próximos passos\n\n")
    for k, f in fx.items():
        md.append(f"- **{k}**: {f['resumo']} {' '.join(f['passos'])} Prazo sugerido: {f['prazo']}.\n")
    md.append(f"\n{porte['priorizacao']}\n")
md.append(f"\n---\n\n## Encerramento\n\n{hum['meta']['encerramento']}\n\n{hum['meta']['prazos_nota']}\n")
open('docs/extracao/humanizado.md', 'w').write(''.join(md))

def cel(s): return s.replace('|', '\\|')
linhas = ['| ID | Campo | Original | Humanizado | Mudou o sentido? |\n|---|---|---|---|---|\n']
for i, o in orig.items():
    h = hum['perguntas'][i]
    for campo in ('texto', 'contexto', 'reflita'):
        linhas.append(f"| {i} | {campo} | {cel(o[campo])} | {cel(h[campo])} | não |\n")
tab = open('docs/extracao/diff-tom.md').read().split('<!-- TABELA -->')[0]
open('docs/extracao/diff-tom.md', 'w').write(tab + '<!-- TABELA -->\n\n' + ''.join(linhas))
print(len(orig), 'perguntas;', len(hum['opcoes']), 'opções')
