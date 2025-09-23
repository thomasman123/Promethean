-- Seed script: Dummy account similar to 7 Figure Sparky (Aug–Sep 2025)
-- This script creates a dummy account, grants access to two random setters and two random closers,
-- seeds contacts, dials, discoveries, appointments, and Meta Ads hierarchy with daily performance.
-- Safe to run once. Running multiple times will create additional dummy accounts with the same name.

-- 1) Create dummy account
insert into public.accounts (name, description, business_timezone)
values (
  'Dummy 7FS Similar (Aug–Sep 2025)',
  'Dummy account seeded similar to 7 Figure Sparky baseline for Aug–Sep 2025',
  'Australia/Sydney'
);

-- Reference the newly created account (most recent by created_at with that name)
with acc as (
  select id, business_timezone
  from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
)
-- 2) Grant account access to two random setters and two random closers (sales reps)
insert into public.account_access (user_id, account_id, role)
select u.id, a.id, u.role
from (
  (
    -- pick two setters
    select id, 'setter'::user_role as role
    from public.profiles
    where is_active = true and role = 'setter'
    order by random()
    limit 2
  )
  union all
  (
    -- pick two closers (prefer role sales_rep, otherwise fallback to non-setter active users)
    select id, 'sales_rep'::user_role as role
    from (
      select id from public.profiles where is_active = true and role = 'sales_rep'
      union
      select id from public.profiles where is_active = true and role in ('admin','moderator')
    ) x
    order by random()
    limit 2
  )
) u
cross join acc a
on conflict do nothing;

-- 3) Create a Meta Ad Account and a small hierarchy (2 campaigns → 2 ad sets each → 3 ads each)
with acc as (
  select id, business_timezone from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
),
ins_ad_acct as (
  insert into public.meta_ad_accounts (account_id, meta_ad_account_id, meta_ad_account_name, timezone, currency)
  select a.id, 'act_dummy_' || left(a.id::text, 8), 'Dummy FB Ad Account', 'Australia/Sydney', 'AUD'
  from acc a
  returning id, account_id
),
ins_campaigns as (
  insert into public.meta_campaigns (account_id, meta_ad_account_id, meta_campaign_id, campaign_name, status)
  select aa.account_id, aa.id, 'cmp_dummy_' || g::text, case g when 1 then 'Dummy Prospecting' else 'Dummy Retargeting' end, 'ACTIVE'
  from ins_ad_acct aa,
       generate_series(1,2) g
  returning id, account_id
),
ins_adsets as (
  insert into public.meta_ad_sets (account_id, meta_campaign_id, meta_ad_set_id, ad_set_name, status, daily_budget)
  select c.account_id, c.id, 'adset_dummy_' || c.id::text || '_' || gs::text,
         'AS ' || gs::text || ' - AU Wide', 'ACTIVE', 100
  from ins_campaigns c,
       generate_series(1,2) gs
  returning id, account_id
)
insert into public.meta_ads (account_id, meta_ad_set_id, meta_ad_id, ad_name, status)
select s.account_id, s.id, 'ad_dummy_' || s.id::text || '_' || ga::text,
       'Creative ' || ga::text, 'ACTIVE'
from ins_adsets s,
     generate_series(1,3) ga;

-- 4) Seed contacts for Aug–Sep 2025 (create a pool of contacts used across events)
with acc as (
  select id, business_timezone from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
),
name_pool as (
  select ('DummyFirst' || gs)::text as first_name,
         ('DummyLast' || gs)::text as last_name,
         ('dummy' || gs || '@example.com')::text as email,
         (date '2025-08-01' + ((gs % 61)) )::timestamptz at time zone 'UTC' as dt
  from generate_series(1, 600) gs
)
insert into public.contacts (account_id, ghl_contact_id, first_name, last_name, name, email, phone, source, date_added, date_updated, ghl_created_at, ghl_local_date, ghl_local_week, ghl_local_month)
select a.id,
       'ghl_dummy_' || md5(np.email),
       np.first_name,
       np.last_name,
       np.first_name || ' ' || np.last_name,
       np.email,
       '+61' || lpad((100000000 + (random()*899999999)::int)::text, 9, '0'),
       'MetaAds',
       np.dt, np.dt,
       np.dt,
       (np.dt at time zone a.business_timezone)::date,
       date_trunc('week', (np.dt at time zone a.business_timezone))::date,
       date_trunc('month', (np.dt at time zone a.business_timezone))::date
from acc a
join name_pool np on true;

-- 5) Seed appointments and discoveries for each day with realistic variance
--    Weekdays: more volume; Weekends: lower volume
with acc as (
  select id, business_timezone from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
),
setters as (
  select p.id, coalesce(nullif(p.full_name,''), 'Setter') as name
  from public.profiles p
  join acc a on true
  join public.account_access aa on aa.user_id = p.id and aa.account_id = a.id and aa.role = 'setter'
),
closers as (
  select p.id, coalesce(nullif(p.full_name,''), 'Closer') as name
  from public.profiles p
  join acc a on true
  join public.account_access aa on aa.user_id = p.id and aa.account_id = a.id and aa.role = 'sales_rep'
),
calendar as (
  select dd::date as d,
         extract(dow from dd)::int as dow
  from generate_series(date '2025-08-01', date '2025-09-30', interval '1 day') dd
),
-- counts per day
counts as (
  select c.d,
         c.dow,
         -- appointments per day
         (case when c.dow between 1 and 5 then 4 + floor(random()*5)::int else 1 + floor(random()*2)::int end) as appt_count,
         -- discoveries per day
         (case when c.dow between 1 and 5 then 2 + floor(random()*4)::int else floor(random()*2)::int end) as disc_count
  from calendar c
),
-- insert discoveries
ins_discoveries as (
  insert into public.discoveries (
    account_id, setter, date_booked_for, date_booked, show_outcome, lead_quality,
    created_at, updated_at, setter_user_id, sales_rep, sales_rep_user_id,
    ghl_source, source_category, specific_source, data_filled, local_date, local_week, local_month, contact_id
  )
  select a.id,
         s.name,
         (c.d + time '10:00') at time zone a.business_timezone,
         (c.d + time '09:30') at time zone a.business_timezone,
         case when random() < 0.6 then 'booked' else 'not booked' end,
         3 + floor(random()*3)::int,
         now(), now(),
         s.id,
         cl.name,
         cl.id,
         'Meta Lead', 'paid_social', 'Meta - Dummy',
         true,
         c.d,
         date_trunc('week', c.d)::date,
         date_trunc('month', c.d)::date,
         -- link to a random contact
         (select id from public.contacts where account_id = a.id order by random() limit 1)
  from counts c
  join acc a on true
  join lateral (select id, name from setters order by random() limit 1) s on true
  join lateral (select id, name from closers order by random() limit 1) cl on true
  where c.disc_count > 0
  -- materialize repeats according to disc_count per day
  , lateral generate_series(1, c.disc_count) g
  returning id, account_id, date_booked, local_date
),
-- insert appointments
ins_appointments as (
  insert into public.appointments (
    account_id, setter, sales_rep, call_outcome, show_outcome, pitched, watched_assets,
    lead_quality, objections, date_booked_for, date_booked, setter_user_id, sales_rep_user_id,
    cash_collected, total_sales_value, pif, ghl_source, source_category, specific_source,
    data_filled, local_date, local_week, local_month, contact_id
  )
  select a.id,
         s.name,
         cl.name,
         case when random() < 0.75 then 'Show' else 'No Show' end,
         case when random() < 0.25 then 'won' when random() < 0.6 then 'lost' else 'follow up' end,
         (random() < 0.5), (random() < 0.5),
         3 + floor(random()*3)::int,
         '{}'::jsonb,
         (c.d + time '14:00') at time zone a.business_timezone,
         (c.d + time '13:00') at time zone a.business_timezone,
         s.id,
         cl.id,
         case when random() < 0.25 then (500 + floor(random()*2000))::numeric else 0 end,
         case when random() < 0.25 then (1500 + floor(random()*5000))::numeric else 0 end,
         false,
         'Meta Lead', 'paid_social', 'Meta - Dummy',
         true,
         c.d,
         date_trunc('week', c.d)::date,
         date_trunc('month', c.d)::date,
         (select id from public.contacts where account_id = a.id order by random() limit 1)
  from counts c
  join acc a on true
  join lateral (select id, name from setters order by random() limit 1) s on true
  join lateral (select id, name from closers order by random() limit 1) cl on true
  where c.appt_count > 0
  , lateral generate_series(1, c.appt_count) g
  returning id, account_id, date_booked, setter_user_id, sales_rep_user_id, contact_id, local_date
)
select 1;

-- 6) Link booked discoveries to appointments (same day), and create some follow-up links
with acc as (
  select id, business_timezone from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
)
update public.discoveries d
set linked_appointment_id = ap.id,
    updated_at = now()
from acc
join public.appointments ap on ap.account_id = acc.id and ap.local_date = d.local_date
where d.account_id = acc.id and d.show_outcome = 'booked' and d.linked_appointment_id is null;

-- 7) Seed general dials per day with realistic variance; weekends low, weekdays high
with acc as (
  select id, business_timezone from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
),
setters as (
  select p.id, coalesce(nullif(p.full_name,''), 'Setter') as name
  from public.profiles p
  join acc a on true
  join public.account_access aa on aa.user_id = p.id and aa.account_id = a.id and aa.role = 'setter'
),
calendar as (
  select dd::date as d,
         extract(dow from dd)::int as dow
  from generate_series(date '2025-08-01', date '2025-09-30', interval '1 day') dd
),
volumes as (
  select c.d,
         c.dow,
         (case when c.dow between 1 and 5 then 350 + floor(random()*150)::int else 30 + floor(random()*40)::int end) as dial_count
  from calendar c
)
insert into public.dials (
  setter, duration, answered, meaningful_conversation, call_recording_link, date_called,
  setter_user_id, account_id, booked, local_date, local_week, local_month, contact_id
)
select s.name,
       (15 + floor(random()*345)::int),
       (random() < 0.12),
       (random() < 0.06),
       null,
       ((v.d + time '10:00') + make_interval(hours := floor(random()*9)::int, minutes := floor(random()*60)::int)) at time zone a.business_timezone,
       s.id,
       a.id,
       false,
       v.d,
       date_trunc('week', v.d)::date,
       date_trunc('month', v.d)::date,
       null
from volumes v
join acc a on true
join setters s on true
, lateral generate_series(1, v.dial_count) g;

-- 8) Create and link a booked dial within 15–45 minutes before each appointment
with acc as (
  select id, business_timezone from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
),
setters as (
  select p.id, coalesce(nullif(p.full_name,''), 'Setter') as name
  from public.profiles p
  join acc a on true
  join public.account_access aa on aa.user_id = p.id and aa.account_id = a.id and aa.role = 'setter'
)
insert into public.dials (
  setter, duration, answered, meaningful_conversation, date_called,
  setter_user_id, account_id, booked, booked_appointment_id,
  local_date, local_week, local_month, contact_id
)
select s.name,
       (60 + floor(random()*240)::int),
       true,
       (random() < 0.7),
       a.date_booked - make_interval(minutes := (15 + floor(random()*31))::int),
       s.id,
       a.account_id,
       true,
       a.id,
       a.local_date,
       a.local_week,
       a.local_month,
       a.contact_id
from acc ac
join public.appointments a on a.account_id = ac.id
join lateral (select id, name from setters order by random() limit 1) s on true;

-- 9) Seed Meta Ad daily performance for each ad for Aug–Sep 2025, varying by weekday vs weekend
with acc as (
  select id, business_timezone from public.accounts
  where name = 'Dummy 7FS Similar (Aug–Sep 2025)'
  order by created_at desc
  limit 1
),
ads as (
  select id, account_id from public.meta_ads where account_id = (select id from acc)
),
calendar as (
  select dd::date as d,
         extract(dow from dd)::int as dow
  from generate_series(date '2025-08-01', date '2025-09-30', interval '1 day') dd
)
insert into public.meta_ad_performance_daily (
  account_id, meta_ad_id, date, impressions, clicks, spend, reach, frequency,
  cpm, cpc, ctr, created_at, updated_at
)
select a.id as account_id,
       ad.id as meta_ad_id,
       c.d,
       (case when c.dow between 1 and 5 then 15000 + floor(random()*12000)::bigint else 7000 + floor(random()*6000)::bigint end) as impressions,
       (case when c.dow between 1 and 5 then 250 + floor(random()*300)::bigint else 100 + floor(random()*120)::bigint end) as clicks,
       (case when c.dow between 1 and 5 then (200 + floor(random()*150))::numeric else (120 + floor(random()*100))::numeric end) as spend,
       (case when c.dow between 1 and 5 then 9000 + floor(random()*6000)::bigint else 4000 + floor(random()*4000)::bigint end) as reach,
       (1.1 + random()*0.7)::numeric,
       0::numeric,
       0::numeric,
       0::numeric,
       now(), now()
from acc a
join ads ad on ad.account_id = a.id
join calendar c on true; 