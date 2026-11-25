-- Prato Certo: o que o login precisa no Supabase.
-- Rode no painel do Supabase: SQL Editor → New query → cole este arquivo → Run.
-- Pode rodar de novo sem medo: nada é apagado ("if not exists" e "drop policy if exists").
--
-- O site só guarda as preferências de quem entrou: restrições, gostos e bairro.
-- O catálogo (restaurantes e pratos) fica no próprio site, em src/dados/catalogo.js.
--
-- Num projeto que já tinha o schema da versão 1 (com restaurantes, pratos, favoritos...),
-- esta tabela já existe, com algumas colunas a mais (nao_gosta, orcamento_max). Tudo bem:
-- o site usa só as colunas abaixo, e as tabelas antigas ficam paradas.

create table if not exists public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null default '',
  restricoes    text[] not null default '{}', -- vegano, vegetariano, sem_gluten, sem_lactose
  gostos        text[] not null default '{}', -- cozinhas de que gosta (italiana, japonesa...)
  bairro        text not null default '',
  atualizado_em timestamptz not null default now()
);

-- Regras de acesso (RLS): cada pessoa lê, cria, muda e apaga só o próprio perfil.
-- Sem login, ninguém lê nada. "(select auth.uid())" é calculado uma vez por consulta.
alter table public.perfis enable row level security;

drop policy if exists "Perfil: só o próprio" on public.perfis;
create policy "Perfil: só o próprio" on public.perfis
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, insert, update, delete on public.perfis to authenticated;
