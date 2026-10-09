-- Fase 5. Criar tabela de documentos dos editais.
begin;

create table public.documentos_edital (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  edital_id uuid not null references public.editais(id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  descricao text,
  obrigatorio boolean not null default true,
  providenciado boolean not null default false,
  enviado boolean not null default false,
  observacao text,
  ordem integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_edital_enviado_implies_providenciado check (
    not enviado or providenciado
  )
);

-- Índices para consultas frequentes
create index documentos_edital_user_id_idx on public.documentos_edital (user_id);
create index documentos_edital_edital_id_idx on public.documentos_edital (edital_id);
create index documentos_edital_obrigatorio_idx on public.documentos_edital (obrigatorio);
create index documentos_edital_providenciado_idx on public.documentos_edital (providenciado);
create index documentos_edital_enviado_idx on public.documentos_edital (enviado);
create index documentos_edital_edital_ordem_idx on public.documentos_edital (edital_id, ordem);

-- Trigger de updated_at reutiliza a função da Fase 3
create trigger documentos_edital_updated_at
before update on public.documentos_edital
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.documentos_edital enable row level security;

revoke all on public.documentos_edital from public, anon, authenticated;
grant select, insert, update, delete on public.documentos_edital to authenticated;

-- SELECT: usuário vê apenas seus documentos
create policy documentos_edital_select_own on public.documentos_edital
for select to authenticated
using (
  (select auth.uid()) = user_id
);

-- INSERT: usuário só pode criar documentos para seus próprios editais
create policy documentos_edital_insert_own on public.documentos_edital
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.editais
    where editais.id = documentos_edital.edital_id
      and editais.user_id = auth.uid()
  )
);

-- UPDATE: usuário só pode atualizar seus próprios documentos
create policy documentos_edital_update_own on public.documentos_edital
for update to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.editais
    where editais.id = documentos_edital.edital_id
      and editais.user_id = auth.uid()
  )
);

-- DELETE: usuário só pode excluir seus próprios documentos
create policy documentos_edital_delete_own on public.documentos_edital
for delete to authenticated
using (
  (select auth.uid()) = user_id
);

commit;