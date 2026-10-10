import type {
  AppMode,
  CategoryKind,
  CreateHouseholdInput,
  Expense,
  HouseholdSettingsPatch,
  NewCategory,
  Snapshot,
} from './types'

export interface BudgetApi {
  readonly mode: AppMode
  load(): Promise<Snapshot>
  subscribe(onChange: () => void): () => void
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  confirmPasswordReset(email: string, code: string, password: string): Promise<void>
  signOut(): Promise<void>
  deleteAccount(): Promise<void>
  createHousehold(input: CreateHouseholdInput): Promise<void>
  joinHousehold(code: string, displayName: string): Promise<void>
  leaveHousehold(householdId: string): Promise<void>
  deleteBudget(householdId: string): Promise<void>
  removeMember(householdId: string, userId: string): Promise<void>
  updateHouseholdName(householdId: string, name: string): Promise<void>
  updateHouseholdSettings(householdId: string, patch: HouseholdSettingsPatch): Promise<void>
  updateDisplayName(name: string): Promise<void>
  addCategory(householdId: string, input: NewCategory): Promise<void>
  updateCategory(
    id: string,
    patch: { name?: string; plannedAmount?: number; kind?: CategoryKind; icon?: string },
  ): Promise<void>
  reorderCategories(householdId: string, ids: string[], kinds?: CategoryKind[]): Promise<void>
  deleteCategory(id: string): Promise<void>
  saveExpense(expense: Expense): Promise<void>
  removeExpense(id: string): Promise<void>
}
