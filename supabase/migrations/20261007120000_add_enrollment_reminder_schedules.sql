begin;

alter table public.eventos_edital
  add column lembrete_modo text not null default 'nenhum',
  add column lembrete_intervalo_dias smallint,
  add column lembrete_datas date[] not null default '{}'::date[],
  add constraint eventos_edital_lembrete_modo_check
    check (lembrete_modo in ('nenhum', 'frequencia', 'datas')),
  add constraint eventos_edital_lembrete_config_check
    check (
      (lembrete_modo = 'nenhum'
        and lembrete_intervalo_dias is null
        and cardinality(lembrete_datas) = 0)
      or (lembrete_modo = 'frequencia'
        and lembrete_intervalo_dias between 1 and 30
        and cardinality(lembrete_datas) = 0
        and tipo = 'inscricao'
        and dia_inteiro
        and data_fim is not null)
      or (lembrete_modo = 'datas'
        and lembrete_intervalo_dias is null
        and cardinality(lembrete_datas) between 1 and 366
        and tipo = 'inscricao'
        and dia_inteiro
        and data_fim is not null)
    );

-- A Fase 10 limita as colunas que o cliente authenticated pode gravar.
-- Inclui apenas as novas preferências de lembrete, mantendo metadados Google server-side.
grant insert (lembrete_modo, lembrete_intervalo_dias, lembrete_datas)
  on public.eventos_edital to authenticated;
grant update (lembrete_modo, lembrete_intervalo_dias, lembrete_datas)
  on public.eventos_edital to authenticated;

commit;
