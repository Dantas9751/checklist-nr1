"""Lê o texto extraído do PDF (pdftotext -layout) e gera docs/extracao/original.json."""
import json, re, sys

src = open(sys.argv[1]).read()
lines = []
for l in src.splitlines():
    l = l.replace('\f', '')
    s = l.strip()
    if s.startswith('CHECKLIST NR-1 POR PORTE DA EMPRESA') or s.startswith('Autodiagnóstico baseado na NR-1'):
        continue
    lines.append(s)

head = re.compile(r'^([PMG]-\d{2}) · (.+?)\s{2,}PESO (\d) · (.+)$')
perguntas, cur, campo = [], None, None
for s in lines:
    m = head.match(s)
    if m:
        cur = dict(id=m[1], pilar=m[2], peso=int(m[3]), classe=m[4], texto=[], base='', contexto=[], reflita='')
        perguntas.append(cur); campo = 'texto'; continue
    if not cur: continue
    if s.startswith('Base:'):
        cur['base'] = s[5:].strip(); campo = None
    elif s.startswith('CONTEXTO E IMPACTO'):
        campo = 'contexto'
    elif s.startswith('REFLITA'):
        cur['reflita'] = s[7:].strip(); campo = 'fim'
    elif campo == 'fim' and s and not re.match(r'^[A-H]\s{2,}', s) and not s.startswith(('Folha de score',)):
        cur['reflita'] += ' ' + s if not head.match(s) else ''
        campo = None
    elif campo in ('texto', 'contexto') and s and not s.startswith('Atende'):
        cur[campo].append(s)
    elif not s and campo == 'fim':
        campo = None

for p in perguntas:
    p['texto'] = ' '.join(p['texto'])
    p['contexto'] = ' '.join(p['contexto'])
    p['reflita'] = p['reflita'].strip()
json.dump(perguntas, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(perguntas))
