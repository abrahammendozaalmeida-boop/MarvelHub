-- Marvel Hub: sincronización de perfil, favoritos e historial
-- Ejecuta este archivo en Supabase > SQL Editor.
-- No contiene claves ni secretos.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    avatar text not null default '🦸',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
    user_id uuid not null references auth.users(id) on delete cascade,
    media_id bigint not null,
    media_type text not null check (media_type in ('movie', 'tv')),
    title text not null default '',
    poster_path text not null default '',
    backdrop_path text not null default '',
    overview text not null default '',
    release_date text not null default '',
    vote_average numeric not null default 0,
    saved_at timestamptz not null default now(),
    primary key (user_id, media_id, media_type)
);

create table if not exists public.history (
    user_id uuid not null references auth.users(id) on delete cascade,
    media_id bigint not null,
    media_type text not null check (media_type in ('movie', 'tv')),
    title text not null default '',
    poster_path text not null default '',
    backdrop_path text not null default '',
    overview text not null default '',
    release_date text not null default '',
    vote_average numeric not null default 0,
    viewed_at timestamptz not null default now(),
    primary key (user_id, media_id, media_type)
);

create index if not exists favorites_user_id_idx
    on public.favorites using btree (user_id);

create index if not exists history_user_id_idx
    on public.history using btree (user_id);

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.history enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.favorites from anon, authenticated;
revoke all on table public.history from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.favorites to authenticated;
grant select, insert, update, delete on table public.history to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can delete their own profile"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can view their own favorites" on public.favorites;
drop policy if exists "Users can create their own favorites" on public.favorites;
drop policy if exists "Users can update their own favorites" on public.favorites;
drop policy if exists "Users can delete their own favorites" on public.favorites;

create policy "Users can view their own favorites"
on public.favorites
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own favorites"
on public.favorites
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own favorites"
on public.favorites
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own favorites"
on public.favorites
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own history" on public.history;
drop policy if exists "Users can create their own history" on public.history;
drop policy if exists "Users can update their own history" on public.history;
drop policy if exists "Users can delete their own history" on public.history;

create policy "Users can view their own history"
on public.history
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own history"
on public.history
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own history"
on public.history
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own history"
on public.history
for delete
to authenticated
using ((select auth.uid()) = user_id);
