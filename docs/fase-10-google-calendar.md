# Fase 10 — Sincronização EditalTrack → Google Calendar

## Arquitetura e segurança

- O EditalTrack continua sendo a fonte de verdade. Frontend chama somente Edge Functions autenticadas; Google Calendar API, access-token refresh e banco com service role são usados exclusivamente no backend.
- `google-calendar-sync-events` recebe de 1 a 25 IDs, deriva o usuário do JWT Supabase, carrega cada evento por `id + user_id` e verifica a conexão do mesmo usuário. Processa em sequência e devolve resultados individuais/resumo; falha de um evento não desfaz os demais.
- Um claim atômico pelo status impede sincronizações simultâneas. Status `syncing` abandonado por mais de cinco minutos pode ser retomado. Para insert, a função persiste antes um Google event ID aleatório válido e usa `events.insert`; retries reconciliam com `events.patch`, evitando duplicatas mesmo se a resposta do Google se perder.
- `google-calendar-delete-event` remove só o vínculo remoto. `events.delete` 404/410 é considerado sucesso; qualquer outro erro mantém o vínculo e o evento interno. Exclusão conjunta no UI só apaga o evento interno depois de remover o remoto com sucesso. “Excluir apenas do EditalTrack” deixa explicitamente o item órfão no Google.
- `google-calendar-mark-pending` registra edições locais de evento já vinculado; o formulário salva primeiro no EditalTrack e tenta atualizar no Google depois. Erro remoto não reverte a edição interna.
- As Edge Functions validam JWT em cada chamada, validam a propriedade do evento e usam queries do service role sempre filtradas pelo usuário derivado do JWT. Access/refresh tokens continuam criptografados com AES-GCM; não são retornados/logados. Se o refresh retornar `invalid_grant`, a sincronização marca erro e a mensagem pede reconexão.
- A migration só adiciona colunas/status em `eventos_edital`; não cria tabelas. RLS existente permanece. A migration também restringe `INSERT/UPDATE` do role `authenticated` às colunas editáveis do evento; metadados `google_*` são gravados pelo service role das funções.

## API e payload

As funções novas são `google-calendar-sync-events`, `google-calendar-delete-event` e `google-calendar-mark-pending`, todas com `verify_jwt=true` em `supabase/config.toml`. O callback OAuth e os demais endpoints da Fase 9 continuam inalterados.

A migration `20261007120000_add_enrollment_reminder_schedules.sql` adiciona os campos de agendamento à tabela `eventos_edital` e concede ao usuário autenticado escrita apenas nesses novos campos, preservando os metadados Google restritos ao backend. Aplique-a antes de publicar as Edge Functions atualizadas.

Sincroniza no calendário `primary` por padrão e usa `google_calendar_id` existente caso haja um. Evento novo chama `events.insert`; evento com `google_event_id` chama `events.patch`. O ID remoto/link/data/status ficam em `eventos_edital` e são inacessíveis para escrita direta pelo usuário autenticado.

O título é `[EditalTrack] {título}`. A descrição inclui edital, instituição, tipo, descrição (se houver), links oficiais/inscrição (se houver) e a frase “Criado automaticamente pelo EditalTrack.”. O `htmlLink` retornado é persistido e exibido como link externo com `noopener noreferrer`.

## Datas e lembretes

- Dia inteiro: converte cada instante para a data civil do timezone da preferência; `start.date` usa a data inicial e `end.date` é exclusivo (dia final inclusivo + um dia). Sem `data_fim`, duração de um dia.
- Evento com horário: envia instantes ISO em `start.dateTime/end.dateTime`, com `timeZone` da preferência ou fallback `America/Fortaleza`. Sem `data_fim`, duração padrão de uma hora.
- Lembretes são lidos de `user_preferences.default_reminders`, enviados como popup com `useDefault:false`; no máximo cinco, inteiros únicos entre 0 e 40320 minutos. Dados inválidos geram erro controlado, sem payload inválido ao Google.
- Eventos do tipo Inscrição podem configurar lembretes no período: sem repetição, frequência de 1–30 dias, ou seleção de datas. No modo de frequência entram o primeiro dia, o dia seguinte, os próximos conforme o intervalo e o último dia. Na seleção manual, início e fim são fixos e os dias intermediários são escolhidos. O Google Calendar recebe uma série de ocorrências de dia inteiro (RDATE), cada uma com os popups padrão configurados.
- A sincronização é unidirecional. Não há watch/webhook, importação nem monitoramento de alterações feitas diretamente no Google Calendar.

## UI e lote

Nos cards de evento e detalhes rápidos do Calendário, o usuário pode adicionar/atualizar, remover somente do Google e abrir o link Google quando disponível. Sem conexão, a tela orienta a conectar em Configurações. Alterar um evento vinculado salva primeiro localmente e tenta sincronizar; falhas ficam visíveis.

Em `/editais/:id`, “Sincronizar cronograma” permite seleção explícita; inicia selecionando apenas eventos pendentes não concluídos, não todos nem os já sincronizados. Até 25 eventos podem ser enviados por lote, sequencialmente. O resultado mostra sincronizados/falhas e mantém falhas selecionadas para retry.

## Validação e limitações

Playwright mocka Edge Functions/Google; `tests/google-event-payload.spec.ts` cobre all-day, fuso horário, duração, descrição e limites de lembretes. Não chamar APIs Google reais nos testes. Para teste manual, use a conexão da Fase 9: sincronize um evento, confira título/data/lembretes no Google, edite e atualize, remova só do Google e confirme que o evento interno permanece; por fim teste lote, falha parcial e exclusão conjunta. Não há sincronização bidirecional nem exclusão remota automática ao escolher excluir somente no EditalTrack.
