-- Run this entire file in Supabase: SQL Editor -> New query -> Run.
-- This design lets anyone submit answers, but only the signed-in owner can read them.

create extension if not exists pgcrypto;

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  public_id text not null unique,
  title text not null default 'DoYouKnowMe?',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  kind text not null default 'text' check (kind in ('text','long')),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  respondent_name text not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.forms enable row level security;
alter table public.questions enable row level security;
alter table public.responses enable row level security;

drop policy if exists "Public can view active forms" on public.forms;
create policy "Public can view active forms" on public.forms
for select to anon, authenticated using (is_active = true);

drop policy if exists "Owner manages own forms" on public.forms;
create policy "Owner manages own forms" on public.forms
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Public can view active questions" on public.questions;
create policy "Public can view active questions" on public.questions
for select to anon, authenticated using (
  is_active = true and exists (
    select 1 from public.forms f where f.id = form_id and f.is_active = true
  )
);

drop policy if exists "Owner manages own questions" on public.questions;
create policy "Owner manages own questions" on public.questions
for all to authenticated using (owner_id = auth.uid()) with check (
  owner_id = auth.uid() and exists (
    select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid()
  )
);

drop policy if exists "Anyone can submit responses" on public.responses;
create policy "Anyone can submit responses" on public.responses
for insert to anon, authenticated with check (
  length(trim(respondent_name)) between 1 and 80
  and exists (select 1 from public.forms f where f.id = form_id and f.is_active = true)
);

drop policy if exists "Only owner can read responses" on public.responses;
create policy "Only owner can read responses" on public.responses
for select to authenticated using (
  exists (select 1 from public.forms f where f.id = form_id and f.owner_id = auth.uid())
);

-- No public update/delete policies are intentionally created for responses.
