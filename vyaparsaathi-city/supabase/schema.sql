-- Raw field observations allow anonymous inserts only.
-- Review/export raw records through the Supabase dashboard with owner access.
create table if not exists footfall (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  city text not null,
  ward_id text,
  spot_name text,
  lat double precision,
  lng double precision,
  start_time timestamptz,
  duration_min int default 10,
  count int not null,
  day_type text
);

create table if not exists rents (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  city text not null,
  ward_id text,
  lat double precision,
  lng double precision,
  kind text,
  size_sqft numeric,
  rent_month numeric
);

create table if not exists prices (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  city text not null,
  lat double precision,
  lng double precision,
  item text,
  unit text,
  price numeric,
  supplier_type text,
  transport numeric
);

alter table footfall enable row level security;
alter table rents enable row level security;
alter table prices enable row level security;

drop policy if exists "anyone can add footfall" on footfall;
create policy "anyone can add footfall" on footfall for insert to anon with check (count >= 0 and count < 5000 and duration_min = 10 and city in ('pune', 'bengaluru') and length(spot_name) between 1 and 200);
drop policy if exists "anyone can read footfall" on footfall;
drop policy if exists "anyone can add rents" on rents;
create policy "anyone can add rents" on rents for insert to anon with check (rent_month > 0 and size_sqft > 0 and city in ('pune', 'bengaluru'));
drop policy if exists "anyone can read rents" on rents;
drop policy if exists "anyone can add prices" on prices;
create policy "anyone can add prices" on prices for insert to anon with check (price > 0 and transport >= 0 and length(item) between 1 and 200 and city in ('pune', 'bengaluru'));
drop policy if exists "anyone can read prices" on prices;
