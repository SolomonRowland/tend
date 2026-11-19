-- The Ministry Table database.
-- It can share a Supabase project with Tend Home: every table starts with "ed_",
-- so nothing touches Tend's data.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- It is safe to run more than once.

-- ---------- accounts ----------
-- A ministry account. Up to 10 people share it.
create table if not exists public.ed_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ed_members (
  org_id uuid not null references public.ed_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  name text,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists ed_members_user_idx on public.ed_members (user_id);

-- An invite is a one-time link code the owner shares by text or email.
create table if not exists public.ed_invites (
  code text primary key,
  org_id uuid not null references public.ed_orgs (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create index if not exists ed_invites_org_idx on public.ed_invites (org_id);

-- ---------- events ----------
create table if not exists public.ed_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.ed_orgs (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{4,60}$'),
  title text not null check (length(title) between 1 and 120),
  dates text not null default '',
  starts_on date,
  place text not null default '',
  about text not null default '',
  contact text not null default '',
  giving_link text not null default '',
  is_open boolean not null default true,
  sections text[] not null default '{}',
  created_at timestamptz not null default now()
);
-- Which sections an event uses (empty means all). Added after the first version.
alter table public.ed_events add column if not exists sections text[] not null default '{}';
create index if not exists ed_events_org_idx on public.ed_events (org_id);

-- Things the public can sign up for: a serve slot or a meal item.
create table if not exists public.ed_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ed_events (id) on delete cascade,
  kind text not null check (kind in ('serve', 'meal')),
  title text not null check (length(title) between 1 and 120),
  day text not null default '',
  needed int not null default 1 check (needed between 1 and 500),
  notes text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ed_items_event_idx on public.ed_items (event_id);

-- One person signed up for one item. The token lets them cancel without an account.
create table if not exists public.ed_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ed_events (id) on delete cascade,
  item_id uuid not null references public.ed_items (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  phone text not null default '',
  email text not null default '',
  note text not null default '',
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ed_signups_event_idx on public.ed_signups (event_id);
create index if not exists ed_signups_item_idx on public.ed_signups (item_id);

-- A connection card filled out at the event, and its follow-up.
create table if not exists public.ed_contacts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ed_events (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  phone text not null default '',
  email text not null default '',
  responses text[] not null default '{}',
  prayer text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'connected')),
  follow_up_by text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ed_contacts_event_idx on public.ed_contacts (event_id);

-- Everything only the team sees: speakers, worship team, vendors, setup and
-- teardown tasks, agendas, offerings, expenses, equipment and what each event packs.
-- event_id is empty for the ministry's Directory: people, vendors, contacts,
-- equipment and budget lines shared by every event.
create table if not exists public.ed_records (
  org_id uuid not null references public.ed_orgs (id) on delete cascade,
  id text not null check (length(id) between 6 and 64),
  event_id uuid references public.ed_events (id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (org_id, id)
);
alter table public.ed_records drop constraint if exists ed_records_kind_check;
alter table public.ed_records add constraint ed_records_kind_check check (kind in
  ('speaker', 'worship', 'team', 'vendor', 'task', 'agenda', 'offering', 'expense', 'pack', 'gear', 'person', 'contact', 'budget'));
create index if not exists ed_records_event_idx on public.ed_records (event_id);
create index if not exists ed_records_org_kind_idx on public.ed_records (org_id, kind);

create or replace function public.ed_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists ed_records_touch on public.ed_records;
create trigger ed_records_touch before insert or update on public.ed_records
  for each row execute function public.ed_touch();

-- ---------- helpers ----------
create or replace function public.ed_is_member(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ed_members m where m.org_id = oid and m.user_id = auth.uid());
$$;

create or replace function public.ed_is_owner(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ed_members m where m.org_id = oid and m.user_id = auth.uid() and m.role = 'owner');
$$;

create or replace function public.ed_can_event(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ed_events e join public.ed_members m on m.org_id = e.org_id
                 where e.id = eid and m.user_id = auth.uid());
$$;

create or replace function public.ed_clip(t text, n int) returns text
language sql immutable set search_path = public as $$
  select left(trim(coalesce(t, '')), n);
$$;

-- ---------- account functions ----------
-- Start a ministry account; the caller becomes its owner.
create or replace function public.ed_create_org(p_name text, p_display text) returns uuid
language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select org_id into oid from public.ed_members where user_id = auth.uid() limit 1;
  if oid is not null then return oid; end if;
  insert into public.ed_orgs (name, created_by) values (coalesce(nullif(ed_clip(p_name, 120), ''), 'Our Ministry'), auth.uid()) returning id into oid;
  insert into public.ed_members (org_id, user_id, email, name, role)
    values (oid, auth.uid(), auth.jwt() ->> 'email', nullif(ed_clip(p_display, 80), ''), 'owner');
  return oid;
end $$;

-- Make an invite code (owner only). An account holds at most 10 people.
create or replace function public.ed_create_invite(oid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.ed_is_owner(oid) then raise exception 'Only the account owner can invite people'; end if;
  if (select count(*) from public.ed_members where org_id = oid) >= 10 then raise exception 'This account already has 10 people'; end if;
  c := replace(gen_random_uuid()::text, '-', '');
  insert into public.ed_invites (code, org_id, created_by) values (c, oid, auth.uid());
  return c;
end $$;

-- Join with an invite code. The code is used up when it works.
create or replace function public.ed_accept_invite(p_code text, p_display text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.ed_invites; existing uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into inv from public.ed_invites where code = trim(p_code) and expires_at > now();
  if inv.code is null then raise exception 'That invite has expired or was already used. Ask for a new one.'; end if;
  select org_id into existing from public.ed_members where user_id = auth.uid() limit 1;
  if existing is not null and existing <> inv.org_id then raise exception 'You are already on another ministry account. Leave it first in Account.'; end if;
  if (select count(*) from public.ed_members where org_id = inv.org_id) >= 10 then raise exception 'This account already has 10 people'; end if;
  insert into public.ed_members (org_id, user_id, email, name, role)
    values (inv.org_id, auth.uid(), auth.jwt() ->> 'email', nullif(ed_clip(p_display, 80), ''), 'member')
    on conflict (org_id, user_id) do nothing;
  delete from public.ed_invites where code = inv.code;
  return inv.org_id;
end $$;

-- Remove someone (owner), or leave yourself. The owner can't leave while others remain.
create or replace function public.ed_remove_member(oid uuid, uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if uid = auth.uid() then
    if public.ed_is_owner(oid) and (select count(*) from public.ed_members where org_id = oid) > 1 then
      raise exception 'Remove the others first, or they lose the account.';
    end if;
  elsif not public.ed_is_owner(oid) then
    raise exception 'Only the account owner can remove people';
  end if;
  delete from public.ed_members where org_id = oid and user_id = uid;
  if not exists (select 1 from public.ed_members where org_id = oid) then
    delete from public.ed_orgs where id = oid;
  end if;
end $$;

-- ---------- public (no account) ----------
-- The sign-up page: event details, items, how many are taken, and first names only.
create or replace function public.ed_public(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare ev public.ed_events; res jsonb;
begin
  select * into ev from public.ed_events where slug = lower(trim(p_slug));
  if ev.id is null then return null; end if;
  select jsonb_build_object(
    'event', jsonb_build_object('slug', ev.slug, 'title', ev.title, 'dates', ev.dates, 'place', ev.place,
      'about', ev.about, 'contact', ev.contact, 'giving_link', ev.giving_link, 'is_open', ev.is_open, 'sections', to_jsonb(ev.sections),
      'ministry', (select name from public.ed_orgs where id = ev.org_id)),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'title', i.title, 'day', i.day,
        'needed', i.needed, 'notes', i.notes,
        'names', coalesce((select jsonb_agg(split_part(s.name, ' ', 1) order by s.created_at)
                           from public.ed_signups s where s.item_id = i.id), '[]'::jsonb))
        order by i.sort, i.created_at)
      from public.ed_items i where i.event_id = ev.id), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Sign up for a slot or meal. Returns the cancel token.
create or replace function public.ed_sign(p_slug text, p_item uuid, p_name text, p_phone text, p_email text, p_note text)
returns text language plpgsql security definer set search_path = public as $$
declare ev public.ed_events; it public.ed_items; taken int; tok text;
  nm text := ed_clip(p_name, 80); ph text := ed_clip(p_phone, 40); em text := lower(ed_clip(p_email, 120));
begin
  select * into ev from public.ed_events where slug = lower(trim(p_slug));
  if ev.id is null then raise exception 'This event was not found.'; end if;
  if not ev.is_open then raise exception 'Sign-ups for this event are closed.'; end if;
  select * into it from public.ed_items where id = p_item and event_id = ev.id for update;
  if it.id is null then raise exception 'That spot was removed. Refresh the page.'; end if;
  if nm = '' then raise exception 'Please add your name.'; end if;
  if ph = '' and em = '' then raise exception 'Please add a phone number or email so the team can reach you.'; end if;
  if exists (select 1 from public.ed_signups where item_id = it.id and lower(name) = lower(nm)
             and ((ph <> '' and phone = ph) or (em <> '' and email = em))) then
    raise exception 'You are already signed up for this one.';
  end if;
  select count(*) into taken from public.ed_signups where item_id = it.id;
  if taken >= it.needed then raise exception 'That one just filled up. Please pick another.'; end if;
  insert into public.ed_signups (event_id, item_id, name, phone, email, note)
    values (ev.id, it.id, nm, ph, em, ed_clip(p_note, 300)) returning token into tok;
  return tok;
end $$;

-- Cancel your own sign-up with its token.
create or replace function public.ed_unsign(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.ed_signups where token = p_token and length(p_token) >= 20;
$$;

-- What this phone signed up for (the page keeps the tokens).
create or replace function public.ed_mine(p_tokens text[]) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('token', s.token, 'item_id', s.item_id, 'name', s.name)), '[]'::jsonb)
  from public.ed_signups s where s.token = any (coalesce(p_tokens[1:50], '{}'));
$$;

-- Fill out a connection card.
create or replace function public.ed_connect(p_slug text, p_name text, p_phone text, p_email text, p_responses text[], p_prayer text)
returns void language plpgsql security definer set search_path = public as $$
declare ev public.ed_events; nm text := ed_clip(p_name, 80);
begin
  select * into ev from public.ed_events where slug = lower(trim(p_slug));
  if ev.id is null then raise exception 'This event was not found.'; end if;
  if nm = '' then raise exception 'Please add your name.'; end if;
  if (select count(*) from public.ed_contacts where event_id = ev.id and created_at > now() - interval '1 minute') > 60 then
    raise exception 'Lots of cards are coming in. Please try again in a minute.';
  end if;
  insert into public.ed_contacts (event_id, name, phone, email, responses, prayer)
    values (ev.id, nm, ed_clip(p_phone, 40), lower(ed_clip(p_email, 120)),
            coalesce((select array_agg(ed_clip(r, 60)) from unnest(p_responses[1:10]) r where trim(r) <> ''), '{}'),
            ed_clip(p_prayer, 2000));
end $$;

-- ---------- row level security ----------
alter table public.ed_orgs enable row level security;
alter table public.ed_members enable row level security;
alter table public.ed_invites enable row level security;
alter table public.ed_events enable row level security;
alter table public.ed_items enable row level security;
alter table public.ed_signups enable row level security;
alter table public.ed_contacts enable row level security;
alter table public.ed_records enable row level security;

drop policy if exists ed_orgs_read on public.ed_orgs;
create policy ed_orgs_read on public.ed_orgs for select to authenticated using (public.ed_is_member(id));
drop policy if exists ed_orgs_rename on public.ed_orgs;
create policy ed_orgs_rename on public.ed_orgs for update to authenticated using (public.ed_is_owner(id)) with check (public.ed_is_owner(id));

drop policy if exists ed_members_read on public.ed_members;
create policy ed_members_read on public.ed_members for select to authenticated using (public.ed_is_member(org_id));
drop policy if exists ed_members_self on public.ed_members;
create policy ed_members_self on public.ed_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ed_invites_read on public.ed_invites;
create policy ed_invites_read on public.ed_invites for select to authenticated using (public.ed_is_owner(org_id));
drop policy if exists ed_invites_cancel on public.ed_invites;
create policy ed_invites_cancel on public.ed_invites for delete to authenticated using (public.ed_is_owner(org_id));

drop policy if exists ed_events_all on public.ed_events;
create policy ed_events_all on public.ed_events for all to authenticated using (public.ed_is_member(org_id)) with check (public.ed_is_member(org_id));
drop policy if exists ed_items_all on public.ed_items;
create policy ed_items_all on public.ed_items for all to authenticated using (public.ed_can_event(event_id)) with check (public.ed_can_event(event_id));
drop policy if exists ed_signups_all on public.ed_signups;
create policy ed_signups_all on public.ed_signups for all to authenticated using (public.ed_can_event(event_id)) with check (public.ed_can_event(event_id));
drop policy if exists ed_contacts_all on public.ed_contacts;
create policy ed_contacts_all on public.ed_contacts for all to authenticated using (public.ed_can_event(event_id)) with check (public.ed_can_event(event_id));
drop policy if exists ed_records_all on public.ed_records;
create policy ed_records_all on public.ed_records for all to authenticated
  using (public.ed_is_member(org_id))
  with check (public.ed_is_member(org_id) and (event_id is null or exists (
    select 1 from public.ed_events e where e.id = event_id and e.org_id = ed_records.org_id)));

revoke all on public.ed_orgs, public.ed_members, public.ed_invites, public.ed_events, public.ed_items,
  public.ed_signups, public.ed_contacts, public.ed_records from anon;
revoke all on public.ed_orgs, public.ed_members, public.ed_invites from authenticated;
grant select on public.ed_orgs, public.ed_members to authenticated;
grant update (name) on public.ed_orgs, public.ed_members to authenticated;
grant select, delete on public.ed_invites to authenticated;
grant select, insert, update, delete on public.ed_events, public.ed_items, public.ed_signups, public.ed_contacts, public.ed_records to authenticated;
-- An event can't be moved to another ministry's account.
revoke update (org_id) on public.ed_events from authenticated;

revoke all on function public.ed_is_member(uuid), public.ed_is_owner(uuid), public.ed_can_event(uuid),
  public.ed_create_org(text, text), public.ed_create_invite(uuid), public.ed_accept_invite(text, text),
  public.ed_remove_member(uuid, uuid), public.ed_public(text), public.ed_sign(text, uuid, text, text, text, text),
  public.ed_unsign(text), public.ed_mine(text[]), public.ed_connect(text, text, text, text, text[], text) from public;
grant execute on function public.ed_is_member(uuid), public.ed_is_owner(uuid), public.ed_can_event(uuid),
  public.ed_create_org(text, text), public.ed_create_invite(uuid), public.ed_accept_invite(text, text),
  public.ed_remove_member(uuid, uuid) to authenticated;
grant execute on function public.ed_public(text), public.ed_sign(text, uuid, text, text, text, text),
  public.ed_unsign(text), public.ed_mine(text[]), public.ed_connect(text, text, text, text, text[], text) to anon, authenticated;
