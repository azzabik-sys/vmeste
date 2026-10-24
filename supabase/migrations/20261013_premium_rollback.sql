-- Откат Spendy Premium. Возвращает политики и функции из schema-before-premium-2026-10-13.sql.
-- Не удаляет расходы, бюджеты и учётные записи.

drop trigger if exists expenses_premium on public.expenses;
drop function if exists public.claim_free_expense();

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated
  using (public.is_member(id))
  with check (public.is_member(id));

drop policy if exists categories_select on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;
create policy categories_all on public.categories
  for all to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_update on public.expenses;
drop policy if exists expenses_delete on public.expenses;
create policy expenses_all on public.expenses
  for all to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

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

drop function if exists public.apply_premium_event(uuid, text, timestamptz, boolean, timestamptz, text, text, text);
drop function if exists public.can_edit_budget(uuid);
drop function if exists public.budget_setup_open(uuid);
drop function if exists public.free_expense_used();
drop function if exists public.premium_is_active();
drop function if exists public.client_is_android();

drop table if exists public.user_free_expense;
drop table if exists public.premium_events;
drop table if exists public.premium_entitlements;
