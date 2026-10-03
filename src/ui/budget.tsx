import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { loadApi } from '../data/createApi'
import type { BudgetApi } from '../data/api'
import type {
  CategoryKind,
  CreateHouseholdInput,
  Expense,
  HouseholdSettingsPatch,
  NewCategory,
  ReadySnapshot,
  Snapshot,
} from '../data/types'
import { humanError } from '../domain/errors'

type BudgetContextValue = {
  snap: Snapshot
  error: string | null
  refresh: () => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<boolean>
  createHousehold: (input: CreateHouseholdInput) => Promise<boolean>
  joinHousehold: (code: string, displayName: string) => Promise<boolean>
  leaveHousehold: () => Promise<boolean>
  deleteBudget: () => Promise<boolean>
  updateHouseholdName: (name: string) => Promise<boolean>
  updateHouseholdSettings: (patch: HouseholdSettingsPatch) => Promise<boolean>
  updateDisplayName: (name: string) => Promise<boolean>
  addCategory: (input: NewCategory) => Promise<boolean>
  updateCategory: (
    id: string,
    patch: { name?: string; plannedAmount?: number; kind?: CategoryKind; icon?: string },
  ) => Promise<boolean>
  reorderCategories: (ids: string[]) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  saveExpense: (expense: Expense) => Promise<boolean>
  removeExpense: (id: string) => Promise<boolean>
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const apiRef = useRef<BudgetApi | null>(null)
  const snapRef = useRef<Snapshot>({ status: 'loading' })
  const loadSeq = useRef(0)
  const [api, setApi] = useState<BudgetApi | null>(null)
  const [snap, setSnap] = useState<Snapshot>({ status: 'loading' })
  const [error, setError] = useState<string | null>(null)
  snapRef.current = snap

  useEffect(() => {
    let cancelled = false
    void loadApi()
      .then((next) => {
        if (cancelled) return
        apiRef.current = next
        setApi(next)
      })
      .catch((loadError) => {
        if (cancelled) return
        setSnap({ status: 'error', mode: 'local', message: humanError(loadError) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    const current = apiRef.current
    if (!current) return
    const seq = ++loadSeq.current
    try {
      const next = await current.load()
      if (seq !== loadSeq.current) return
      setSnap(next)
    } catch (loadError) {
      if (seq !== loadSeq.current) return
      const message = humanError(loadError)
      if (snapRef.current.status === 'ready') setError(message)
      else setSnap({ status: 'error', mode: current.mode, message })
    }
  }, [])

  useEffect(() => {
    if (!api) return
    void refresh()
    const stop = api.subscribe(() => {
      void refresh()
    })
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const timer = window.setInterval(onFocus, 5000)
    return () => {
      stop()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.clearInterval(timer)
    }
  }, [api, refresh])

  async function run(action: () => Promise<void>) {
    const current = apiRef.current
    if (!current) return false
    setError(null)
    const seq = ++loadSeq.current
    try {
      await action()
      const next = await current.load()
      if (seq === loadSeq.current) setSnap(next)
      return true
    } catch (actionError) {
      setError(humanError(actionError))
      return false
    }
  }

  function ready(): ReadySnapshot {
    if (snapRef.current.status !== 'ready') throw new Error('Бюджет ещё не открыт')
    return snapRef.current
  }

  const value: BudgetContextValue = {
    snap,
    error,
    refresh,
    signIn: (email, password) => run(() => apiRef.current!.signIn(email, password)),
    signUp: (email, password) => run(() => apiRef.current!.signUp(email, password)),
    signOut: () => run(() => apiRef.current!.signOut()),
    createHousehold: (input) => run(() => apiRef.current!.createHousehold(input)),
    joinHousehold: (code, displayName) => run(() => apiRef.current!.joinHousehold(code, displayName)),
    leaveHousehold: () => run(() => apiRef.current!.leaveHousehold()),
    deleteBudget: () => run(() => apiRef.current!.deleteBudget()),
    updateHouseholdName: (name) => run(() => apiRef.current!.updateHouseholdName(ready().household.id, name)),
    updateHouseholdSettings: (patch) => run(() => apiRef.current!.updateHouseholdSettings(ready().household.id, patch)),
    updateDisplayName: (name) => run(() => apiRef.current!.updateDisplayName(name)),
    addCategory: (input) => run(() => apiRef.current!.addCategory(ready().household.id, input)),
    updateCategory: (id, patch) => run(() => apiRef.current!.updateCategory(id, patch)),
    reorderCategories: (ids) => run(() => apiRef.current!.reorderCategories(ready().household.id, ids)),
    deleteCategory: (id) => run(() => apiRef.current!.deleteCategory(id)),
    saveExpense: (expense) => run(() => apiRef.current!.saveExpense(expense)),
    removeExpense: (id) => run(() => apiRef.current!.removeExpense(id)),
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget() {
  const value = useContext(BudgetContext)
  if (!value) throw new Error('useBudget вызван вне BudgetProvider')
  return value
}
