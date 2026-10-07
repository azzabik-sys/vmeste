export type CategoryKind = 'fixed' | 'pace'
export type MemberRole = 'owner' | 'member'
export type AppMode = 'local' | 'remote'

export const CURRENCY_CODES = ['RUB', 'USD', 'EUR', 'KZT', 'PHP'] as const
export type CurrencyCode = (typeof CURRENCY_CODES)[number]

export const CATEGORY_ICONS = ['food', 'car', 'home', 'bill', 'shop', 'game', 'card', 'heart', 'coffee'] as const
export type CategoryIcon = (typeof CATEGORY_ICONS)[number]

export type Household = {
  id: string
  name: string
  inviteCode: string
  currency: CurrencyCode
  monthlyBudget: number
  paceEnabled: boolean
}

export type Member = {
  userId: string
  householdId: string
  role: MemberRole
  displayName: string
}

export type Category = {
  id: string
  householdId: string
  name: string
  plannedAmount: number
  kind: CategoryKind
  icon: string
  sortOrder: number
}

export type Expense = {
  id: string
  householdId: string
  categoryId: string
  amount: number
  spentOn: string
  note: string
  createdBy: string
  /** Имя на момент траты. Остаётся в общем бюджете, если человек удалил аккаунт. */
  createdByName?: string
  createdAt: string
}

export type NewCategory = {
  name: string
  plannedAmount: number
  kind: CategoryKind
  icon: string
}

export type CreateHouseholdInput = {
  name: string
  displayName: string
  currency: CurrencyCode
  monthlyBudget: number
  paceEnabled: boolean
  categories: NewCategory[]
}

export type HouseholdSettingsPatch = {
  name?: string
  currency?: CurrencyCode
  monthlyBudget?: number
  paceEnabled?: boolean
}

export type ReadySnapshot = {
  status: 'ready'
  mode: AppMode
  email: string | null
  userId: string
  household: Household
  members: Member[]
  categories: Category[]
  expenses: Expense[]
}

export type Snapshot =
  | { status: 'loading' }
  | { status: 'error'; mode: AppMode; message: string }
  | { status: 'signed_out'; mode: 'remote'; pendingCode: string | null }
  | {
      status: 'onboarding'
      mode: AppMode
      email: string | null
      userId: string
      pendingCode: string | null
    }
  | {
      status: 'needs_household'
      mode: AppMode
      email: string | null
      userId: string
      pendingCode: string | null
      householdName: string
    }
  | ReadySnapshot
