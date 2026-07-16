-- ============================================================================
-- Seshn — DROP & RECREATE content tables (for testing)
-- Run in the Supabase SQL editor.
--
-- KEEPS (never touched): profiles, waitlist, and their triggers
--   (handle_new_user, set_updated_at) and get_waitlist_count().
--
-- DROPS & RECREATES: follows, sessions, likes, streaks, comments,
--   notifications — plus all their policies, indexes, triggers, and RPCs.
--
-- Folds in:
--   * comments.edited_at  (from 20260619120000_comment_edited_at.sql)
--   * soft_delete_session() (owner-gated SECURITY DEFINER soft-delete)
--
-- Wrapped in a transaction: if anything fails, nothing is dropped.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Drop everything we're about to rebuild. CASCADE clears FKs, indexes,
--    policies, and triggers on these tables. profiles/waitlist are not listed,
--    so they (and the auth signup trigger) are untouched.
-- ----------------------------------------------------------------------------
drop table if exists public.notifications cascade;
drop table if exists public.comments      cascade;
drop table if exists public.likes         cascade;
drop table if exists public.sessions      cascade;
drop table if exists public.streaks       cascade;
drop table if exists public.follows       cascade;

drop function if exists public.handle_like_count()            cascade;
drop function if exists public.handle_session_streak()        cascade;
drop function if exists public.handle_comment_count()         cascade;
drop function if exists public.notify_on_like()               cascade;
drop function if exists public.notify_on_comment()            cascade;
drop function if exists public.notify_on_follow()             cascade;
drop function if exists public.get_daily_focus_minutes(uuid)  cascade;
drop function if exists public.get_follow_counts(uuid)        cascade;
drop function if exists public.get_unread_notification_count() cascade;
drop function if exists public.soft_delete_session(uuid)      cascade;
drop function if exists public.soft_delete_comment(uuid)      cascade;


-- ============================================================================
-- 1. follows — social graph (defined before sessions; sessions_select reads it)
-- ============================================================================
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy follows_select on public.follows
  for select to anon, authenticated using (true);

create policy follows_insert on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()));

create policy follows_delete on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));


-- ============================================================================
-- 2. sessions — the core content object
-- ============================================================================
create table public.sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  started_at          timestamptz not null,
  ended_at            timestamptz not null,
  focus_minutes       integer not null
                      check (focus_minutes between 1 and 1440),
  pomodoros_completed integer not null default 1
                      check (pomodoros_completed between 0 and 48),
  pomodoros_planned   integer
                      check (pomodoros_planned is null
                             or pomodoros_planned between 1 and 48),
  subject             text
                      check (subject is null or char_length(subject) <= 60),
  caption             text
                      check (caption is null or char_length(caption) <= 280),
  visibility          text not null default 'public'
                      check (visibility in ('public', 'followers', 'private')),
  like_count          integer not null default 0,
  comment_count       integer not null default 0,
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  check (ended_at > started_at)
);

create index sessions_user_created_idx
  on public.sessions (user_id, created_at desc)
  where deleted_at is null;

create index sessions_feed_idx
  on public.sessions (created_at desc)
  where deleted_at is null;

alter table public.sessions enable row level security;

create policy sessions_select on public.sessions
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      visibility = 'public'
      or user_id = (select auth.uid())
      or (
        visibility = 'followers'
        and exists (
          select 1 from public.follows f
          where f.following_id = sessions.user_id
            and f.follower_id = (select auth.uid())
        )
      )
    )
  );

create policy sessions_insert on public.sessions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and like_count = 0
    and comment_count = 0
    and deleted_at is null
  );

create policy sessions_update on public.sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy sessions_delete on public.sessions
  for delete to authenticated
  using (user_id = (select auth.uid()));


-- ============================================================================
-- 3. likes — 🔥 reactions
-- ============================================================================
create table public.likes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create index likes_session_idx on public.likes (session_id);

alter table public.likes enable row level security;

create policy likes_select on public.likes
  for select to anon, authenticated using (true);

create policy likes_insert on public.likes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy likes_delete on public.likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.handle_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.sessions
      set like_count = like_count + 1
      where id = new.session_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.sessions
      set like_count = greatest(like_count - 1, 0)
      where id = old.session_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_like_changed
  after insert or delete on public.likes
  for each row execute function public.handle_like_count();


-- ============================================================================
-- 4. streaks — consecutive-day counter (1 row per user)
-- ============================================================================
create table public.streaks (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  current_streak    integer not null default 0 check (current_streak >= 0),
  longest_streak    integer not null default 0 check (longest_streak >= 0),
  last_session_date date,
  updated_at        timestamptz not null default now()
);

alter table public.streaks enable row level security;

create policy streaks_select on public.streaks
  for select to anon, authenticated using (true);

create or replace function public.handle_session_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tz text;
  session_day date;
  s public.streaks%rowtype;
begin
  select p.timezone into tz from public.profiles p where p.id = new.user_id;
  session_day := (new.ended_at at time zone coalesce(tz, 'Asia/Kolkata'))::date;

  select * into s from public.streaks where user_id = new.user_id;

  if not found then
    insert into public.streaks (user_id, current_streak, longest_streak, last_session_date)
    values (new.user_id, 1, 1, session_day);
  elsif s.last_session_date is null or session_day > s.last_session_date + 1 then
    update public.streaks
      set current_streak = 1,
          longest_streak = greatest(s.longest_streak, 1),
          last_session_date = session_day,
          updated_at = now()
      where user_id = new.user_id;
  elsif session_day = s.last_session_date + 1 then
    update public.streaks
      set current_streak = s.current_streak + 1,
          longest_streak = greatest(s.longest_streak, s.current_streak + 1),
          last_session_date = session_day,
          updated_at = now()
      where user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_session_posted
  after insert on public.sessions
  for each row execute function public.handle_session_streak();


-- ============================================================================
-- 5. Helper RPCs for sessions/follows
-- ============================================================================
create or replace function public.get_daily_focus_minutes(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(s.focus_minutes), 0)::int
  from public.sessions s
  join public.profiles p on p.id = s.user_id
  where s.user_id = p_user_id
    and s.deleted_at is null
    and (s.ended_at at time zone p.timezone)::date
        = (now() at time zone p.timezone)::date;
$$;

grant execute on function public.get_daily_focus_minutes(uuid) to anon, authenticated;

create or replace function public.get_follow_counts(p_user_id uuid)
returns table (followers integer, following integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.follows where following_id = p_user_id),
    (select count(*)::int from public.follows where follower_id  = p_user_id);
$$;

grant execute on function public.get_follow_counts(uuid) to anon, authenticated;


-- ============================================================================
-- 6. comments — flat comments on sessions (incl. edited_at)
-- ============================================================================
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);

create index comments_session_idx
  on public.comments (session_id, created_at)
  where deleted_at is null;

alter table public.comments enable row level security;

create policy comments_select on public.comments
  for select to anon, authenticated
  using (
    deleted_at is null
    and exists (select 1 from public.sessions s where s.id = comments.session_id)
  );

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and deleted_at is null
    and exists (select 1 from public.sessions s where s.id = comments.session_id)
  );

create policy comments_update on public.comments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy comments_delete on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.handle_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.sessions
      set comment_count = comment_count + 1
      where id = new.session_id;
    return new;
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
    update public.sessions
      set comment_count = greatest(comment_count - 1, 0)
      where id = new.session_id;
    return new;
  elsif tg_op = 'DELETE' and old.deleted_at is null then
    update public.sessions
      set comment_count = greatest(comment_count - 1, 0)
      where id = old.session_id;
    return old;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger on_comment_changed
  after insert or update or delete on public.comments
  for each row execute function public.handle_comment_count();


-- ============================================================================
-- 7. notifications — written ONLY by triggers; recipient-only read
-- ============================================================================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  actor_id   uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in ('like', 'comment', 'follow')),
  session_id uuid references public.sessions (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  check (
    (type = 'follow'  and session_id is null     and comment_id is null)
    or (type = 'like'    and session_id is not null and comment_id is null)
    or (type = 'comment' and session_id is not null and comment_id is not null)
  )
);

create index notifications_inbox_idx
  on public.notifications (user_id, created_at desc);

create index notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- NO INSERT POLICY: only the triggers below create rows.

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.sessions where id = new.session_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, session_id)
    values (owner, new.user_id, 'like', new.session_id);
  end if;
  return new;
end;
$$;

create trigger on_like_notify
  after insert on public.likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.sessions where id = new.session_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, session_id, comment_id)
    values (owner, new.user_id, 'comment', new.session_id, new.id);
  end if;
  return new;
end;
$$;

create trigger on_comment_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

create trigger on_follow_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.get_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.notifications
  where user_id = (select auth.uid())
    and read_at is null;
$$;

grant execute on function public.get_unread_notification_count() to authenticated;


-- ============================================================================
-- 8. soft_delete_session — owner-gated soft delete (used by the app)
--    Runs as the table owner (exempt from RLS) but only ever touches the
--    caller's own row. search_path = '' + fully-qualified names.
-- ============================================================================
create or replace function public.soft_delete_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sessions
     set deleted_at = pg_catalog.now()
   where id = p_session_id
     and user_id = (select auth.uid());
end;
$$;

revoke all on function public.soft_delete_session(uuid) from public;
grant execute on function public.soft_delete_session(uuid) to authenticated;


-- ============================================================================
-- 9. soft_delete_comment — owner-gated soft delete (used by the app)
--    Same pattern as soft_delete_session. The comment-count trigger
--    (on_comment_changed) fires on the UPDATE and decrements as usual.
-- ============================================================================
create or replace function public.soft_delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.comments
     set deleted_at = pg_catalog.now()
   where id = p_comment_id
     and user_id = (select auth.uid());
end;
$$;

revoke all on function public.soft_delete_comment(uuid) from public;
grant execute on function public.soft_delete_comment(uuid) to authenticated;

commit;
