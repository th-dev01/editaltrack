# Fase 6 — Dashboard como Central de Controle

## Escopo

O Dashboard agrega dados existentes de editais, eventos e documentos. Os alertas são calculados em tempo de leitura e não são persistidos. Esta fase não adiciona tabelas, uploads, integrações externas ou automações de status.

## Cards e seções

- Resumo: editais, inscrições abertas, prazos próximos, documentos obrigatórios pendentes, editais aguardando resultado, editais para analisar e favoritos.
- “Precisa da sua atenção”: eventos urgentes, resultados previstos próximos e documentos pendentes combinados com prazo de inscrição em até três dias.
- Listas de até cinco prazos, documentos, resultados, editais para analisar e favoritos. Cada linha navega ao edital relacionado.
- Estado vazio com chamada para cadastrar o primeiro edital; skeleton durante carregamento e mensagem com opção de tentar novamente em caso de erro.

## Queries e performance

`src/services/dashboard.service.ts` agrega em paralelo as consultas existentes `getEditais()`, `getProximosEventos()` e `getDocumentosPendentes()`. As consultas aplicam a RLS existente e evitam uma consulta por edital. O Dashboard solicita até 1.000 eventos e documentos para compor contagens/listas.

`getProximosEventos()` consulta eventos não concluídos com o relacionamento do edital e ordena por data. `getDocumentosPendentes()` filtra `obrigatorio = true` e `providenciado = false`; o relacionamento fornece título/número do edital. Nenhuma migration é necessária.

## Regras de cálculo

- Inscrição aberta: evento não concluído do tipo `inscricao`, início no passado/presente e fim no futuro/presente. Sem `data_fim`, evento de dia inteiro vale até o fim do próprio dia; evento com horário usa o instante de início, sem presumir duração.
- Prazos: eventos futuros ou ainda em andamento retornados pelo service de eventos; concluídos e encerrados não entram.
- Documentos: somente obrigatórios ainda não providenciados.
- Resultados: une por `edital_id` editais com status `aguardando_resultado` e próximos eventos de resultado/convocação; um edital é exibido uma vez, priorizando seu próximo evento. Sem data conhecida, mostra “Aguardando resultado”.
- Para analisar: status `encontrado` ou `analisando`, na ordem recente já fornecida pelo serviço de editais.
- Favoritos: editais marcados como favoritos.
- Alertas: ordem por prioridade (hoje, amanhã, até dois dias, combinação de prazo/documentos, próximos eventos) e depois pela data. “Resultado previsto para hoje” expressa apenas a data cadastrada; não afirma publicação.
- O Dashboard não altera o status manual de nenhum edital.

## Como testar

```bash
npm run typecheck
npm run lint
npm run build
npm run test:auth
```

Os cenários de Dashboard em `tests/dashboard.spec.ts` simulam a API do Supabase para validar estado vazio, contagem, inscrições futuras, documentos pendentes e deduplicação de editais aguardando resultado. A aplicação de dados reais continua sujeita às políticas RLS do usuário autenticado.
