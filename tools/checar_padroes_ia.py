"""Procura padrões de texto de IA nos textos voltados ao usuário."""
import json, re, sys

PADROES = [r'—', r'–', r'[“”‘’]', r'\b(crucial|fundamental|essencial|robust[oa]|potencializ|alavanc|vale ressaltar|é importante (notar|destacar)|além disso|em suma|jornada de|no cenário|desbloque|mergulh)\w*']

# Termos que vêm do próprio PDF: nome do score e "o essencial" da introdução.
PERMITIDOS = ['Score de Conformidade Essencial', 'sobre o essencial']

def textos(no):
    if isinstance(no, str):
        for ok in PERMITIDOS: no = no.replace(ok, '')
        yield no
    elif isinstance(no, dict):
        for k, v in no.items():
            if k != "base": yield from textos(v)  # citação literal da norma
    elif isinstance(no, list):
        for v in no: yield from textos(v)

achados = [(p, t) for arq in sys.argv[1:] for t in textos(json.load(open(arq))) for p in PADROES if re.search(p, t, re.I)]
for p, t in achados: print(f'{p}: {t[:100]}')
print(f'{len(achados)} ocorrência(s)')
sys.exit(1 if achados else 0)
