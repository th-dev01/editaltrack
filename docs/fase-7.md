# Fase 7 — Calendário interno

## Implementação

- `/calendario` oferece visualização mensal e em lista, sem biblioteca externa. No viewport mobile inicia em lista; em telas maiores inicia no mês.
- A grade mostra eventos no dia inicial e, quando há período, também na data final. Períodos longos não desenham barras entre dias; eventos adicionais ficam recolhidos em “+N eventos”.
- A lista agrupa cronologicamente pelo início (ou pelo primeiro dia visível quando o evento já estava em andamento). Exibe tipo, edital, instituição, período, horário/dia inteiro, urgência e conclusão.
- Filtros por tipo, status de conclusão e edital, além de busca por evento, edital ou instituição.
- Clique abre detalhes com descrição, status, prazo final, link para o edital, edição pelo `EventoForm` existente e ação para concluir.
- “Novo evento” permite escolher o edital e reutiliza `EventoForm`, Zod e `eventos.service`. Clicar no número de um dia do mês abre o formulário com essa data pré-preenchida.

## Consultas e timezone

`getEventosByRange(startDate, endDate)` consulta somente `eventos_edital`, inclui eventos que atravessam o intervalo e pagina em blocos de 500. A relação `editais!inner` fornece título, instituição e número numa única consulta. Todas as consultas continuam protegidas por RLS; nenhuma tabela/migration nova foi criada.

O intervalo busca uma margem pequena nas bordas por causa da comparação de timestamps UTC, e a interface recorta os eventos aos dias visíveis usando `America/Fortaleza`. O mês corrente, o agrupamento e a posição dos eventos usam o timezone central de `src/lib/date.ts`. Os campos date/datetime-local do formulário convertem os valores locais de Fortaleza para ISO e vice-versa, evitando deslocamento de dia e preservando horários ao editar.

## Testes

`tests/calendar.spec.ts` cobre mês atual/navegação/Hoje, marcação do evento no dia, lista e horário, abrir detalhes e edital, filtros de tipo/status, concluir, criar evento, estado vazio e layout mobile.

```bash
npm run typecheck
npm run lint
npm run build
npm run test:auth
```
