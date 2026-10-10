-- Вместе: общий бюджет пары.
-- Вставьте весь файл в Supabase → SQL Editor → Run.
-- Список категорий совпадает с src/domain/defaults.ts.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique check (char_length(invite_code) = 8),
  currency text not null default 'RUB',
  monthly_budget numeric(12, 2) not null default 0 check (monthly_budget >= 0 and monthly_budget < 100000000),
  pace_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  primary key (household_id, user_id)
);

drop index if exists public.one_household_per_user;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  planned_amount numeric(12, 2) not null default 0 check (planned_amount >= 0 and planned_amount < 100000000),
  kind text not null check (kind in ('fixed', 'pace')),
  icon text not null default 'food',
  sort_order integer not null default 0
);

create index if not exists categories_household_idx
  on public.categories (household_id, sort_order);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0 and amount < 100000000),
  spent_on date not null,
  note text not null default '',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.households add column if not exists currency text not null default 'RUB';
alter table public.households add column if not exists monthly_budget numeric(12, 2) not null default 0;
alter table public.households add column if not exists pace_enabled boolean not null default true;
alter table public.categories add column if not exists icon text not null default 'food';
alter table public.expenses add column if not exists note text not null default '';

create index if not exists expenses_household_day_idx
  on public.expenses (household_id, spent_on);

create or replace function public.is_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  code text;
  inserted boolean := false;
  i integer;
  budget_name text;
  person_name text;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти';
  end if;

  person_name := left(trim(coalesce(p_display_name, '')), 40);
  if char_length(person_name) < 1 then
    raise exception 'Введите имя';
  end if;

  budget_name := left(trim(coalesce(p_name, '')), 60);
  if char_length(budget_name) < 1 then
    budget_name := 'Наш бюджет';
  end if;

  for i in 1..5 loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.households (name, invite_code)
      values (budget_name, code)
      returning id into hid;
      inserted := true;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  if not inserted then
    raise exception 'Не получилось создать код. Попробуйте ещё раз';
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (hid, auth.uid(), 'owner', person_name);

  insert into public.categories (household_id, name, planned_amount, kind, icon, sort_order)
  values
    (hid, 'Жильё', 0, 'fixed', 'home', 0),
    (hid, 'Коммунальные', 0, 'fixed', 'bill', 1),
    (hid, 'Подписки', 0, 'fixed', 'card', 2),
    (hid, 'Еда', 0, 'pace', 'food', 3),
    (hid, 'Транспорт', 0, 'pace', 'car', 4),
    (hid, 'Покупки', 0, 'pace', 'shop', 5),
    (hid, 'Развлечения', 0, 'pace', 'game', 6),
    (hid, 'Здоровье', 0, 'pace', 'heart', 7),
    (hid, 'Кафе', 0, 'pace', 'coffee', 8);

  return hid;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  person_name text;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти';
  end if;

  person_name := left(trim(coalesce(p_display_name, '')), 40);
  if char_length(person_name) < 1 then
    raise exception 'Введите имя';
  end if;

  select id into hid
  from public.households
  where invite_code = upper(trim(coalesce(p_code, '')));

  if hid is null then
    raise exception 'Код не найден';
  end if;

  if exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  ) then
    return hid;
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (hid, auth.uid(), 'member', person_name);

  return hid;
end;
$$;

drop function if exists public.leave_household();

create or replace function public.leave_household(p_hid uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid := p_hid;
  n integer;
  remaining integer;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти';
  end if;

  if hid is null then
    select count(*) into n
    from public.household_members
    where user_id = auth.uid();
    if n = 0 then
      return;
    end if;
    if n > 1 then
      raise exception 'Выберите бюджет';
    end if;
    select household_id into hid
    from public.household_members
    where user_id = auth.uid();
  end if;

  if not exists (
    select 1 from public.household_members
    where user_id = auth.uid() and household_id = hid
  ) then
    return;
  end if;

  delete from public.household_members
  where user_id = auth.uid() and household_id = hid;

  select count(*) into remaining
  from public.household_members
  where household_id = hid;

  if remaining = 0 then
    delete from public.households where id = hid;
    return;
  end if;

  if not exists (
    select 1 from public.household_members
    where household_id = hid and role = 'owner'
  ) then
    perform set_config('vmeste.transfer_owner', '1', true);
    update public.household_members
    set role = 'owner'
    where household_id = hid
      and user_id = (
        select user_id from public.household_members
        where household_id = hid
        limit 1
      );
  end if;
end;
$$;

create or replace function public.remove_member(p_hid uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти';
  end if;
  if p_user is null or p_user = auth.uid() then
    raise exception 'Не получилось';
  end if;
  if not public.is_member(p_hid) then
    raise exception 'Это не ваш бюджет';
  end if;
  if not exists (
    select 1 from public.household_members
    where household_id = p_hid and user_id = p_user
  ) then
    return;
  end if;

  delete from public.household_members
  where household_id = p_hid and user_id = p_user;

  select count(*) into remaining
  from public.household_members
  where household_id = p_hid;

  if remaining = 0 then
    delete from public.households where id = p_hid;
    return;
  end if;

  if not exists (
    select 1 from public.household_members
    where household_id = p_hid and role = 'owner'
  ) then
    perform set_config('vmeste.transfer_owner', '1', true);
    update public.household_members
    set role = 'owner'
    where household_id = p_hid
      and user_id = (
        select user_id from public.household_members
        where household_id = p_hid
        limit 1
      );
  end if;
end;
$$;

create or replace function public.guard_household()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.invite_code := old.invite_code;
  new.name := left(trim(new.name), 60);
  if char_length(new.name) < 1 then
    raise exception 'Введите название';
  end if;
  return new;
end;
$$;

create or replace function public.guard_member()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.household_id := old.household_id;
  new.user_id := old.user_id;
  if current_setting('vmeste.transfer_owner', true) is distinct from '1' then
    new.role := old.role;
  end if;
  new.display_name := left(trim(new.display_name), 40);
  if char_length(new.display_name) < 1 then
    raise exception 'Введите имя';
  end if;
  return new;
end;
$$;

create or replace function public.guard_expense()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.categories
    where id = new.category_id and household_id = new.household_id
  ) then
    raise exception 'Категория не из этого бюджета';
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid() then
      raise exception 'Чужая трата';
    end if;
  else
    new.household_id := old.household_id;
    -- Удаление аккаунта само ставит флаг и обнуляет автора. Обычный запрос подменить автора не может.
    if current_setting('vmeste.deleting_account', true) is distinct from '1' then
      new.created_by := old.created_by;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists households_guard on public.households;
create trigger households_guard
  before update on public.households
  for each row execute function public.guard_household();

drop trigger if exists members_guard on public.household_members;
create trigger members_guard
  before update on public.household_members
  for each row execute function public.guard_member();

drop trigger if exists expenses_guard on public.expenses;
create trigger expenses_guard
  before insert or update on public.expenses
  for each row execute function public.guard_expense();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select to authenticated
  using (public.is_member(id));

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated
  using (public.is_member(id))
  with check (public.is_member(id));

drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
  for select to authenticated
  using (public.is_member(household_id));

drop policy if exists members_update on public.household_members;
create policy members_update on public.household_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists categories_all on public.categories;
create policy categories_all on public.categories
  for all to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

revoke all on table public.households from anon, authenticated;
revoke all on table public.household_members from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;

grant usage on schema public to authenticated;
grant select, update on public.households to authenticated;
grant select, update on public.household_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;

revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
revoke all on function public.leave_household(uuid) from public, anon;
revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- Удаление аккаунта: вход исчезает, чужой общий бюджет остаётся.
alter table public.expenses add column if not exists created_by_name text not null default '';

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'expenses'
    and con.contype = 'f'
    and pg_get_constraintdef(con.oid) ilike '%created_by%';
  if cname is not null then
    execute format('alter table public.expenses drop constraint %I', cname);
  end if;
end $$;

alter table public.expenses alter column created_by drop not null;

alter table public.expenses
  drop constraint if exists expenses_created_by_fkey;

alter table public.expenses
  add constraint expenses_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec record;
  remaining integer;
begin
  if uid is null then
    raise exception 'Нужно войти';
  end if;

  -- Триггер guard_expense иначе вернёт автора обратно, и удаление пользователя упрётся в внешний ключ.
  perform set_config('vmeste.deleting_account', '1', true);

  for rec in
    select household_id, display_name
    from public.household_members
    where user_id = uid
  loop
    update public.expenses
    set created_by_name = case
          when created_by_name = '' then left(coalesce(rec.display_name, ''), 40)
          else created_by_name
        end,
        created_by = null
    where created_by = uid and household_id = rec.household_id;

    select count(*) into remaining
    from public.household_members
    where household_id = rec.household_id and user_id <> uid;

    if remaining = 0 then
      delete from public.households where id = rec.household_id;
    else
      delete from public.household_members
      where user_id = uid and household_id = rec.household_id;

      if not exists (
        select 1 from public.household_members
        where household_id = rec.household_id and role = 'owner'
      ) then
        perform set_config('vmeste.transfer_owner', '1', true);
        update public.household_members
        set role = 'owner'
        where household_id = rec.household_id
          and user_id = (
            select user_id from public.household_members
            where household_id = rec.household_id
            limit 1
          );
      end if;
    end if;
  end loop;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.expenses;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.categories;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.household_members;
  exception
    when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.households;
  exception
    when duplicate_object then null;
  end;
end $$;
