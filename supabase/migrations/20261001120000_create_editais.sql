-- Fase 3. Aplicar uma única vez, integralmente, no SQL Editor ou via migrations.
begin;

create table public.editais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null check (length(btrim(titulo)) > 0),
  numero_edital text,
  instituicao text not null check (length(btrim(instituicao)) > 0),
  categoria text not null check (length(btrim(categoria)) > 0),
  cargo_curso text,
  descricao text,
  cidade text,
  estado text,
  modalidade text check (modalidade in ('presencial', 'ead', 'hibrido', 'nao_informado')),
  link_pagina text check (link_pagina is null or link_pagina ~* '^https?://[^[:space:]]+$'),
  link_inscricao text check (link_inscricao is null or link_inscricao ~* '^https?://[^[:space:]]+$'),
  link_pdf text check (link_pdf is null or link_pdf ~* '^https?://[^[:space:]]+$'),
  valor_inscricao numeric(10,2) check (valor_inscricao >= 0),
  possui_isencao boolean not null default false,
  status text not null default 'encontrado' check (status in (
    'encontrado', 'analisando', 'tenho_interesse', 'vou_participar',
    'inscricao_aberta', 'inscricao_realizada', 'aguardando_resultado',
    'aprovado', 'nao_aprovado', 'desisti', 'arquivado'
  )),
  favorito boolean not null default false,
  observacoes text,
  inscricao_realizada boolean not null default false,
  data_inscricao_realizada timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editais_inscricao_data_check check (
    (inscricao_realizada and data_inscricao_realizada is not null)
    or (not inscricao_realizada and data_inscricao_realizada is null)
  ),
  constraint editais_status_inscricao_check check (status <> 'inscricao_realizada' or inscricao_realizada)
);

-- Todos os acessos são por proprietário. O prefixo user_id também atende sua busca isolada.
create index editais_user_status_idx on public.editais (user_id, status);
create index editais_status_idx on public.editais (status);
create index editais_categoria_idx on public.editais (categoria);
create index editais_favorito_idx on public.editais (favorito);
create index editais_created_at_idx on public.editais (created_at desc);
create index editais_user_created_at_idx on public.editais (user_id, created_at desc, id desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger editais_updated_at
before update on public.editais
for each row execute function public.set_updated_at();

-- Usa o relógio do banco e mantém a regra mesmo em chamadas diretas à API.
create function public.sync_edital_inscricao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.inscricao_realizada and not new.inscricao_realizada then
    new.data_inscricao_realizada := null;
    if new.status = 'inscricao_realizada' then
      new.status := 'vou_participar';
    end if;
    return new;
  end if;

  if new.status = 'inscricao_realizada' then
    new.inscricao_realizada := true;
  end if;

  if new.inscricao_realizada then
    if tg_op = 'INSERT' then
      new.data_inscricao_realizada := now();
    elsif not old.inscricao_realizada then
      new.data_inscricao_realizada := now();
    else
      new.data_inscricao_realizada := old.data_inscricao_realizada;
    end if;
    if new.status in ('encontrado', 'analisando', 'tenho_interesse', 'vou_participar', 'inscricao_aberta') then
      new.status := 'inscricao_realizada';
    end if;
  else
    new.data_inscricao_realizada := null;
  end if;
  return new;
end;
$$;

create trigger editais_sync_inscricao
before insert or update on public.editais
for each row execute function public.sync_edital_inscricao();

alter table public.editais enable row level security;

revoke all on public.editais from public, anon, authenticated;
grant select, insert, update, delete on public.editais to authenticated;

create policy editais_select_own on public.editais
for select to authenticated
using ((select auth.uid()) = user_id);

create policy editais_insert_own on public.editais
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy editais_update_own on public.editais
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy editais_delete_own on public.editais
for delete to authenticated
using ((select auth.uid()) = user_id);

commit;
