
-- ROLES
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text not null default 'Package',
  created_at timestamptz not null default now()
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ITEMS
create type public.item_type as enum ('lost','found');
create type public.item_status as enum ('active','under_review','recovered','removed');

create sequence public.report_seq start 1042;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique default ('FB-' || to_char(now(),'YY') || '-' || lpad(nextval('public.report_seq')::text, 5, '0')),
  type public.item_type not null,
  title text not null,
  category_id uuid references public.categories(id),
  description text not null default '',
  color text,
  brand text,
  unique_features text,
  event_date date not null default current_date,
  event_time text,
  location text not null default '',
  area text,
  photo_url text,
  reward text,
  contact_preference text default 'in_app',
  current_location text,
  willing_to_handover boolean default true,
  status public.item_status not null default 'active',
  reporter_id uuid,
  reporter_name text,
  flagged boolean not null default false,
  recovered_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.items to anon;
grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;
create policy "items public read" on public.items for select to anon, authenticated using (status <> 'removed' or reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "items insert own" on public.items for insert to authenticated with check (reporter_id = auth.uid());
create policy "items update own or admin" on public.items for update to authenticated using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "items delete own or admin" on public.items for delete to authenticated using (reporter_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- CLAIMS
create type public.claim_status as enum ('pending','under_review','verified','rejected','recovered');
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  claimant_id uuid not null,
  claimant_name text,
  identifying_details text not null default '',
  answers jsonb not null default '{}'::jsonb,
  status public.claim_status not null default 'pending',
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
grant select, insert, update on public.claims to authenticated;
grant all on public.claims to service_role;
alter table public.claims enable row level security;
create policy "claims read involved" on public.claims for select to authenticated using (
  claimant_id = auth.uid()
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.items i where i.id = claims.item_id and i.reporter_id = auth.uid())
);
create policy "claims insert own" on public.claims for insert to authenticated with check (claimant_id = auth.uid());
create policy "claims update owner or admin" on public.claims for update to authenticated using (
  public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.items i where i.id = claims.item_id and i.reporter_id = auth.uid())
);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  kind text not null default 'info',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications insert" on public.notifications for insert to authenticated with check (true);
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ACTIVITY LOGS
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
alter table public.activity_logs enable row level security;
create policy "logs admin read" on public.activity_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "logs insert" on public.activity_logs for insert to authenticated with check (true);

-- SEED CATEGORIES
insert into public.categories (name, slug, icon) values
 ('Electronics','electronics','Smartphone'),
 ('Bags & Backpacks','bags','Backpack'),
 ('ID & Documents','documents','IdCard'),
 ('Keys','keys','KeyRound'),
 ('Wallets & Cards','wallets','Wallet'),
 ('Clothing','clothing','Shirt'),
 ('Books & Stationery','books','BookOpen'),
 ('Accessories','accessories','Watch'),
 ('Sports & Fitness','sports','Dumbbell'),
 ('Other','other','Package');

-- SEED ITEMS
insert into public.items (type,title,category_id,description,color,brand,unique_features,event_date,event_time,location,area,reporter_name,status,reward,current_location,recovered_at)
values
 ('lost','Student ID Card - Aarav Mehta',(select id from public.categories where slug='documents'),'College ID card with lanyard, roll number printed on the front. Lost somewhere between the library and the canteen.','Blue','Campus Issue','Blue lanyard with department logo', current_date - 3,'Around 2:30 PM','Central Library','North Campus','Aarav M.','active',null,null,null),
 ('found','Blue Student ID Card with lanyard',(select id from public.categories where slug='documents'),'Found an ID card near the library reading room stairs. Name partially visible.','Blue','Campus Issue','Attached to a blue lanyard', current_date - 2,'Evening','Library Reading Room','North Campus','Security Desk','active',null,'Security Desk, Block A',null),
 ('lost','Black Wildcraft Backpack',(select id from public.categories where slug='bags'),'Black backpack with laptop sleeve, contains notebooks and a charger.','Black','Wildcraft','Small red keychain on the zipper', current_date - 6,'Morning','Bus Stop, Gate 2','South Campus','Ishita R.','active','₹500',null,null),
 ('found','Black backpack left in Lecture Hall 4',(select id from public.categories where slug='bags'),'Backpack found after the afternoon lecture, handed to department office.','Black','Wildcraft','Red keychain, laptop sleeve inside', current_date - 5,'Afternoon','Lecture Hall 4','South Campus','Prof. Nair','active',null,'Department Office',null),
 ('lost','Apple AirPods Pro (2nd Gen)',(select id from public.categories where slug='electronics'),'White charging case with a small scratch on the back. Lost during the sports meet.','White','Apple','Scratch on rear of case, engraved initials AK', current_date - 9,'Around 5 PM','Sports Ground','East Campus','Arjun K.','recovered','₹1000',null, now() - interval '2 days'),
 ('found','AirPods case near the running track',(select id from public.categories where slug='electronics'),'Found a white earbuds case on the bleachers after the meet.','White','Apple','Engraved initials on the case', current_date - 9,'Evening','Sports Ground Bleachers','East Campus','Meera S.','recovered',null,'Sports Office', now() - interval '2 days'),
 ('lost','Casio FX-991EX Calculator',(select id from public.categories where slug='books'),'Scientific calculator with my name written on the back sticker.','Grey','Casio','Name sticker on the rear panel', current_date - 1,'11:00 AM','Exam Hall B','North Campus','Rohan P.','active',null,null,null),
 ('found','Laptop charger left in Computer Lab 2',(select id from public.categories where slug='electronics'),'65W type-C charger with a braided cable found under a desk.','Black','Dell','Braided cable, blue tape on the brick', current_date - 4,'Evening','Computer Lab 2','West Campus','Lab Assistant','active',null,'Computer Lab 2 Store',null),
 ('lost','Steel water bottle with stickers',(select id from public.categories where slug='accessories'),'1L steel bottle covered in band stickers.','Silver','Milton','Covered in music band stickers', current_date - 7,'Lunch time','Canteen Block C','Central','Nikita J.','active',null,null,null),
 ('found','Brown leather wallet',(select id from public.categories where slug='wallets'),'Wallet found near the parking area. Contains cards, no cash removed.','Brown','Hidesign','Stitched initials inside the flap', current_date - 2,'Morning','Parking Lot B','South Campus','Guard, Lot B','under_review',null,'Security Office',null),
 ('lost','Bunch of keys with a blue tag',(select id from public.categories where slug='keys'),'Three keys on a ring with a blue plastic tag and a bike key.','Blue','—','Blue plastic tag, bike key included', current_date - 5,'Unknown','Hostel Block D','Residence','Sameer T.','active',null,null,null),
 ('found','Folder with college documents',(select id from public.categories where slug='documents'),'Transparent folder with mark sheets and admission papers found in the admin block.','Transparent','—','Contains admission papers', current_date - 3,'Afternoon','Admin Block Reception','Central','Reception','active',null,'Admin Block Reception',null);

insert into public.activity_logs (actor_name, action, detail) values
 ('System','seed','Demo dataset loaded'),
 ('Meera S.','item_recovered','AirPods Pro returned to Arjun K.');
