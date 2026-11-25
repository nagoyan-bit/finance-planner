create table if not exists public.finance_push (
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null,
 subscription jsonb not null,
 primary key(user_id,endpoint),
 check (length(endpoint) <= 4096),
 check (jsonb_typeof(subscription) = 'object')
);
alter table public.finance_push enable row level security;
revoke all on public.finance_push from anon;
grant select,insert,update,delete on public.finance_push to authenticated;
drop policy if exists own_push on public.finance_push;
create policy own_push on public.finance_push for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create table if not exists public.finance_reminders (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null,
 dates date[] not null default '{}',
 updated_at timestamptz not null default now()
);
alter table public.finance_reminders enable row level security;
revoke all on public.finance_reminders from anon,authenticated;
create or replace function public.finance_set_reminders(p_revision bigint,p_dates date[])
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(cardinality(p_dates),0)>91 then raise exception 'invalid request'; end if;
 if not exists(select 1 from public.finance_state where user_id=auth.uid() and revision=p_revision) then raise exception 'stale revision'; end if;
 insert into public.finance_reminders(user_id,revision,dates)
 values(auth.uid(),p_revision,coalesce(p_dates,'{}'))
 on conflict(user_id) do update set revision=excluded.revision,dates=excluded.dates,updated_at=now()
 where finance_reminders.revision<=excluded.revision;
end; $$;
revoke all on function public.finance_set_reminders(bigint,date[]) from public,anon;
grant execute on function public.finance_set_reminders(bigint,date[]) to authenticated;
create table if not exists public.finance_push_sent (
 user_id uuid not null,
 endpoint text not null,
 send_date date not null,
 primary key(user_id,endpoint,send_date)
);
alter table public.finance_push_sent enable row level security;
revoke all on public.finance_push_sent from anon,authenticated;
