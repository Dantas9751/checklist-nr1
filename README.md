# Checklist NR-1 por porte da empresa

Autodiagnóstico de conformidade com a NR-1 (GRO/PGR e riscos psicossociais) com perguntas diferentes para pequena, média e grande empresa, score e relatório final. Baseado no PDF "Checklist NR-1 por porte da empresa", com o texto reescrito num tom mais direto.

- **Site:** `site/` (estático, sem build). Como rodar e editar: [`site/README.md`](site/README.md).
- **Texto humanizado para comparar com o PDF:** [`docs/extracao/humanizado.md`](docs/extracao/humanizado.md).
- **Decisões, pendências e verificação:** [`docs/RESUMO-FINAL.md`](docs/RESUMO-FINAL.md) e [`docs/DUVIDAS.md`](docs/DUVIDAS.md).

```bash
cd site && python3 -m http.server 8080   # abrir http://localhost:8080
npm test                                  # na raiz
```

Ferramenta de autodiagnóstico. Não substitui o texto oficial da norma, parecer jurídico nem a avaliação de um profissional de SST.
