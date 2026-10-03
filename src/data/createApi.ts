import type { BudgetApi } from './api'
import { createLocalApi } from './localApi'
import { createSharedApi } from './sharedApi'
import { createSupabaseApi } from './supabaseApi'

export async function loadApi(): Promise<BudgetApi> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (url && key) return createSupabaseApi(url, key)
  try {
    const response = await fetch('/api/house', { cache: 'no-store', headers: { accept: 'application/json' } })
    if (response.ok) {
      const body = (await response.json()) as { db?: unknown }
      if (body && typeof body === 'object' && 'db' in body) return createSharedApi()
    }
  } catch {
    // Сервера рядом нет: бюджет остаётся в этом браузере.
  }
  return createLocalApi()
}
