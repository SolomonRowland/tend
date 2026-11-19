-- Checks the household privacy rules in schema.sql. Fails loudly on the first broken rule.
\set ON_ERROR_STOP 1
insert into auth.users values
  ('11111111-1111-1111-1111-111111111111', 'sol@x.com'),
  ('22222222-2222-2222-2222-222222222222', 'kelly@x.com'),
  ('33333333-3333-3333-3333-333333333333', 'stranger@x.com');
create or replace function public.t_as(uid text, email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false), set_config('request.jwt.claims', json_build_object('sub', uid, 'email', email)::text, false); $$;
create or replace function public.t_expect(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'RULE BROKEN: %', what; end if; raise notice 'ok: %', what; end $$;
create or replace function public.t_fails(q text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return true; end $$;
grant execute on function public.t_as(text, text), public.t_expect(boolean, text), public.t_fails(text) to authenticated, anon;
set client_min_messages = notice;
set role authenticated;
do $$
declare hid uuid; hid2 uuid; code text; n int;
begin
  perform t_as('11111111-1111-1111-1111-111111111111', 'sol@x.com');
  hid := create_household('Rowland Home', 'Solomon');
  perform t_expect(create_household('Again', 'Solomon') = hid, 'one household per person');
  insert into records (household_id, kind, id, data) values (hid, 'task', 't1', '{"name":"Rotate tires"}');
  code := create_invite(hid);
  perform t_expect(length(code) >= 10, 'invite codes are long');

  perform t_as('22222222-2222-2222-2222-222222222222', 'kelly@x.com');
  select count(*) into n from records; perform t_expect(n = 0, 'outsider sees no records');
  perform t_expect(t_fails(format('insert into records (household_id, kind, id, data) values (%L, ''task'', ''x'', ''{}'')', hid)), 'outsider cannot write');
  perform t_expect(t_fails(format('select create_invite(%L)', hid)), 'outsider cannot invite');
  perform t_expect(t_fails('select accept_invite(''wrongcode'', ''Kelly'')'), 'bad code refused');
  perform t_expect(accept_invite(code, 'Kelly') = hid, 'invite joins the household');
  perform t_expect(t_fails(format('select accept_invite(%L, ''Kelly'')', code)), 'invite works only once');
  select count(*) into n from records; perform t_expect(n = 1, 'member sees records');
  update records set data = '{"name":"Rotate tires","x":1}' where id = 't1';
  perform t_expect((select updated_by from records where id = 't1') = auth.uid(), 'server stamps who changed it');
  perform t_expect(t_fails('update members set role = ''owner'' where user_id = auth.uid()'), 'member cannot make themself owner');
  perform t_expect(t_fails(format('select remove_member(%L, ''11111111-1111-1111-1111-111111111111'')', hid)), 'member cannot remove the owner');
  perform t_expect(t_fails('delete from records'), 'nobody hard-deletes records');

  perform t_as('33333333-3333-3333-3333-333333333333', 'stranger@x.com');
  select count(*) into n from records; perform t_expect(n = 0, 'stranger sees no records');
  select count(*) into n from members; perform t_expect(n = 0, 'stranger sees no members');
  select count(*) into n from households; perform t_expect(n = 0, 'stranger sees no households');
  hid2 := create_household('Other', 'Stranger');
  perform t_expect(t_fails(format('insert into records (household_id, kind, id, data) values (%L, ''task'', ''y'', ''{}'')', hid)), 'cannot write into another household');

  perform t_as('11111111-1111-1111-1111-111111111111', 'sol@x.com');
  insert into storage.objects (bucket_id, name) values ('photos', hid || '/t1/a.jpg');
  perform t_expect(t_fails(format('insert into storage.objects (bucket_id, name) values (''photos'', %L)', hid2 || '/t1/b.jpg')), 'cannot add a photo to another household');
  perform t_expect(t_fails('insert into storage.objects (bucket_id, name) values (''photos'', ''not-a-household/t1/c.jpg'')'), 'odd photo paths refused');
  perform t_as('22222222-2222-2222-2222-222222222222', 'kelly@x.com');
  select count(*) into n from storage.objects; perform t_expect(n = 1, 'member sees household photos');
  perform t_as('33333333-3333-3333-3333-333333333333', 'stranger@x.com');
  select count(*) into n from storage.objects; perform t_expect(n = 0, 'stranger sees no photos');
  delete from storage.objects; 
  perform t_as('11111111-1111-1111-1111-111111111111', 'sol@x.com');
  select count(*) into n from storage.objects; perform t_expect(n = 1, 'stranger cannot delete photos');
  perform t_expect(t_fails(format('select remove_member(%L, ''11111111-1111-1111-1111-111111111111'')', hid)), 'owner cannot leave while others remain');
  perform remove_member(hid, '22222222-2222-2222-2222-222222222222');
  perform t_as('22222222-2222-2222-2222-222222222222', 'kelly@x.com');
  select count(*) into n from records; perform t_expect(n = 0, 'removed member loses access');
end $$;
reset role;
set role anon;
do $$ begin perform t_expect(t_fails('select count(*) from records'), 'signed-out visitors see nothing'); end $$;
reset role;
-- clean up so the browser tests start empty
truncate public.records, public.invites, public.members, public.households cascade;
delete from storage.objects;
delete from auth.users;
