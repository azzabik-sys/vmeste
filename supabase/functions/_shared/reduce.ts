export type PremiumSnapshot = {
  userId: string
  eventId: string
  eventAtMs: number
  isActive: boolean
  expiresAt: string | null
  productId: string | null
  store: string | null
  periodType: string | null
}

type RcEntitlement = {
  expires_date?: string | null
  product_identifier?: string | null
  grace_period_expires_date?: string | null
}

type RcSubscription = {
  expires_date?: string | null
  grace_period_expires_date?: string | null
  store?: string | null
  period_type?: string | null
}

export function applySnapshot(current: PremiumSnapshot | null, next: PremiumSnapshot): PremiumSnapshot {
  if (current && current.eventId === next.eventId) return current
  if (current && next.eventAtMs < current.eventAtMs) return current
  return next
}

export function snapshotFromSubscriber(input: {
  userId: string
  eventId: string
  eventAtMs: number
  nowMs: number
  entitlements?: Record<string, RcEntitlement | undefined>
  subscriptions?: Record<string, RcSubscription | undefined>
}): PremiumSnapshot {
  const entitlement = input.entitlements?.premium
  const productId = entitlement?.product_identifier ?? null
  const subscription = productId ? input.subscriptions?.[productId] : undefined
  const stamps = [
    entitlement?.expires_date,
    entitlement?.grace_period_expires_date,
    subscription?.grace_period_expires_date,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))
  const expiresMs = stamps.length > 0 ? Math.max(...stamps) : null
  const isActive = Boolean(entitlement) && (expiresMs === null || expiresMs > input.nowMs)
  return {
    userId: input.userId,
    eventId: input.eventId,
    eventAtMs: input.eventAtMs,
    isActive,
    expiresAt: expiresMs === null ? null : new Date(expiresMs).toISOString(),
    productId,
    store: subscription?.store ?? null,
    periodType: subscription?.period_type ?? null,
  }
}

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PREMIUM_PRODUCTS = new Set([
  'com.spendy.app.premium.monthly',
  'com.spendy.app.premium.yearly',
  'spendy_premium',
  'spendy_premium:monthly',
  'spendy_premium:yearly',
])

export function snapshotFromWebhook(input: {
  userId: string
  eventId: string
  eventAtMs: number
  nowMs: number
  type?: string
  entitlementIds?: string[] | null
  productId?: string | null
  expirationAtMs?: number | null
  gracePeriodExpirationAtMs?: number | null
  store?: string | null
  periodType?: string | null
}): PremiumSnapshot | null {
  const type = input.type ?? ''
  const hasPremium = (input.entitlementIds ?? []).includes('premium')
  const knownProduct = Boolean(input.productId && PREMIUM_PRODUCTS.has(input.productId))
  const stamps = [input.expirationAtMs, input.gracePeriodExpirationAtMs].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  )
  const expiresMs = stamps.length > 0 ? Math.max(...stamps) : null
  if (!hasPremium && !knownProduct) return null
  if (type === 'EXPIRATION' || type === 'REFUND') {
    return {
      userId: input.userId,
      eventId: input.eventId,
      eventAtMs: input.eventAtMs,
      isActive: false,
      expiresAt: expiresMs === null ? new Date(input.nowMs).toISOString() : new Date(expiresMs).toISOString(),
      productId: input.productId ?? null,
      store: input.store ?? null,
      periodType: input.periodType ?? null,
    }
  }
  const isActive = expiresMs === null || expiresMs > input.nowMs
  return {
    userId: input.userId,
    eventId: input.eventId,
    eventAtMs: input.eventAtMs,
    isActive,
    expiresAt: expiresMs === null ? null : new Date(expiresMs).toISOString(),
    productId: input.productId ?? null,
    store: input.store ?? null,
    periodType: input.periodType ?? null,
  }
}

export type AppleTransaction = {
  bundleId?: string
  productId?: string
  expiresDate?: number
  revocationDate?: number
  appAccountToken?: string
  originalTransactionId?: string
  transactionId?: string
  offerDiscountType?: string
}

// Чек приходит от Apple по HTTPS. Чужой appAccountToken сюда не проходит.
export function snapshotFromApple(input: {
  userId: string
  eventId: string
  eventAtMs: number
  nowMs: number
  transaction: AppleTransaction
}): PremiumSnapshot | null {
  const tx = input.transaction
  if (tx.bundleId !== 'com.spendy.app') return null
  if (!tx.productId || !PREMIUM_PRODUCTS.has(tx.productId)) return null
  if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== input.userId.toLowerCase()) return null
  if (typeof tx.expiresDate !== 'number' || !Number.isFinite(tx.expiresDate)) return null
  const revoked = typeof tx.revocationDate === 'number' && Number.isFinite(tx.revocationDate)
  const periodType =
    tx.offerDiscountType === 'FREE_TRIAL'
      ? 'TRIAL'
      : tx.offerDiscountType === 'PAY_UP_FRONT' || tx.offerDiscountType === 'PAY_AS_YOU_GO'
        ? 'INTRO'
        : 'NORMAL'
  return {
    userId: input.userId,
    eventId: input.eventId,
    eventAtMs: input.eventAtMs,
    isActive: !revoked && tx.expiresDate > input.nowMs,
    expiresAt: new Date(tx.expiresDate).toISOString(),
    productId: tx.productId,
    store: 'APP_STORE',
    periodType,
  }
}

const PLAY_ORDER = /^GPA\.\d{4}(?:-\d{4}){2,}-\d{4,6}(?:\.\.\d+)?$/

export function playOrderBase(orderId: string | null | undefined): string | null {
  const value = (orderId ?? '').trim()
  if (!PLAY_ORDER.test(value)) return null
  return value.split('..')[0] ?? null
}

export type PlayLine = {
  productId?: string | null
  expiryTime?: string | null
  latestSuccessfulOrderId?: string | null
  offerDetails?: { basePlanId?: string | null } | null
}

function playPlan(item: PlayLine): 'monthly' | 'yearly' | null {
  const base = item.offerDetails?.basePlanId
  const product = item.productId ?? ''
  if ((base === 'monthly' || base === 'yearly') && (product === '' || product === 'spendy_premium')) return base
  if (product === 'spendy_premium:monthly') return 'monthly'
  if (product === 'spendy_premium:yearly') return 'yearly'
  return null
}

// Чек приходит из Google Play. Чужой obfuscated account, если это чужой uuid, сюда не проходит.
export function snapshotFromPlay(input: {
  userId: string
  eventId: string
  eventAtMs: number
  nowMs: number
  subscriptionState?: string | null
  lineItems?: PlayLine[] | null
  obfuscatedAccountId?: string | null
}): PremiumSnapshot | null {
  const account = input.obfuscatedAccountId?.trim() ?? ''
  if (account && USER_ID.test(account) && account.toLowerCase() !== input.userId.toLowerCase()) return null
  let chosen: { plan: 'monthly' | 'yearly'; expiryMs: number } | null = null
  for (const item of input.lineItems ?? []) {
    const plan = playPlan(item)
    const expiryMs = item.expiryTime ? Date.parse(item.expiryTime) : Number.NaN
    if (!plan || !Number.isFinite(expiryMs)) continue
    if (!chosen || expiryMs > chosen.expiryMs) chosen = { plan, expiryMs }
  }
  if (!chosen) return null
  const state = input.subscriptionState ?? ''
  const paid =
    state === 'SUBSCRIPTION_STATE_ACTIVE' ||
    state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' ||
    state === 'SUBSCRIPTION_STATE_CANCELED'
  return {
    userId: input.userId,
    eventId: input.eventId,
    eventAtMs: input.eventAtMs,
    isActive: paid && chosen.expiryMs > input.nowMs,
    expiresAt: new Date(chosen.expiryMs).toISOString(),
    productId: chosen.plan === 'yearly' ? 'spendy_premium:yearly' : 'spendy_premium:monthly',
    store: 'PLAY_STORE',
    periodType: 'NORMAL',
  }
}

// Просроченный чек не должен гасить уже записанный доступ, который кончается позже.
export function shouldKeepCurrentGrant(input: {
  incomingActive: boolean
  currentActive: boolean
  currentExpiresMs: number | null
  incomingExpiresMs: number | null
  nowMs: number
}): boolean {
  if (input.incomingActive || !input.currentActive || input.currentExpiresMs === null) return false
  if (input.currentExpiresMs <= input.nowMs) return false
  if (input.incomingExpiresMs === null) return true
  return input.currentExpiresMs > input.incomingExpiresMs
}

export function revenueCatUserIds(event: {
  app_user_id?: string
  transferred_from?: string[]
  transferred_to?: string[]
  type?: string
}): string[] {
  const raw =
    event.type === 'TRANSFER'
      ? [...(event.transferred_to ?? []), ...(event.transferred_from ?? [])]
      : [event.app_user_id ?? '']
  const seen = new Set<string>()
  const ids: string[] = []
  for (const id of raw) {
    if (!USER_ID.test(id) || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}
