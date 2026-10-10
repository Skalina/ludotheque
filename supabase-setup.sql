-- À exécuter dans Supabase > SQL Editor (une seule fois, relançable sans risque).
-- Un jeu = une ligne : on n'envoie que les jeux modifiés, pas toute la collection.

create table if not exists public.games (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Depuis mai 2026, les nouvelles tables ne sont plus exposées à l'API automatiquement :
-- il faut des droits explicites (sinon l'app reçoit "permission denied", code 42501).
grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update, delete on public.games to service_role;

-- Sécurité par ligne : chacun ne voit et ne modifie que ses propres jeux.
alter table public.games enable row level security;

drop policy if exists "select own" on public.games;
drop policy if exists "insert own" on public.games;
drop policy if exists "update own" on public.games;
drop policy if exists "delete own" on public.games;

create policy "select own" on public.games for select to authenticated using (auth.uid() = user_id);
create policy "insert own" on public.games for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.games for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.games for delete to authenticated using (auth.uid() = user_id);

-- Optionnel : l'ancienne table d'essai n'est plus utilisée.
-- drop table if exists public.game_libraries;
