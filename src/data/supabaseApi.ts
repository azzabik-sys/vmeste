import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import { iconForName } from '../domain/defaults'
import { createId } from '../domain/id'
import { clearActiveHousehold, readActiveHousehold, writeActiveHousehold } from './activeHousehold'
import type { BudgetApi } from './api'
import { clearJoinCode, readJoinCode } from './joinCode'
import type {
  Category,
  CategoryKind,
  CurrencyCode,
  Expense,
  Household,
  HouseholdBrief,
  Member,
  MemberRole,
  Snapshot,
} from './types'
import { CURRENCY_CODES } from './types'

type HouseholdRow = {
  id: string
  name: string
  invite_code: string
  currency: string | null
  monthly_budget: number | string | null
  pace_enabled: boolean | null
}
type MemberRow = { household_id: string; user_id: string; role: MemberRole; display_name: string }
type CategoryRow = {
  id: string
  household_id: string
  name: string
  planned_amount: number | string
  kind: CategoryKind
  icon: string | null
  sort_order: number
}
type ExpenseRow = {
  id: string
  household_id: string
  category_id: string
  amount: number | string
  spent_on: string
  note: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

function asCurrency(value: string | null): CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(String(value)) ? (value as CurrencyCode) : 'RUB'
}

function mapMember(row: MemberRow): Member {
  return {
    userId: row.user_id,
    householdId: row.household_id,
    role: row.role,
    displayName: row.display_name,
  }
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    plannedAmount: Number(row.planned_amount),
    kind: row.kind,
    icon: row.icon || iconForName(row.name),
    sortOrder: row.sort_order,
  }
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    householdId: row.household_id,
    categoryId: row.category_id,
    amount: Number(row.amount),
    spentOn: row.spent_on,
    note: row.note ?? '',
    createdBy: row.created_by ?? '',
    createdByName: row.created_by_name ?? '',
    createdAt: row.created_at,
  }
}

export function createSupabaseApi(url: string, anonKey: string): BudgetApi {
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })

  const listeners = new Set<() => void>()
  let channel: RealtimeChannel | null = null
  let listeningTo: string | null = null

  function emit() {
    for (const listener of listeners) listener()
  }

  function unwatch() {
    if (!channel) return
    void supabase.removeChannel(channel)
    channel = null
    listeningTo = null
  }

  function watch(householdId: string) {
    if (listeningTo === householdId && channel) return
    unwatch()
    listeningTo = householdId
    channel = supabase
      .channel(`budget-${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${householdId}` },
        () => emit(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `household_id=eq.${householdId}` },
        () => emit(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${householdId}` },
        () => emit(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'households', filter: `id=eq.${householdId}` },
        () => emit(),
      )
      .subscribe()
  }

  async function load(): Promise<Snapshot> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    fail(sessionError)
    const session = sessionData.session
    if (!session?.user) {
      unwatch()
      return { status: 'signed_out', mode: 'remote', pendingCode: readJoinCode() }
    }

    const userId = session.user.id
    const email = session.user.email ?? ''
    const membership = await supabase
      .from('household_members')
      .select('household_id, user_id, role, display_name')
      .eq('user_id', userId)
    fail(membership.error)
    const mine = (membership.data ?? []) as MemberRow[]

    if (mine.length === 0) {
      unwatch()
      clearActiveHousehold()
      return {
        status: 'needs_household',
        mode: 'remote',
        email,
        userId,
        pendingCode: readJoinCode(),
        householdName: '',
      }
    }

    const ids = mine.map((row) => row.household_id)
    const names = await supabase.from('households').select('id, name').in('id', ids)
    fail(names.error)
    const nameById = new Map(((names.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]))
    const households: HouseholdBrief[] = mine
      .map((row) => ({
        id: row.household_id,
        name: nameById.get(row.household_id) || '',
        role: row.role,
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    const wanted = readActiveHousehold()
    const householdId = wanted && ids.includes(wanted) ? wanted : ids[0]
    writeActiveHousehold(householdId)

    const [householdRes, membersRes, categoriesRes, expensesRes] = await Promise.all([
      supabase
        .from('households')
        .select('id, name, invite_code, currency, monthly_budget, pace_enabled')
        .eq('id', householdId)
        .single(),
      supabase
        .from('household_members')
        .select('household_id, user_id, role, display_name')
        .eq('household_id', householdId),
      supabase
        .from('categories')
        .select('id, household_id, name, planned_amount, kind, icon, sort_order')
        .eq('household_id', householdId)
        .order('sort_order'),
      supabase
        .from('expenses')
        .select('id, household_id, category_id, amount, spent_on, note, created_by, created_by_name, created_at')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false }),
    ])
    fail(householdRes.error)
    fail(membersRes.error)
    fail(categoriesRes.error)
    fail(expensesRes.error)

    watch(householdId)
    const householdRow = householdRes.data as HouseholdRow
    const household: Household = {
      id: householdRow.id,
      name: householdRow.name,
      inviteCode: householdRow.invite_code,
      currency: asCurrency(householdRow.currency),
      monthlyBudget: Number(householdRow.monthly_budget ?? 0),
      paceEnabled: householdRow.pace_enabled !== false,
    }

    return {
      status: 'ready',
      mode: 'remote',
      email,
      userId,
      household,
      households,
      members: ((membersRes.data ?? []) as MemberRow[]).map(mapMember),
      categories: ((categoriesRes.data ?? []) as CategoryRow[]).map(mapCategory),
      expenses: ((expensesRes.data ?? []) as ExpenseRow[]).map(mapExpense),
    }
  }

  return {
    mode: 'remote',
    load,
    subscribe(onChange) {
      listeners.add(onChange)
      const { data } = supabase.auth.onAuthStateChange(() => {
        // Нельзя вызывать getSession прямо внутри этого колбэка: клиент Supabase зависает.
        window.setTimeout(onChange, 0)
      })
      return () => {
        listeners.delete(onChange)
        data.subscription.unsubscribe()
        if (listeners.size === 0) unwatch()
      }
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      fail(error)
    },
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      fail(error)
      if (!data.session) throw new Error('Вход не открылся. Нажмите «Войти» с этой же почтой и паролем.')
    },
    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      fail(error)
    },
    async confirmPasswordReset(email, code, password) {
      const fromLink = code.match(/[?&#]token=([^&\s#]+)/i)
      const token = (fromLink ? decodeURIComponent(fromLink[1]) : code).replace(/\s+/g, '')
      if (token.length < 6) throw new Error('Вставьте ссылку или код из письма.')
      if (password.length < 6) throw new Error('Пароль должен быть не короче 6 символов.')
      // Бесплатное письмо Supabase присылает длинную ссылку, а не короткий код.
      // Ссылку не открываем: из неё берётся token и пароль меняется здесь.
      const { error } =
        token.length > 12
          ? await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' })
          : await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'recovery' })
      fail(error)
      const { error: updateError } = await supabase.auth.updateUser({ password })
      fail(updateError)
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      fail(error)
      unwatch()
    },
    async deleteAccount() {
      const { error } = await supabase.rpc('delete_account')
      fail(error)
      unwatch()
      // Пользователь в базе уже удалён. Локальный выход не должен звать сервер.
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      fail(signOutError)
    },
    async createHousehold(input) {
      const name = input.name.trim().slice(0, 60) || 'Наш бюджет'
      const displayName = input.displayName.trim().slice(0, 40) || 'Я'
      const { data, error } = await supabase.rpc('create_household', {
        p_name: name,
        p_display_name: displayName,
      })
      fail(error)
      clearJoinCode()
      if (typeof data !== 'string' || data.length < 8) throw new Error('Бюджет ещё не открыт')
      const householdId = data
      writeActiveHousehold(householdId)

      const { error: updateError } = await supabase
        .from('households')
        .update({
          name,
          currency: input.currency,
          monthly_budget: input.monthlyBudget,
          pace_enabled: input.paceEnabled,
        })
        .eq('id', householdId)
      fail(updateError)

      const { error: deleteError } = await supabase.from('categories').delete().eq('household_id', householdId)
      fail(deleteError)

      const categories = input.categories
        .map((category) => ({ ...category, name: category.name.trim().slice(0, 40) }))
        .filter((category) => category.name)
      if (categories.length > 0) {
        const { error: insertError } = await supabase.from('categories').insert(
          categories.map((category, index) => ({
            id: createId(),
            household_id: householdId,
            name: category.name,
            planned_amount: category.plannedAmount,
            kind: category.kind,
            icon: category.icon,
            sort_order: index,
          })),
        )
        fail(insertError)
      }
    },
    async joinHousehold(code, displayName) {
      const { data, error } = await supabase.rpc('join_household', {
        p_code: code.trim().toUpperCase(),
        p_display_name: displayName.trim(),
      })
      fail(error)
      clearJoinCode()
      if (typeof data === 'string' && data.length >= 8) writeActiveHousehold(data)
    },
    async leaveHousehold(householdId) {
      const { error } = await supabase.rpc('leave_household', { p_hid: householdId })
      fail(error)
      if (readActiveHousehold() === householdId) clearActiveHousehold()
      unwatch()
    },
    async deleteBudget(householdId) {
      const { error } = await supabase.rpc('leave_household', { p_hid: householdId })
      fail(error)
      if (readActiveHousehold() === householdId) clearActiveHousehold()
      unwatch()
    },
    async removeMember(householdId, userId) {
      const { error } = await supabase.rpc('remove_member', { p_hid: householdId, p_user: userId })
      fail(error)
    },
    async updateHouseholdName(householdId, name) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Введите название')
      const { error } = await supabase.from('households').update({ name: trimmed.slice(0, 60) }).eq('id', householdId)
      fail(error)
    },
    async updateHouseholdSettings(householdId, patch) {
      const next: {
        name?: string
        currency?: CurrencyCode
        monthly_budget?: number
        pace_enabled?: boolean
      } = {}
      if (patch.name !== undefined) {
        const trimmed = patch.name.trim()
        if (!trimmed) throw new Error('Введите название')
        next.name = trimmed.slice(0, 60)
      }
      if (patch.currency !== undefined) next.currency = patch.currency
      if (patch.monthlyBudget !== undefined) next.monthly_budget = patch.monthlyBudget
      if (patch.paceEnabled !== undefined) next.pace_enabled = patch.paceEnabled
      const { error } = await supabase.from('households').update(next).eq('id', householdId)
      fail(error)
    },
    async updateDisplayName(name) {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Введите имя')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      fail(sessionError)
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('Нужно войти')
      const active = readActiveHousehold()
      let update = supabase.from('household_members').update({ display_name: trimmed.slice(0, 40) }).eq('user_id', userId)
      if (active) update = update.eq('household_id', active)
      const { error } = await update
      fail(error)
    },
    async addCategory(householdId, input) {
      const trimmed = input.name.trim()
      if (!trimmed) throw new Error('Введите название категории')
      const existing = await supabase
        .from('categories')
        .select('sort_order')
        .eq('household_id', householdId)
        .order('sort_order', { ascending: false })
        .limit(1)
      fail(existing.error)
      const sortOrder = ((existing.data?.[0]?.sort_order as number | undefined) ?? -1) + 1
      const { error } = await supabase.from('categories').insert({
        id: createId(),
        household_id: householdId,
        name: trimmed.slice(0, 40),
        planned_amount: input.plannedAmount,
        kind: input.kind,
        icon: input.icon || iconForName(trimmed),
        sort_order: sortOrder,
      })
      fail(error)
    },
    async updateCategory(id, patch) {
      const next: { name?: string; planned_amount?: number; kind?: CategoryKind; icon?: string } = {}
      if (patch.name !== undefined) {
        const trimmed = patch.name.trim()
        if (!trimmed) throw new Error('Введите название категории')
        next.name = trimmed.slice(0, 40)
      }
      if (patch.plannedAmount !== undefined) next.planned_amount = patch.plannedAmount
      if (patch.kind !== undefined) next.kind = patch.kind
      if (patch.icon !== undefined) next.icon = patch.icon
      const { error } = await supabase.from('categories').update(next).eq('id', id)
      fail(error)
    },
    async reorderCategories(householdId, ids, kinds) {
      const results = await Promise.all(
        ids.map((id, index) => {
          const next: { sort_order: number; kind?: CategoryKind } = { sort_order: index }
          if (kinds?.[index] === 'fixed' || kinds?.[index] === 'pace') next.kind = kinds[index]
          return supabase.from('categories').update(next).eq('id', id).eq('household_id', householdId)
        }),
      )
      for (const result of results) fail(result.error)
    },
    async deleteCategory(id) {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      fail(error)
    },
    async saveExpense(expense) {
      const { error } = await supabase.from('expenses').upsert({
        id: expense.id,
        household_id: expense.householdId,
        category_id: expense.categoryId,
        amount: expense.amount,
        spent_on: expense.spentOn,
        note: expense.note ?? '',
        created_by: expense.createdBy,
        created_at: expense.createdAt,
      })
      fail(error)
    },
    async removeExpense(id) {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      fail(error)
    },
  }
}
