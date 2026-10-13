-- Пуш на телефон, когда кто-то другой внёс трату.
-- Файл можно выполнить повторно.

create extension if not exists pg_net;

create table if not exists public.device_pushes (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  lang text not null default 'en',
  updated_at timestamptz not null default now(),
  constraint device_pushes_token_chk check (token ~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$'),
  constraint device_pushes_lang_chk check (char_length(lang) between 2 and 16)
);

create index if not exists device_pushes_user_idx on public.device_pushes (user_id);

alter table public.device_pushes enable row level security;

revoke all on table public.device_pushes from public, anon, authenticated;

create or replace function public.format_push_amount(p_amount numeric, p_currency text)
returns text
language plpgsql
immutable
as $$
declare
  symbols constant jsonb := '{"AFN":"؋","AMD":"֏","AOA":"Kz","ARS":"$","AUD":"$","AZN":"₼","BAM":"KM","BBD":"$","BDT":"৳","BMD":"$","BND":"$","BOB":"Bs","BRL":"R$","BSD":"$","BWP":"P","BZD":"$","CAD":"$","CLP":"$","CNY":"¥","COP":"$","CRC":"₡","CUC":"$","CUP":"$","CZK":"Kč","DKK":"kr","DOP":"$","EGP":"E£","EUR":"€","FJD":"$","FKP":"£","GBP":"£","GEL":"₾","GHS":"GH₵","GIP":"£","GNF":"FG","GTQ":"Q","GYD":"$","HKD":"$","HNL":"L","HRK":"kn","HUF":"Ft","IDR":"Rp","ILS":"₪","INR":"₹","ISK":"kr","JMD":"$","JPY":"¥","KGS":"⃀","KHR":"៛","KMF":"CF","KPW":"₩","KRW":"₩","KYD":"$","KZT":"₸","LAK":"₭","LBP":"L£","LKR":"Rs","LRD":"$","MGA":"Ar","MMK":"K","MNT":"₮","MUR":"Rs","MXN":"$","MYR":"RM","NAD":"$","NGN":"₦","NIO":"C$","NOK":"kr","NPR":"Rs","NZD":"$","PHP":"₱","PKR":"Rs","PLN":"zł","PYG":"₲","RON":"lei","RUB":"₽","RWF":"RF","SBD":"$","SEK":"kr","SGD":"$","SHP":"£","SRD":"$","SSP":"£","STN":"Db","SYP":"£","THB":"฿","TOP":"T$","TRY":"₺","TTD":"$","TWD":"$","UAH":"₴","USD":"$","UYU":"$","VND":"₫","XAF":"FCFA","XCD":"$","XCG":"Cg.","XOF":"F CFA","XPF":"CFPF","ZAR":"R","ZMW":"ZK"}'::jsonb;
  code text := upper(coalesce(nullif(trim(p_currency), ''), 'RUB'));
  symbol text;
  cents integer;
  whole text;
  grouped text := '';
  rest integer;
begin
  symbol := coalesce(symbols ->> code, code);
  cents := abs(mod(round(coalesce(p_amount, 0) * 100)::bigint, 100))::integer;
  whole := trunc(abs(coalesce(p_amount, 0)))::bigint::text;
  rest := length(whole);
  while rest > 0 loop
    if grouped <> '' then
      grouped := ' ' || grouped;
    end if;
    if rest > 3 then
      grouped := substr(whole, rest - 2, 3) || grouped;
      rest := rest - 3;
    else
      grouped := substr(whole, 1, rest) || grouped;
      rest := 0;
    end if;
  end loop;
  if cents = 0 then
    return symbol || ' ' || grouped;
  end if;
  return symbol || ' ' || grouped || '.' || lpad(cents::text, 2, '0');
end;
$$;

create or replace function public.push_expense_body(p_lang text, p_name text, p_amount text)
returns text
language sql
immutable
as $$
  select replace(
    replace(
      case p_lang
    when 'ar' then 'مصروف جديد من {name}: {amount}'
    when 'bg' then 'Нов разход от {name}: {amount}'
    when 'bn' then '{name}-এর নতুন খরচ: {amount}'
    when 'ca' then 'Despesa nova de {name}: {amount}'
    when 'cs' then 'Nový výdaj od {name}: {amount}'
    when 'da' then 'Ny udgift fra {name}: {amount}'
    when 'de' then 'Neue Ausgabe von {name}: {amount}'
    when 'el' then 'Νέα δαπάνη από {name}: {amount}'
    when 'es' then 'Gasto nuevo de {name}: {amount}'
    when 'fi' then 'Uusi kulu käyttäjältä {name}: {amount}'
    when 'fil' then 'Bagong gastos mula kay {name}: {amount}'
    when 'fr' then 'Nouvelle dépense de {name} : {amount}'
    when 'he' then 'הוצאה חדשה מאת {name}: {amount}'
    when 'hi' then '{name} का नया खर्च: {amount}'
    when 'hr' then 'Novi trošak od {name}: {amount}'
    when 'hu' then 'Új kiadás ({name}): {amount}'
    when 'id' then 'Pengeluaran baru dari {name}: {amount}'
    when 'it' then 'Nuova spesa di {name}: {amount}'
    when 'ja' then '{name}の新しい支出: {amount}'
    when 'ko' then '{name}의 새 지출: {amount}'
    when 'ms' then 'Perbelanjaan baharu daripada {name}: {amount}'
    when 'nb' then 'Ny utgift fra {name}: {amount}'
    when 'nl' then 'Nieuwe uitgave van {name}: {amount}'
    when 'pl' then 'Nowy wydatek od {name}: {amount}'
    when 'pt' then 'Novo gasto de {name}: {amount}'
    when 'ro' then 'Cheltuială nouă de la {name}: {amount}'
    when 'ru' then 'Новая трата от {name}: {amount}'
    when 'sk' then 'Nový výdavok od {name}: {amount}'
    when 'sv' then 'Ny utgift från {name}: {amount}'
    when 'th' then 'รายจ่ายใหม่จาก {name}: {amount}'
    when 'tr' then '{name} yeni harcama ekledi: {amount}'
    when 'uk' then 'Нова витрата від {name}: {amount}'
    when 'vi' then 'Khoản chi mới từ {name}: {amount}'
    when 'zh-Hans' then '{name}记了一笔支出：{amount}'
    when 'zh-Hant' then '{name}記了一筆支出：{amount}'
        else 'New expense from {name}: {amount}'
      end,
      '{name}',
      p_name
    ),
    '{amount}',
    p_amount
  );
$$;

create or replace function public.register_device_push(p_token text, p_lang text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lang text := left(trim(coalesce(p_lang, 'en')), 16);
begin
  if uid is null then
    raise exception 'Нужен вход';
  end if;
  if p_token is null or p_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$' or char_length(p_token) > 200 then
    raise exception 'Неверный токен';
  end if;
  if char_length(lang) < 2 then
    lang := 'en';
  end if;
  insert into public.device_pushes (token, user_id, lang, updated_at)
  values (p_token, uid, lang, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        lang = excluded.lang,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.forget_device_push(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_token is null then
    return;
  end if;
  delete from public.device_pushes
  where token = p_token and user_id = uid;
end;
$$;

create or replace function public.notify_expense_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  currency text;
  amount_text text;
  payload jsonb;
begin
  if new.created_by is null then
    return new;
  end if;

  select left(trim(m.display_name), 40)
    into actor_name
  from public.household_members m
  where m.household_id = new.household_id
    and m.user_id = new.created_by;

  if actor_name is null or actor_name = '' then
    actor_name := left(trim(coalesce(new.created_by_name, '')), 40);
  end if;
  if actor_name is null or actor_name = '' then
    actor_name := 'Spendy';
  end if;

  select h.currency into currency
  from public.households h
  where h.id = new.household_id;

  amount_text := public.format_push_amount(new.amount, currency);

  select jsonb_agg(
    jsonb_build_object(
      'to', d.token,
      'title', 'Spendy',
      'body', public.push_expense_body(d.lang, actor_name, amount_text),
      'sound', 'default',
      'priority', 'high',
      'channelId', 'default',
      'data', jsonb_build_object('householdId', new.household_id, 'expenseId', new.id)
    )
  )
    into payload
  from public.device_pushes d
  join public.household_members m
    on m.user_id = d.user_id
   and m.household_id = new.household_id
  where d.user_id is distinct from new.created_by;

  if payload is null then
    return new;
  end if;

  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json'
      )
    );
  exception
    when others then
      -- Пуш не должен откатывать сохранённую трату.
      null;
  end;

  return new;
end;
$$;

drop trigger if exists expenses_push on public.expenses;
create trigger expenses_push
  after insert on public.expenses
  for each row execute function public.notify_expense_push();

revoke all on function public.format_push_amount(numeric, text) from public, anon, authenticated;
revoke all on function public.push_expense_body(text, text, text) from public, anon, authenticated;
revoke all on function public.notify_expense_push() from public, anon, authenticated;
revoke all on function public.register_device_push(text, text) from public, anon;
revoke all on function public.forget_device_push(text) from public, anon;
grant execute on function public.register_device_push(text, text) to authenticated;
grant execute on function public.forget_device_push(text) to authenticated;
