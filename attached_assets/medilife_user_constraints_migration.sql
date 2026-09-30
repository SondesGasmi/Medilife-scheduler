-- Upgrade an existing MediLife database to structured scheduling constraints.
-- The legacy staff.scheduling_constraints JSONB column is deliberately retained
-- for rollback safety, but the application no longer reads or writes it.

begin;

create table if not exists public.user_constraints (
  staff_id uuid primary key references public.staff(id) on delete cascade,
  max_hours_per_week smallint not null default 40
    check (max_hours_per_week between 1 and 168),
  min_rest_hours smallint not null default 11
    check (min_rest_hours between 0 and 24),
  max_consecutive_nights smallint not null default 2
    check (max_consecutive_nights between 0 and 14),
  can_work_night boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_constraints_updated_at on public.user_constraints;
create trigger trg_user_constraints_updated_at
  before update on public.user_constraints
  for each row execute function public.set_updated_at();

alter table public.user_constraints enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_constraints'
      and policyname = 'Authenticated read access'
  ) then
    create policy "Authenticated read access" on public.user_constraints
      for select using (auth.role() = 'authenticated');
  end if;
end;
$$;

-- Migrate compatible values from the previous JSON column when it exists.
-- Values are bounded so old free-form data cannot violate the typed table checks.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'staff'
      and column_name = 'scheduling_constraints'
  ) then
    execute $migration$
      insert into public.user_constraints (
        staff_id,
        max_hours_per_week,
        min_rest_hours,
        max_consecutive_nights,
        can_work_night
      )
      select
        s.id,
        case
          when coalesce(s.scheduling_constraints ->> 'max_hours_per_week', '') ~ '^[0-9]+$'
            then greatest(1, least(168, (s.scheduling_constraints ->> 'max_hours_per_week')::integer))
          else 40
        end,
        case
          when coalesce(s.scheduling_constraints ->> 'min_rest_hours', '') ~ '^[0-9]+$'
            then greatest(0, least(24, (s.scheduling_constraints ->> 'min_rest_hours')::integer))
          else 11
        end,
        case
          when coalesce(s.scheduling_constraints ->> 'max_consecutive_nights', '') ~ '^[0-9]+$'
            then greatest(0, least(14, (s.scheduling_constraints ->> 'max_consecutive_nights')::integer))
          else 2
        end,
        case
          when jsonb_typeof(s.scheduling_constraints -> 'can_work_night') = 'boolean'
            then (s.scheduling_constraints ->> 'can_work_night')::boolean
          when jsonb_typeof(s.scheduling_constraints -> 'no_night_shifts') = 'boolean'
            then not (s.scheduling_constraints ->> 'no_night_shifts')::boolean
          else true
        end
      from public.staff s
      on conflict (staff_id) do nothing
    $migration$;
  else
    insert into public.user_constraints (staff_id)
      select s.id from public.staff s
      on conflict (staff_id) do nothing;
  end if;
end;
$$;

commit;