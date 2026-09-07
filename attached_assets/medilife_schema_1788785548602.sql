-- ============================================================================
-- MediLife — Shift Scheduler & Act Remuneration
-- Phase 1: Database Schema (PostgreSQL / Supabase)
-- ============================================================================

-- Extensions ------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

create type staff_role as enum (
  'radiologue',
  'medecin',
  'manipulateur_radio',
  'technicien',
  'secretaire',
  'administrateur'
);

create type contract_type as enum (
  'cdi',          -- temps plein
  'temps_partiel',
  'vacataire',
  'stagiaire'
);

create type shift_type as enum (
  'matin',
  'apres_midi',
  'journee_complete',
  'garde_jour',
  'garde_nuit',
  'repos'
);

create type slot_status as enum (
  'planifie',
  'confirme',
  'annule',
  'remplace'
);

-- ============================================================================
-- TABLE: staff
-- Medical staff profiles, specialities, and scheduling constraints
-- ============================================================================

create table staff (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  email                 text unique not null,
  phone                 text,
  role                  staff_role not null,
  contract_type         contract_type not null default 'cdi',

  -- Specialities this staff member is qualified to perform (FK-checked via acts.category
  -- at the application layer; kept as text[] for flexibility since a person can cover
  -- several diagnostic domains, e.g. {'echodoppler', 'echographie_generale'})
  specialities          text[] not null default '{}',

  -- Scheduling constraints, kept flexible in JSONB rather than rigid columns
  -- because rules vary a lot per employee (e.g. no night shifts, max 2 gardes/week,
  -- unavailable_weekdays, fixed_days_off, etc.)
  scheduling_constraints jsonb not null default '{}'::jsonb,

  max_shifts_per_week   smallint not null default 5,
  max_gardes_per_month  smallint default null,

  is_active             boolean not null default true,
  hire_date             date,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_staff_role on staff(role);
create index idx_staff_active on staff(is_active) where is_active = true;
create index idx_staff_specialities on staff using gin(specialities);

-- ============================================================================
-- TABLE: acts
-- Pre-populated diagnostic acts catalogue (the 12 MediLife services) with base price
-- ============================================================================

create table acts (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,          -- short internal code, e.g. 'ECHO_ABDO_PELV'
  name_fr       text not null,                 -- display name, in French
  category      text not null,                 -- 'echographie' | 'echodoppler' | 'autre'
  base_price    numeric(10,2) not null check (base_price >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_acts_category on acts(category);

-- Seed data: the 12 reference services from the project spec
insert into acts (code, name_fr, category, base_price) values
  ('ECHO_ABDO_PELV',     'Échographie générale abdomino-pelvienne',                                             'echographie', 0),
  ('DOPPLER_RENAL',      'Echodoppler rénal',                                                                    'echodoppler', 0),
  ('DOPPLER_HEPATIQUE',  'Echodoppler hépatique',                                                                'echodoppler', 0),
  ('DOPPLER_FAV',        'Echodoppler des fistules (FAV)',                                                       'echodoppler', 0),
  ('DOPPLER_VASC_TSA_MI','Echodoppler vasculaire artériel et veineux des TSA, membre supérieur et inférieur',    'echodoppler', 0),
  ('ECHO_OSTEOARTIC',    'Échographie ostéoarticulaire',                                                         'echographie', 0),
  ('ECHO_PARTIES_MOLLES','Échographie des parties molles',                                                       'echographie', 0),
  ('ECHO_MAMMAIRE',      'Échographie mammaire',                                                                 'echographie', 0),
  ('ECHO_CERVICALE',     'Échographie cervicale',                                                                'echographie', 0),
  ('ECHO_TRANSFRONT',    'Échographie transfrontalière',                                                         'echographie', 0),
  ('ECHO_PEDIATRIQUE',   'Échographie pédiatrique (hanches, etc.)',                                              'echographie', 0),
  ('TRANSTHORACIQUE',    'Transthoracique de repérage',                                                          'echographie', 0);

-- NOTE: base_price values are placeholders (0). Update with real tariffs before go-live:
--   update acts set base_price = <value> where code = '<code>';

-- ============================================================================
-- TABLE: schedule_slots
-- One row = one staff member assigned to one shift on one date.
-- is_locked = true means the admin has manually pinned this cell; the
-- auto-generation engine must skip it during regeneration.
-- ============================================================================

create table schedule_slots (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid references staff(id) on delete set null,
  shift_date    date not null,
  shift_type    shift_type not null,
  status        slot_status not null default 'planifie',

  is_locked     boolean not null default false,
  locked_by     uuid references staff(id),   -- admin who locked the cell
  locked_at     timestamptz,

  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- one staff member can't be double-booked on the same date/shift
  constraint uq_schedule_slot unique (shift_date, shift_type, staff_id)
);

create index idx_slots_date on schedule_slots(shift_date);
create index idx_slots_staff on schedule_slots(staff_id);
create index idx_slots_date_shift on schedule_slots(shift_date, shift_type);
create index idx_slots_locked on schedule_slots(is_locked) where is_locked = true;

-- ============================================================================
-- TABLE: act_logs
-- Acts performed by staff during a shift, with automatic remuneration total.
-- ============================================================================

create table act_logs (
  id                 uuid primary key default gen_random_uuid(),
  staff_id           uuid not null references staff(id) on delete restrict,
  act_id             uuid not null references acts(id) on delete restrict,
  schedule_slot_id   uuid references schedule_slots(id) on delete set null,

  performed_at       date not null default current_date,
  quantity           smallint not null default 1 check (quantity > 0),

  -- unit_price is snapshotted from acts.base_price at entry time (via trigger)
  -- so historical remuneration stays correct even if the catalogue price changes later
  unit_price         numeric(10,2) not null,
  total_amount       numeric(10,2) not null,  -- computed by trigger: quantity * unit_price

  entered_by         uuid references staff(id),  -- who logged the act (secretary/admin)
  notes              text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_actlogs_staff on act_logs(staff_id);
create index idx_actlogs_date on act_logs(performed_at);
create index idx_actlogs_staff_date on act_logs(staff_id, performed_at);
create index idx_actlogs_slot on act_logs(schedule_slot_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- 1) generic updated_at maintenance -----------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_staff_updated_at
  before update on staff
  for each row execute function set_updated_at();

create trigger trg_acts_updated_at
  before update on acts
  for each row execute function set_updated_at();

create trigger trg_slots_updated_at
  before update on schedule_slots
  for each row execute function set_updated_at();

create trigger trg_actlogs_updated_at
  before update on act_logs
  for each row execute function set_updated_at();

-- 2) prevent edits to locked schedule slots ---------------------------------
-- Blocks changes to staff_id / shift_date / shift_type on a locked slot.
-- Unlocking (is_locked: true -> false) is always allowed, so the admin
-- can override their own lock deliberately.
create or replace function enforce_locked_slot()
returns trigger as $$
begin
  if old.is_locked = true and new.is_locked = true then
    if new.staff_id is distinct from old.staff_id
       or new.shift_date is distinct from old.shift_date
       or new.shift_type is distinct from old.shift_type then
      raise exception 'Slot % is locked and cannot be modified. Unlock it first.', old.id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_locked_slot
  before update on schedule_slots
  for each row execute function enforce_locked_slot();

-- auto-stamp locked_at when a cell gets locked
create or replace function stamp_lock_time()
returns trigger as $$
begin
  if new.is_locked = true and (old.is_locked = false or old.is_locked is null) then
    new.locked_at = now();
  elsif new.is_locked = false then
    new.locked_at = null;
    new.locked_by = null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_stamp_lock_time
  before update on schedule_slots
  for each row execute function stamp_lock_time();

-- 3) act_logs remuneration calculation --------------------------------------
-- Snapshots unit_price from acts.base_price if not explicitly provided,
-- then computes total_amount = quantity * unit_price on every insert/update.
create or replace function calculate_act_remuneration()
returns trigger as $$
begin
  if new.unit_price is null then
    select base_price into new.unit_price
    from acts
    where id = new.act_id;
  end if;

  new.total_amount = new.quantity * new.unit_price;
  return new;
end;
$$ language plpgsql;

create trigger trg_calculate_act_remuneration
  before insert or update on act_logs
  for each row execute function calculate_act_remuneration();

-- ============================================================================
-- CONVENIENCE VIEW: monthly remuneration summary per staff member
-- ============================================================================

create view v_staff_monthly_remuneration as
select
  s.id                                as staff_id,
  s.full_name,
  date_trunc('month', al.performed_at)::date as month,
  count(al.id)                        as acts_count,
  sum(al.total_amount)                as total_remuneration
from act_logs al
join staff s on s.id = al.staff_id
group by s.id, s.full_name, date_trunc('month', al.performed_at)
order by month desc, s.full_name;

-- ============================================================================
-- ROW LEVEL SECURITY (Supabase) — enabled, permissive placeholders
-- Tighten these policies once auth roles (admin/staff) are defined.
-- ============================================================================

alter table staff enable row level security;
alter table acts enable row level security;
alter table schedule_slots enable row level security;
alter table act_logs enable row level security;

create policy "Authenticated read access" on staff
  for select using (auth.role() = 'authenticated');
create policy "Authenticated read access" on acts
  for select using (auth.role() = 'authenticated');
create policy "Authenticated read access" on schedule_slots
  for select using (auth.role() = 'authenticated');
create policy "Authenticated read access" on act_logs
  for select using (auth.role() = 'authenticated');

-- Write policies intentionally omitted for Phase 1 — to be scoped to an
-- 'admin'/'secretaire' role check once the auth/roles model is designed.
