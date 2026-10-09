begin;

alter table public.eventos_edital
  add column google_event_id text null,
  add column google_calendar_id text null,
  add column google_sync_status text not null default 'not_synced',
  add column google_synced_at timestamptz null,
  add column google_sync_error text null,
  add column google_event_html_link text null,
  add constraint eventos_edital_google_sync_status_check
    check (google_sync_status in ('not_synced', 'syncing', 'synced', 'error'));

-- Google linkage is writable only by the trusted Edge Functions/service role.
revoke insert, update on public.eventos_edital from authenticated;
grant insert (user_id, edital_id, titulo, tipo, data_inicio, data_fim, dia_inteiro, descricao, concluido)
  on public.eventos_edital to authenticated;
grant update (edital_id, titulo, tipo, data_inicio, data_fim, dia_inteiro, descricao, concluido)
  on public.eventos_edital to authenticated;
grant all on public.eventos_edital to service_role;
grant select on public.editais, public.user_preferences to service_role;

create index eventos_edital_google_event_idx
  on public.eventos_edital (user_id, google_event_id)
  where google_event_id is not null;

commit;
