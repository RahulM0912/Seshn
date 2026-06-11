-- ============================================================================
-- waitlist — landing-page email capture (pre-launch)
-- Anyone (anonymous) can join; nobody can read the list via the public API.
-- Reads happen in the Supabase dashboard or with the server/secret key only.
-- ============================================================================

create table public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Allow anonymous + authenticated visitors to sign up (INSERT only).
-- No SELECT/UPDATE/DELETE policy => those are default-denied via the API,
-- so the email list can't be scraped from the browser.
create policy waitlist_insert on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Expose ONLY the aggregate count (not the rows). SECURITY DEFINER bypasses
-- RLS so the count is accurate, while emails remain unreadable via the API.
create or replace function public.get_waitlist_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.waitlist;
$$;

grant execute on function public.get_waitlist_count() to anon, authenticated;
