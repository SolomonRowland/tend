-- Tend shared household database.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- It is safe to run more than once.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Home',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists members_user_idx on public.members (user_id);

-- An invite is a one-time link code the owner shares by text.
create table if not exists public.invites (
  code text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index if not exists invites_household_idx on public.invites (household_id);

-- Every task, contact and belonging is one row, so two people editing
-- different things never overwrite each other.
create table if not exists public.records (
  household_id uuid not null references public.households (id) on delete cascade,
  kind text not null check (kind in ('task', 'contact', 'item', 'meta')),
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (household_id, kind, id)
);
create index if not exists records_sync_idx on public.records (household_id, updated_at);

-- The server clock stamps every change, so phones with wrong clocks still sync.
create or replace function public.touch_record() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
  for each row execute function public.touch_record();

-- ---------- helpers ----------
create or replace function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.household_id = hid and m.user_id = auth.uid());
$$;

create or replace function public.is_owner(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.household_id = hid and m.user_id = auth.uid() and m.role = 'owner');
$$;

-- Start a household; the caller becomes its owner. One household per person.
create or replace function public.create_household(p_name text, p_display text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select household_id into hid from public.members where user_id = auth.uid() limit 1;
  if hid is not null then return hid; end if;
  insert into public.households (name, created_by) values (coalesce(nullif(trim(p_name), ''), 'Our Home'), auth.uid()) returning id into hid;
  insert into public.members (household_id, user_id, email, name, role)
    values (hid, auth.uid(), auth.jwt() ->> 'email', nullif(trim(p_display), ''), 'owner');
  return hid;
end $$;

-- Make a new invite link code (owner only). Codes are long and random.
create or replace function public.create_invite(hid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_owner(hid) then raise exception 'Only the household owner can invite'; end if;
  if (select count(*) from public.members where household_id = hid) >= 8 then raise exception 'This household already has 8 people'; end if;
  c := translate(encode(gen_random_bytes(9), 'base64'), '+/=', 'xyz');
  insert into public.invites (code, household_id, created_by) values (c, hid, auth.uid());
  return c;
end $$;

-- Join with an invite code. The code is used up when it works.
create or replace function public.accept_invite(p_code text, p_display text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.invites; existing uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into inv from public.invites where code = trim(p_code) and expires_at > now();
  if inv.code is null then raise exception 'That invite has expired or was already used. Ask for a new one.'; end if;
  select household_id into existing from public.members where user_id = auth.uid() limit 1;
  if existing is not null and existing <> inv.household_id then raise exception 'You are already in a household. Leave it first in Settings.'; end if;
  if (select count(*) from public.members where household_id = inv.household_id) >= 8 then raise exception 'This household already has 8 people'; end if;
  insert into public.members (household_id, user_id, email, name, role)
    values (inv.household_id, auth.uid(), auth.jwt() ->> 'email', nullif(trim(p_display), ''), 'member')
    on conflict (household_id, user_id) do nothing;
  delete from public.invites where code = inv.code;
  return inv.household_id;
end $$;

-- Remove someone (owner), or leave yourself. The owner can't leave while others remain.
create or replace function public.remove_member(hid uuid, uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if uid = auth.uid() then
    if public.is_owner(hid) and (select count(*) from public.members where household_id = hid) > 1 then
      raise exception 'Remove the others first, or they lose the household.';
    end if;
  elsif not public.is_owner(hid) then
    raise exception 'Only the household owner can remove people';
  end if;
  delete from public.members where household_id = hid and user_id = uid;
  if not exists (select 1 from public.members where household_id = hid) then
    delete from public.households where id = hid;
  end if;
end $$;

-- ---------- row level security ----------
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.records enable row level security;

drop policy if exists households_read on public.households;
create policy households_read on public.households for select to authenticated using (public.is_member(id));
drop policy if exists households_rename on public.households;
create policy households_rename on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_member(household_id));
drop policy if exists members_self_update on public.members;
create policy members_self_update on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists invites_read on public.invites;
create policy invites_read on public.invites for select to authenticated using (public.is_owner(household_id));
drop policy if exists invites_cancel on public.invites;
create policy invites_cancel on public.invites for delete to authenticated using (public.is_owner(household_id));

drop policy if exists records_read on public.records;
create policy records_read on public.records for select to authenticated using (public.is_member(household_id));
drop policy if exists records_add on public.records;
create policy records_add on public.records for insert to authenticated with check (public.is_member(household_id));
drop policy if exists records_change on public.records;
create policy records_change on public.records for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

-- Members can't change their own role or household through the update policy.
revoke update on public.members from authenticated;
grant update (name) on public.members to authenticated;

revoke all on public.households, public.members, public.invites, public.records from anon;
grant select on public.households to authenticated;
grant update (name) on public.households to authenticated;
grant select on public.members to authenticated;
grant select, delete on public.invites to authenticated;
grant select, insert, update on public.records to authenticated;

revoke all on function public.is_member(uuid), public.is_owner(uuid), public.create_household(text, text),
  public.create_invite(uuid), public.accept_invite(text, text), public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.is_member(uuid), public.is_owner(uuid), public.create_household(text, text),
  public.create_invite(uuid), public.accept_invite(text, text), public.remove_member(uuid, uuid) to authenticated;

-- ---------- live updates ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records') then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;

-- ---------- photos (private storage; only your household can see or add them) ----------
-- Files are stored as photos/<household id>/<task or belonging>/<file>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('photos', 'photos', false, 5242880, array['image/jpeg'])
  on conflict (id) do nothing;

create or replace function public.can_use_photo(obj text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when split_part(obj, '/', 1) ~ '^[0-9a-f-]{36}$' then public.is_member(split_part(obj, '/', 1)::uuid) else false end;
$$;
revoke all on function public.can_use_photo(text) from public, anon;
grant execute on function public.can_use_photo(text) to authenticated;

drop policy if exists tend_photos_read on storage.objects;
create policy tend_photos_read on storage.objects for select to authenticated using (bucket_id = 'photos' and public.can_use_photo(name));
drop policy if exists tend_photos_add on storage.objects;
create policy tend_photos_add on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.can_use_photo(name));
drop policy if exists tend_photos_remove on storage.objects;
create policy tend_photos_remove on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.can_use_photo(name));

-- ---------- notifications (a daily heads-up on each phone that turns them on) ----------
-- One row per phone. Only you can see or change your own phones.
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  hour int not null default 8 check (hour between 0 and 23),
  tz text not null default 'America/Chicago',
  last_sent date,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists push_own_read on public.push_subs;
create policy push_own_read on public.push_subs for select to authenticated using (user_id = auth.uid());
drop policy if exists push_own_add on public.push_subs;
create policy push_own_add on public.push_subs for insert to authenticated with check (user_id = auth.uid() and public.is_member(household_id));
drop policy if exists push_own_change on public.push_subs;
create policy push_own_change on public.push_subs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(household_id));
drop policy if exists push_own_remove on public.push_subs;
create policy push_own_remove on public.push_subs for delete to authenticated using (user_id = auth.uid());
revoke all on public.push_subs from anon;
revoke update on public.push_subs from authenticated;
grant select, delete on public.push_subs to authenticated;
grant update (hour, tz) on public.push_subs to authenticated;
-- Turning notifications on goes through this, so a phone that someone else signed out of
-- (or that moved household) can be taken over by whoever is signed in on it now.
-- Only the phone itself knows its endpoint, so holding it is proof enough.
create or replace function public.save_push_sub(p_endpoint text, p_household uuid, p_p256dh text, p_auth text, p_hour int, p_tz text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_member(p_household) then raise exception 'Not a member of that household'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then raise exception 'That doesn''t look like a phone subscription'; end if;
  insert into public.push_subs (endpoint, user_id, household_id, p256dh, auth, hour, tz)
  values (p_endpoint, auth.uid(), p_household, p_p256dh, p_auth, least(greatest(coalesce(p_hour, 8), 0), 23), left(coalesce(nullif(p_tz, ''), 'America/Chicago'), 64))
  on conflict (endpoint) do update set user_id = excluded.user_id, household_id = excluded.household_id, p256dh = excluded.p256dh,
    auth = excluded.auth, hour = excluded.hour, tz = excluded.tz, last_sent = null;
end $$;
revoke all on function public.save_push_sub(text, uuid, text, text, int, text) from public, anon;
grant execute on function public.save_push_sub(text, uuid, text, text, int, text) to authenticated;

-- The sending keys. Only the tend-notify function (service role) can read the private half.
-- cron_secret is what the hourly job shows the function, so nobody else can make it send.
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  public_key text,
  private_key text
);
alter table public.push_config alter column public_key drop not null, alter column private_key drop not null;
alter table public.push_config add column if not exists cron_secret text not null
  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
insert into public.push_config (id) values (1) on conflict (id) do nothing;
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
create or replace function public.push_public_key() returns text
language sql stable security definer set search_path = public as $$ select public_key from public.push_config where id = 1 $$;
revoke all on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;
