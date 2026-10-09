-- Fase 4. Criar tabela de eventos/cronograma dos editais.
begin;

create table public.eventos_edital (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  edital_id uuid not null references public.editais(id) on delete cascade,
  titulo text not null check (length(btrim(titulo)) > 0),
  tipo text not null default 'outro' check (tipo in (
    'publicacao', 'inscricao', 'isencao', 'pagamento', 'envio_documentos',
    'homologacao', 'prova', 'entrevista', 'avaliacao_titulos',
    'resultado_preliminar', 'recurso', 'resultado_recurso',
    'resultado_final', 'matricula', 'convocacao', 'outro'
  )),
  data_inicio timestamptz not null,
  data_fim timestamptz,
  dia_inteiro boolean not null default true,
  descricao text,
  concluido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eventos_edital_data_fim_check check (
    data_fim is null or data_fim >= data_inicio
  )
);

-- Índices para consultas frequentes
create index eventos_edital_user_id_idx on public.eventos_edital (user_id);
create index eventos_edital_edital_id_idx on public.eventos_edital (edital_id);
create index eventos_edital_data_inicio_idx on public.eventos_edital (data_inicio);
create index eventos_edital_tipo_idx on public.eventos_edital (tipo);
create index eventos_edital_concluido_idx on public.eventos_edital (concluido);
create index eventos_edital_user_data_inicio_idx on public.eventos_edital (user_id, data_inicio);

-- Trigger de updated_at reutiliza a função da Fase 3
create trigger eventos_edital_updated_at
before update on public.eventos_edital
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.eventos_edital enable row level security;

revoke all on public.eventos_edital from public, anon, authenticated;
grant select, insert, update, delete on public.eventos_edital to authenticated;

-- SELECT: usuário vê apenas seus eventos
create policy eventos_edital_select_own on public.eventos_edital
for select to authenticated
using (
  (select auth.uid()) = user_id
);

-- INSERT: usuário só pode criar eventos para seus próprios editais
create policy eventos_edital_insert_own on public.eventos_edital
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.editais
    where editais.id = eventos_edital.edital_id
      and editais.user_id = auth.uid()
  )
);

-- UPDATE: usuário só pode atualizar seus próprios eventos
create policy eventos_edital_update_own on public.eventos_edital
for update to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.editais
    where editais.id = eventos_edital.edital_id
      and editais.user_id = auth.uid()
  )
);

-- DELETE: usuário só pode excluir seus próprios eventos
create policy eventos_edital_delete_own on public.eventos_edital
for delete to authenticated
using (
  (select auth.uid()) = user_id
);

commit;