-- ============================================================
--  מערכת בקרת כניסה לחניה (ANPR) — סכמת Supabase / Postgres
--  גרסה 1.0 — כניסה בלבד
--  אזור זמן לחישובים: Asia/Jerusalem
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- profiles: תפקידי משתמשים לדשבורד (מקושר ל-auth.users של Supabase)
-- ----------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'viewer' check (role in ('admin','viewer')),
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- gate_devices: סוכנים/מכשירים באתר
-- ----------------------------------------------------------------
create table public.gate_devices (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  location      text,
  relay_ip      inet,
  relay_port    int  not null default 502,
  relay_unit_id int  not null default 1,
  relay_channel int  not null default 0,           -- ערוץ הממסר (0-7)
  last_seen     timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- vehicles: רכבים מורשים
--  plate = מנורמל (ספרות בלבד); plate_display = לתצוגה
-- ----------------------------------------------------------------
create table public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  plate         text not null unique,              -- ספרות בלבד, אורך 7-8
  plate_display text,                              -- XX-XXX-XX וכד'
  owner_name    text,
  vehicle_type  text default 'car' check (vehicle_type in ('car','truck','other')),
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.vehicles (plate) where active;

-- ----------------------------------------------------------------
-- access_rules: כללי הרשאה (אחד-לרבים מול רכב)
-- ----------------------------------------------------------------
create table public.access_rules (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  rule_type    text not null check (rule_type in ('always','weekly','date_range','one_time')),
  days_of_week int[]   default '{}',   -- 0=ראשון .. 6=שבת (ל-weekly)
  time_from    time,                   -- חלון שעות (אופציונלי בכל הסוגים פרט ל-always)
  time_to      time,
  valid_from   date,                   -- ל-date_range / one_time
  valid_to     date,                   -- ל-date_range
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index on public.access_rules (vehicle_id) where active;

-- ----------------------------------------------------------------
-- access_events: יומן כל מעבר (כולל דחיות ולוחיות לא מזוהות)
-- ----------------------------------------------------------------
create table public.access_events (
  id                uuid primary key default gen_random_uuid(),
  device_id         uuid references public.gate_devices(id) on delete set null,
  captured_at       timestamptz not null default now(),
  plate_read        text,                          -- הלוחית שזוהתה (מנורמל)
  plate_display     text,
  matched_vehicle_id uuid references public.vehicles(id) on delete set null,
  decision          text not null check (decision in ('granted','denied','unrecognized')),
  reason            text,                           -- הסבר קצר להחלטה
  confidence        numeric(4,3),                   -- 0..1
  gate_opened       boolean not null default false,
  snapshot_path     text,                           -- נתיב ב-Storage bucket הפרטי
  created_at        timestamptz not null default now()
);
create index on public.access_events (captured_at desc);
create index on public.access_events (decision, captured_at desc);
create index on public.access_events (plate_read);

-- ----------------------------------------------------------------
-- manual_actions: פתיחות ידניות מהדשבורד
-- ----------------------------------------------------------------
create table public.manual_actions (
  id          uuid primary key default gen_random_uuid(),
  device_id   uuid references public.gate_devices(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null default 'manual_open',
  created_at  timestamptz not null default now()
);

-- ============================================================
--  פונקציית הכרעה (לנוחות הדשבורד; הסוכן משכפל לוגיקה זו מקומית)
--  מחזירה true אם לרכב יש כלל פעיל שמתקיים כעת (זמן ירושלים)
-- ============================================================
create or replace function public.is_vehicle_granted(p_plate text, p_now timestamptz default now())
returns boolean language plpgsql stable as $$
declare
  v_id  uuid;
  v_now timestamptz := p_now at time zone 'Asia/Jerusalem';
  v_dow int := extract(dow from v_now);   -- 0=ראשון..6=שבת
  v_t   time := v_now::time;
  v_d   date := v_now::date;
  r     record;
begin
  select id into v_id from public.vehicles where plate = p_plate and active limit 1;
  if v_id is null then return false; end if;

  for r in select * from public.access_rules where vehicle_id = v_id and active loop
    if r.rule_type = 'always' then
      return true;
    elsif r.rule_type = 'weekly' then
      if v_dow = any(r.days_of_week)
         and (r.time_from is null or v_t between r.time_from and r.time_to) then
        return true;
      end if;
    elsif r.rule_type = 'date_range' then
      if v_d between coalesce(r.valid_from, v_d) and coalesce(r.valid_to, v_d)
         and (r.time_from is null or v_t between r.time_from and r.time_to) then
        return true;
      end if;
    elsif r.rule_type = 'one_time' then
      if v_d = r.valid_from
         and (r.time_from is null or v_t between r.time_from and r.time_to) then
        return true;
      end if;
    end if;
  end loop;
  return false;
end; $$;

-- ============================================================
--  שמירת נתונים (retention): מחיקת אירועים ישנים מ-60 יום
--  הריצו כ-cron (pg_cron) או מ-job בסוכן
-- ============================================================
create or replace function public.purge_old_events(p_days int default 60)
returns int language plpgsql as $$
declare deleted int;
begin
  delete from public.access_events where captured_at < now() - (p_days || ' days')::interval;
  get diagnostics deleted = row_count;
  return deleted;
end; $$;

-- ============================================================
--  RLS — אבטחה
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.vehicles      enable row level security;
alter table public.access_rules  enable row level security;
alter table public.access_events enable row level security;
alter table public.gate_devices  enable row level security;
alter table public.manual_actions enable row level security;

-- משתמש מאומת רואה את הנתונים; כתיבה/עריכה רק ל-admin.
-- הסוכן ניגש עם service_role (עוקף RLS) לכתיבת אירועים וקריאת רשימות.

create policy "auth read vehicles"  on public.vehicles      for select to authenticated using (true);
create policy "admin write vehicles" on public.vehicles     for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "auth read rules"  on public.access_rules     for select to authenticated using (true);
create policy "admin write rules" on public.access_rules    for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "auth read events" on public.access_events    for select to authenticated using (true);

create policy "auth read devices" on public.gate_devices    for select to authenticated using (true);
create policy "admin write devices" on public.gate_devices  for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "auth read manual" on public.manual_actions   for select to authenticated using (true);
create policy "auth insert manual" on public.manual_actions for insert to authenticated with check (true);

-- הערה: ליצור ב-Storage bucket פרטי בשם 'plate-snapshots' עם גישה למאומתים בלבד.
