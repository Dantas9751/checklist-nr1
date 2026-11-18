"""Gera site/data/copsoq.json: COPSOQ II-Br versão curta (40 itens).

Enunciados e opções conferidos em copsoqbr.com.br e no ensaio de Sato et al. (Rev Bras Saude Ocup 2026;51:e21),
que traz as escalas (Quadro 3) e as faixas de interpretação (Tabela 1).
"""
import json

ESCALAS = {
    'frequencia': [('Sempre', 4), ('Frequentemente', 3), ('Às vezes', 2), ('Raramente', 1), ('Nunca', 0)],
    'frequencia_invertida': [('Sempre', 0), ('Frequentemente', 1), ('Às vezes', 2), ('Raramente', 3), ('Nunca', 4)],
    'intensidade': [('Em grande parte', 4), ('Em boa parte', 3), ('De certa forma', 2), ('Pouco', 1), ('Muito pouco', 0)],
    'satisfacao': [('Muito satisfeito', 3), ('Satisfeito', 2), ('Insatisfeito', 1), ('Muito insatisfeito', 0)],
    'conflito': [('Sim, com certeza', 3), ('Sim, até certo ponto', 2), ('Sim, mas muito pouco', 1), ('Não, realmente não', 0)],
    'saude': [('Excelente', 4), ('Muito boa', 3), ('Boa', 2), ('Razoável', 1), ('Ruim', 0)],
}
OFENSIVO = [('sim_diario', 'Sim, diariamente'), ('sim_semanal', 'Sim, semanalmente'), ('sim_mensal', 'Sim, mensalmente'),
            ('sim_poucas', 'Sim, poucas vezes'), ('nao', 'Não')]
QUEM = ['Colegas', 'Gerente, supervisor', 'Subordinados', 'Clientes, fregueses, pacientes']

# (id, título, [(item, texto, escala)], faixas {seguro, atencao, risco} em pontos inclusivos)
DOMINIOS = [
  ('Demandas no trabalho', [
    ('1', 'Demandas quantitativas', [('1A', 'Você atrasa a entrega do seu trabalho?', 'frequencia'),
                                     ('1B', 'O tempo para realizar as suas tarefas no trabalho é suficiente?', 'frequencia_invertida')],
     {'seguro': [0, 3], 'atencao': [4, 4], 'risco': [5, 8]}),
    ('2', 'Ritmo de trabalho', [('2A', 'É necessário manter um ritmo acelerado no trabalho?', 'frequencia'),
                                ('2B', 'Você trabalha em ritmo acelerado ao longo de toda jornada?', 'frequencia')],
     {'seguro': [0, 3], 'atencao': [4, 5], 'risco': [6, 8]}),
    ('3', 'Demandas emocionais', [('3A', 'Seu trabalho coloca você em situações emocionalmente desgastantes?', 'frequencia'),
                                  ('3B', 'Você tem que lidar com os problemas pessoais de outras pessoas como parte do seu trabalho?', 'frequencia')],
     {'seguro': [0, 3], 'atencao': [4, 4], 'risco': [5, 8]}),
  ]),
  ('Organização e conteúdo do trabalho', [
    ('4', 'Influência no trabalho', [('4A', 'Você tem um alto grau de influência nas decisões sobre o seu trabalho?', 'frequencia'),
                                     ('4B', 'Você pode interferir na quantidade de trabalho atribuída a você?', 'frequencia')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
    ('5', 'Possibilidade de desenvolvimento', [('5A', 'Você tem a possibilidade de aprender coisas novas através do seu trabalho?', 'intensidade'),
                                               ('5B', 'O seu trabalho exige que você tome iniciativas?', 'intensidade')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
    ('6', 'Significado do trabalho', [('6A', 'O seu trabalho é significativo?', 'intensidade'),
                                      ('6B', 'Você sente que o trabalho que você faz é importante?', 'intensidade')],
     {'seguro': [6, 8], 'atencao': [5, 5], 'risco': [0, 4]}),
    ('7', 'Comprometimento com o trabalho', [('7A', 'Você sente que o seu local de trabalho é muito importante para você?', 'intensidade'),
                                             ('7B', 'Você recomendaria a um amigo que se candidatasse a uma vaga no seu local de trabalho?', 'intensidade')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
  ]),
  ('Relações interpessoais', [
    ('8', 'Previsibilidade', [('8A', 'No seu local de trabalho, você é informado antecipadamente sobre decisões importantes, mudanças ou planos para o futuro?', 'intensidade'),
                              ('8B', 'Você recebe toda a informação necessária para fazer bem o seu trabalho?', 'intensidade')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
    ('9', 'Reconhecimento', [('9A', 'O seu trabalho é reconhecido e valorizado pelos seus superiores?', 'intensidade'),
                             ('9B', 'Você é tratado de forma justa no seu local de trabalho?', 'intensidade')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
    ('10', 'Clareza do papel', [('10A', 'O seu trabalho tem objetivos/metas claros(as)?', 'intensidade'),
                                ('10B', 'Você sabe exatamente o que se espera de você no trabalho?', 'intensidade')],
     {'seguro': [6, 8], 'atencao': [4, 5], 'risco': [0, 3]}),
    ('11', 'Qualidade da liderança', [('11A', 'Você diria que o seu superior imediato dá alta prioridade para a satisfação com trabalho?', 'intensidade'),
                                      ('11B', 'Você diria que o seu superior imediato é bom no planejamento do trabalho?', 'intensidade')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
    ('12', 'Suporte social', [('12A', 'Com que frequência o seu superior imediato está disposto a ouvir os seus problemas no trabalho?', 'frequencia'),
                              ('12B', 'Com que frequência você recebe ajuda e suporte do seu superior imediato?', 'frequencia')],
     {'seguro': [6, 8], 'atencao': [4, 5], 'risco': [0, 3]}),
  ]),
  ('Interface trabalho-indivíduo', [
    ('13', 'Satisfação no trabalho', [('13', 'Qual o seu nível de satisfação com o seu trabalho como um todo, considerando todos os aspectos?', 'satisfacao')],
     {'seguro': [2, 3], 'risco': [0, 1]}),
    ('14', 'Conflitos trabalho e família', [('14A', 'Você sente que o seu trabalho consome tanto sua energia que ele tem um efeito negativo na sua vida particular?', 'conflito'),
                                            ('14B', 'Você sente que o seu trabalho ocupa tanto tempo que ele tem um efeito negativo na sua vida particular?', 'conflito')],
     {'seguro': [0, 2], 'atencao': [3, 3], 'risco': [4, 6]}),
  ]),
  ('Valores do local de trabalho', [
    ('15', 'Confiança na gestão', [('15A', 'Você pode confiar nas informações que vêm dos seus superiores?', 'intensidade'),
                                   ('15B', 'Os seus superiores confiam que os funcionários farão bem seu trabalho?', 'intensidade')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
    ('16', 'Justiça', [('16A', 'Os conflitos são resolvidos de forma justa?', 'intensidade'),
                       ('16B', 'O trabalho é distribuído de forma justa?', 'intensidade')],
     {'seguro': [5, 8], 'atencao': [4, 4], 'risco': [0, 3]}),
  ]),
  ('Saúde e bem-estar', [
    ('17', 'Saúde geral', [('17', 'Em geral, você diria que a sua saúde é:', 'saude')],
     {'seguro': [3, 4], 'atencao': [2, 2], 'risco': [0, 1]}),
    ('18', 'Sintomas de burnout', [('18A', 'Com que frequência você tem se sentido fisicamente esgotado?', 'frequencia'),
                                   ('18B', 'Com que frequência você tem se sentido emocionalmente esgotado?', 'frequencia')],
     {'seguro': [0, 2], 'atencao': [3, 3], 'risco': [4, 8]}),
    ('19', 'Sintomas de estresse', [('19A', 'Com que frequência você tem se sentido estressado?', 'frequencia'),
                                    ('19B', 'Com que frequência você tem se sentido irritado?', 'frequencia')],
     {'seguro': [0, 2], 'atencao': [3, 3], 'risco': [4, 8]}),
  ]),
]
OFENSIVOS = [
  ('20', 'Atenção sexual indesejada', 'Você foi exposto a atenção sexual indesejada no seu local de trabalho durante os últimos 12 meses?'),
  ('21', 'Ameaças de violência', 'Você foi exposto a ameaças de violência no seu local de trabalho nos últimos 12 meses?'),
  ('22', 'Violência física', 'Você foi exposto a violência física em seu local de trabalho durante os últimos 12 meses?'),
  ('23', 'Bullying', 'Você foi exposto a "bullying" no seu local de trabalho nos últimos 12 meses?'),
]

dados = {
  'meta': {
    'titulo': 'Questionário Psicossocial de Copenhague',
    'sigla': 'COPSOQ II-Br, versão curta',
    'subtitulo': 'Formulário complementar sobre riscos psicossociais, com 40 perguntas sobre o seu trabalho.',
    'introducao': [
      'O COPSOQ avalia fatores psicossociais do trabalho: demandas, organização, relações, liderança, saúde e bem-estar. Ele ajuda a enxergar o que pode proteger ou prejudicar a saúde de quem trabalha.',
      'Responda pensando no seu trabalho atual. Não há resposta certa ou errada: vale o que você vive no dia a dia.',
    ],
    'aviso_titulo': 'Questionário individual',
    'aviso': [
      'Este questionário é estritamente individual e serve como ponto de reflexão pessoal.',
      'Ele não pode ser usado para diagnósticos, laudos, decisões de gestão de pessoas ou avaliação de grupos, equipes ou empresas. Para isso, a aplicação precisa ser coletiva, anônima e analisada por profissional competente.',
      'O resultado não substitui avaliação clínica ou diagnóstico feito por profissional de saúde mental. Em caso de sofrimento, procure um psicólogo, psiquiatra ou outro profissional habilitado.',
      'Suas respostas ficam só neste navegador. Nada é enviado.',
    ],
    'faixas': {
      'seguro': 'Situação favorável para a saúde nesta dimensão.',
      'atencao': 'Nem adequada nem de risco, mas pede atenção.',
      'risco': 'Situação desfavorável, com risco para a saúde.',
    },
    'ofensivos_texto': 'Comportamentos ofensivos não recebem classificação, porque são situações inaceitáveis no ambiente de trabalho. Se você passou por alguma delas, a organização deve oferecer suporte e acesso a canais seguros de denúncia, além de prevenir, impedir e punir esses comportamentos.',
    'referencia': [
      'COPSOQ II-Br (Copenhagen Psychosocial Questionnaire), versão curta, 40 itens. Original dinamarquês: Pejtersen, Kristensen, Borg e Bjorner.',
      'Validação brasileira: Gonçalves JS, Moriguchi CS, Chaves TC, Sato TO. Rev Saúde Pública. 2021;55:69.',
      'Pontuação e interpretação: Sato TO et al. Rev Bras Saude Ocup. 2026;51:e21. doi.org/10.1590/2317-6369/30925pt2026v51e21',
    ],
    'por_pagina': 5,
  },
  'escalas': {k: [{'texto': t, 'valor': v} for t, v in vs] for k, vs in ESCALAS.items()},
  'ofensivo_opcoes': [{'id': i, 'texto': t} for i, t in OFENSIVO],
  'quem': QUEM,
  'dominios': [{'titulo': d, 'dimensoes': [
      {'id': i, 'titulo': t, 'itens': [{'id': a, 'texto': b, 'escala': c} for a, b, c in itens], 'faixas': f}
      for i, t, itens, f in dims]} for d, dims in DOMINIOS],
  'ofensivos': [{'id': i, 'titulo': t, 'texto': x} for i, t, x in OFENSIVOS],
}
json.dump(dados, open('site/data/copsoq.json', 'w'), ensure_ascii=False, indent=2)
print(sum(len(d['itens']) for dom in dados['dominios'] for d in dom['dimensoes']) + len(OFENSIVOS), 'itens')
