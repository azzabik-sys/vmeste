-- Spendy Premium. Не применять к рабочей базе, пока Денис не подтвердит.
-- Откат: supabase/migrations/20261013_premium_rollback.sql
-- Снимок схемы до этой миграции: supabase/backup/schema-before-premium-2026-10-13.sql

create table if not exists public.premium_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_active boolean not null,
  expires_at timestamptz,
  product_id text,
  store text,
  period_type text,
  event_id text not null,
  event_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_events (
  event_id text primary key,
  user_id uuid,
  event_at timestamptz not null,
  received_at timestamptz not null default now()
);

create table if not exists public.user_free_expense (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expense_id uuid not null,
  claimed_at timestamptz not null default now()
);

alter table public.premium_entitlements enable row level security;
alter table public.premium_events enable row level security;
alter table public.user_free_expense enable row level security;

revoke all on table public.premium_entitlements from public, anon, authenticated;
revoke all on table public.premium_events from public, anon, authenticated;
revoke all on table public.user_free_expense from public, anon, authenticated;

-- Уже сохранённые свои расходы считаются использованным бесплатным разом.
insert into public.user_free_expense (user_id, expense_id)
select distinct on (created_by) created_by, id
from public.expenses
where created_by is not null
order by created_by, created_at
on conflict (user_id) do nothing;

create or replace function public.client_is_android()
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  raw text := current_setting('request.headers', true);
  platform text;
begin
  if raw is null or btrim(raw) = '' then
    return false;
  end if;
  begin
    platform := lower(coalesce(raw::json->>'x-client-platform', ''));
  exception
    when others then
      return false;
  end;
  return platform = 'android';
end;
$$;

create or replace function public.premium_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.premium_entitlements
    where user_id = auth.uid()
      and is_active
      and (expires_at is null or expires_at > now())
  );
$$;

create or replace function public.free_expense_used()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_free_expense where user_id = auth.uid()
  );
$$;

create or replace function public.budget_setup_open(p_hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and not public.free_expense_used()
    and exists (
      select 1
      from public.household_members
      where household_id = p_hid
        and user_id = auth.uid()
        and role = 'owner'
    )
    and not exists (
      select 1 from public.expenses where household_id = p_hid
    );
$$;

create or replace function public.can_edit_budget(p_hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.client_is_android()
    or public.premium_is_active()
    or public.budget_setup_open(p_hid);
$$;

-- Повтор того же event_id ничего не меняет. Более раннее событие не затирает уже записанный статус.
create or replace function public.apply_premium_event(
  p_user_id uuid,
  p_event_id text,
  p_event_at timestamptz,
  p_is_active boolean,
  p_expires_at timestamptz,
  p_product_id text,
  p_store text,
  p_period_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_id is null or btrim(p_event_id) = '' or p_event_at is null then
    raise exception 'premium event is incomplete';
  end if;

  if exists (select 1 from public.premium_events where event_id = p_event_id) then
    return false;
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    insert into public.premium_events (event_id, user_id, event_at)
    values (p_event_id, null, p_event_at);
    return false;
  end if;

  insert into public.premium_events (event_id, user_id, event_at)
  values (p_event_id, p_user_id, p_event_at);

  insert into public.premium_entitlements (
    user_id, is_active, expires_at, product_id, store, period_type, event_id, event_at, updated_at
  )
  values (
    p_user_id, p_is_active, p_expires_at, p_product_id, p_store, p_period_type, p_event_id, p_event_at, now()
  )
  on conflict (user_id) do update
  set
    is_active = excluded.is_active,
    expires_at = excluded.expires_at,
    product_id = excluded.product_id,
    store = excluded.store,
    period_type = excluded.period_type,
    event_id = excluded.event_id,
    event_at = excluded.event_at,
    updated_at = now()
  where public.premium_entitlements.event_at <= excluded.event_at;

  return true;
end;
$$;

revoke all on function public.apply_premium_event(uuid, text, timestamptz, boolean, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_premium_event(uuid, text, timestamptz, boolean, timestamptz, text, text, text) to service_role;

revoke all on function public.client_is_android() from public, anon;
revoke all on function public.premium_is_active() from public, anon;
revoke all on function public.free_expense_used() from public, anon;
revoke all on function public.budget_setup_open(uuid) from public, anon;
revoke all on function public.can_edit_budget(uuid) from public, anon;
grant execute on function public.client_is_android() to authenticated;
grant execute on function public.premium_is_active() to authenticated;
grant execute on function public.free_expense_used() to authenticated;
grant execute on function public.budget_setup_open(uuid) to authenticated;
grant execute on function public.can_edit_budget(uuid) to authenticated;

create or replace function public.claim_free_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.user_free_expense where user_id = auth.uid()) then
    if public.client_is_android() or public.premium_is_active() then
      return new;
    end if;
    raise exception 'premium_required';
  end if;

  begin
    insert into public.user_free_expense (user_id, expense_id)
    values (auth.uid(), new.id);
  exception
    when unique_violation then
      if public.client_is_android() or public.premium_is_active() then
        return new;
      end if;
      raise exception 'premium_required';
  end;

  return new;
end;
$$;

drop trigger if exists expenses_premium on public.expenses;
create trigger expenses_premium
  before insert on public.expenses
  for each row execute function public.claim_free_expense();

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated
  using (public.is_member(id) and public.can_edit_budget(id))
  with check (public.is_member(id) and public.can_edit_budget(id));

drop policy if exists categories_all on public.categories;
drop policy if exists categories_select on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;

create policy categories_select on public.categories
  for select to authenticated
  using (public.is_member(household_id));

create policy categories_insert on public.categories
  for insert to authenticated
  with check (public.is_member(household_id) and public.can_edit_budget(household_id));

create policy categories_update on public.categories
  for update to authenticated
  using (public.is_member(household_id) and public.can_edit_budget(household_id))
  with check (public.is_member(household_id) and public.can_edit_budget(household_id));

create policy categories_delete on public.categories
  for delete to authenticated
  using (public.is_member(household_id) and public.can_edit_budget(household_id));

drop policy if exists expenses_all on public.expenses;
drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_update on public.expenses;
drop policy if exists expenses_delete on public.expenses;

create policy expenses_select on public.expenses
  for select to authenticated
  using (public.is_member(household_id));

-- Маркер бесплатной траты пишет BEFORE INSERT. Проверка WITH CHECK идёт после него,
-- поэтому здесь нельзя смотреть free_expense_used(): первая трата сама бы себя блокировала.
-- Вторую трату останавливает триггер expenses_premium с premium_required.
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (
    public.is_member(household_id)
    and created_by = auth.uid()
  );

create policy expenses_update on public.expenses
  for update to authenticated
  using (public.is_member(household_id) and (public.client_is_android() or public.premium_is_active()))
  with check (public.is_member(household_id) and (public.client_is_android() or public.premium_is_active()));

create policy expenses_delete on public.expenses
  for delete to authenticated
  using (public.is_member(household_id) and (public.client_is_android() or public.premium_is_active()));

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

  if exists (select 1 from public.household_members where user_id = auth.uid())
     or public.free_expense_used() then
    if not public.client_is_android() and not public.premium_is_active() then
      raise exception 'premium_required';
    end if;
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

  if not public.client_is_android()
     and not public.premium_is_active()
     and public.free_expense_used() then
    raise exception 'premium_required';
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
  if not public.client_is_android()
     and not public.premium_is_active()
     and not public.budget_setup_open(p_hid) then
    raise exception 'premium_required';
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
