create table if not exists public.finance_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null check (revision > 0),
 payload jsonb not null check (jsonb_typeof(payload) = 'object')
);
alter table public.finance_state enable row level security;
revoke all on public.finance_state from anon;
grant select, insert, update on public.finance_state to authenticated;
create policy finance_read on public.finance_state for select to authenticated using (auth.uid() = user_id);
create policy finance_insert on public.finance_state for insert to authenticated with check (auth.uid() = user_id);
create policy finance_update on public.finance_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
