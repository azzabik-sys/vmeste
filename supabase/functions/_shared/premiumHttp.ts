import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  playOrderBase,
  revenueCatUserIds,
  shouldKeepCurrentGrant,
  snapshotFromApple,
  snapshotFromPlay,
  snapshotFromSubscriber,
  snapshotFromWebhook,
  type AppleTransaction,
  type PlayLine,
  type PremiumSnapshot,
} from './reduce.ts'

type Admin = SupabaseClient
const TX_ID = /^\d{6,30}$/

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

function adminClient(): Admin {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !key) throw new Error('missing supabase env')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function recordedGrant(userId: string): Promise<boolean> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('premium_entitlements')
    .select('is_active, expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.is_active) return false
  if (!data.expires_at) return true
  const expiresMs = Date.parse(data.expires_at)
  return Number.isFinite(expiresMs) && expiresMs > Date.now()
}

async function currentGrantHolds(snapshot: PremiumSnapshot): Promise<boolean> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('premium_entitlements')
    .select('is_active, expires_at')
    .eq('user_id', snapshot.userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const parsed = data?.expires_at ? Date.parse(data.expires_at) : Number.NaN
  const incoming = snapshot.expiresAt ? Date.parse(snapshot.expiresAt) : Number.NaN
  return shouldKeepCurrentGrant({
    incomingActive: snapshot.isActive,
    currentActive: Boolean(data?.is_active),
    currentExpiresMs: Number.isFinite(parsed) ? parsed : null,
    incomingExpiresMs: Number.isFinite(incoming) ? incoming : null,
    nowMs: Date.now(),
  })
}

async function writeSnapshot(snapshot: PremiumSnapshot, force = false): Promise<boolean> {
  if (!force && !snapshot.isActive && (await currentGrantHolds(snapshot))) return true
  const admin = adminClient()
  const { error } = await admin.rpc('apply_premium_event', {
    p_user_id: snapshot.userId,
    p_event_id: snapshot.eventId,
    p_event_at: new Date(snapshot.eventAtMs).toISOString(),
    p_is_active: snapshot.isActive,
    p_expires_at: snapshot.expiresAt,
    p_product_id: snapshot.productId,
    p_store: snapshot.store,
    p_period_type: snapshot.periodType,
  })
  if (error) throw new Error(error.message)
  return snapshot.isActive
}

async function subscriber(userId: string): Promise<{
  entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string | null; grace_period_expires_date?: string | null }>
  subscriptions?: Record<string, { store?: string | null; period_type?: string | null; grace_period_expires_date?: string | null }>
} | null> {
  const secret = Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? ''
  if (!secret) throw new Error('missing revenuecat secret')
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`revenuecat ${response.status}`)
  const body = (await response.json()) as { subscriber?: { entitlements?: never; subscriptions?: never } }
  return body.subscriber ?? null
}

export async function applySubscriber(input: {
  userId: string
  eventId: string
  eventAtMs: number
}): Promise<boolean> {
  const record = await subscriber(input.userId)
  const snapshot = snapshotFromSubscriber({
    userId: input.userId,
    eventId: input.eventId,
    eventAtMs: input.eventAtMs,
    nowMs: Date.now(),
    entitlements: record?.entitlements,
    subscriptions: record?.subscriptions,
  })
  return writeSnapshot(snapshot)
}

type WebhookEvent = {
  id?: string
  type?: string
  app_user_id?: string
  event_timestamp_ms?: number
  transferred_from?: string[]
  transferred_to?: string[]
  entitlement_ids?: string[] | null
  product_id?: string | null
  expiration_at_ms?: number | null
  grace_period_expiration_at_ms?: number | null
  store?: string | null
  period_type?: string | null
}

export async function applyWebhook(event: WebhookEvent): Promise<{ applied: number }> {
  if (!event.id || !event.event_timestamp_ms) throw new Error('incomplete event')
  const ids = revenueCatUserIds(event)
  let applied = 0
  for (const userId of ids) {
    const eventId = ids.length === 1 ? event.id : `${event.id}:${userId}`
    try {
      await applySubscriber({ userId, eventId, eventAtMs: event.event_timestamp_ms })
      applied += 1
      continue
    } catch {
      // Секрет RevenueCat v2 не читает покупателя. Ниже берём поля самого события.
    }
    if (event.type === 'TRANSFER' && (event.transferred_from ?? []).includes(userId)) {
      await writeSnapshot(
        {
          userId,
          eventId: `${eventId}:off`,
          eventAtMs: event.event_timestamp_ms,
          isActive: false,
          expiresAt: new Date(event.event_timestamp_ms).toISOString(),
          productId: null,
          store: null,
          periodType: null,
        },
        true,
      )
      applied += 1
      continue
    }
    const snapshot = snapshotFromWebhook({
      userId,
      eventId,
      eventAtMs: event.event_timestamp_ms,
      nowMs: Date.now(),
      type: event.type,
      entitlementIds: event.entitlement_ids,
      productId: event.product_id,
      expirationAtMs: event.expiration_at_ms,
      gracePeriodExpirationAtMs: event.grace_period_expiration_at_ms,
      store: event.store,
      periodType: event.period_type,
    })
    if (!snapshot) continue
    await writeSnapshot(snapshot, event.type === 'REFUND')
    applied += 1
  }
  return { applied }
}

function bytesToB64Url(bytes: Uint8Array): string {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeJws(jws: string): AppleTransaction {
  const part = jws.split('.')[1] ?? ''
  const padded = part.replace(/-/g, '+').replace(/_/g, '/')
  const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return JSON.parse(json) as AppleTransaction
}

async function appleJwt(): Promise<string> {
  const pem = Deno.env.get('APPLE_IAP_PRIVATE_KEY') ?? ''
  const kid = Deno.env.get('APPLE_IAP_KEY_ID') ?? ''
  const iss = Deno.env.get('APPLE_IAP_ISSUER_ID') ?? ''
  if (!pem || !kid || !iss) throw new Error('missing apple iap key')
  const now = Math.floor(Date.now() / 1000)
  const header = bytesToB64Url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid, typ: 'JWT' })))
  const payload = bytesToB64Url(
    new TextEncoder().encode(
      JSON.stringify({ iss, iat: now, exp: now + 300, aud: 'appstoreconnect-v1', bid: 'com.spendy.app' }),
    ),
  )
  const body = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (char) => char.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${payload}`)))
  return `${header}.${payload}.${bytesToB64Url(sig)}`
}

const PLAY_PACKAGE = 'app.vmeste.budget'
const PLAY_ORDER = /^GPA\.\d{4}(?:-\d{4}){2,}-\d{4,6}(?:\.\.\d+)?$/
const PLAY_TOKEN = /^[A-Za-z0-9._~+/-]{20,4096}$/
let playTokenCache: { value: string; exp: number } | null = null

function playServiceAccount(): { client_email: string; private_key: string; token_uri: string } {
  const raw = Deno.env.get('PLAY_SERVICE_ACCOUNT_JSON') ?? ''
  if (!raw) throw new Error('missing play credentials')
  const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string; token_uri?: string }
  if (!parsed.client_email || !parsed.private_key?.includes('BEGIN PRIVATE KEY')) throw new Error('missing play credentials')
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    token_uri: parsed.token_uri || 'https://oauth2.googleapis.com/token',
  }
}

async function playAccessToken(): Promise<string> {
  if (playTokenCache && playTokenCache.exp > Date.now() + 60_000) return playTokenCache.value
  const account = playServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const header = bytesToB64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claim = bytesToB64Url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: account.token_uri,
        iat: now,
        exp: now + 3600,
      }),
    ),
  )
  const body = account.private_key.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (char) => char.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(`${header}.${claim}`)),
  )
  const assertion = `${header}.${claim}.${bytesToB64Url(sig)}`
  const response = await fetch(account.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`play auth ${response.status}`)
  const payload = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!payload.access_token) throw new Error('play auth')
  playTokenCache = { value: payload.access_token, exp: Date.now() + (payload.expires_in ?? 3600) * 1000 }
  return payload.access_token
}

async function playGet(access: string, path: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/${path}`, {
    headers: { Authorization: `Bearer ${access}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`play ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

async function tokenKey(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function applyPlayPurchase(input: {
  userId: string
  transactionId?: string
  purchaseToken?: string
}): Promise<boolean> {
  const orderId = input.transactionId && PLAY_ORDER.test(input.transactionId) ? input.transactionId : ''
  let token = input.purchaseToken && PLAY_TOKEN.test(input.purchaseToken) ? input.purchaseToken : ''
  if (!token && !orderId) return false
  const access = await playAccessToken()
  if (!token) {
    const order = await playGet(access, `applications/${PLAY_PACKAGE}/orders/${encodeURIComponent(orderId)}`)
    const raw = typeof order?.purchaseToken === 'string' ? order.purchaseToken : ''
    if (!PLAY_TOKEN.test(raw)) return false
    token = raw
  }
  const subscription = await playGet(
    access,
    `applications/${PLAY_PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
  )
  if (!subscription) return false
  const lines = Array.isArray(subscription.lineItems) ? (subscription.lineItems as PlayLine[]) : []
  const account = subscription.externalAccountIdentifiers
  const obfuscated =
    account && typeof account === 'object' && 'obfuscatedExternalAccountId' in account
      ? String((account as { obfuscatedExternalAccountId?: unknown }).obfuscatedExternalAccountId ?? '')
      : ''
  const nowMs = Date.now()
  const draft = snapshotFromPlay({
    userId: input.userId,
    eventId: 'play-draft',
    eventAtMs: nowMs,
    nowMs,
    subscriptionState: typeof subscription.subscriptionState === 'string' ? subscription.subscriptionState : '',
    lineItems: lines,
    obfuscatedAccountId: obfuscated,
  })
  if (!draft?.isActive || !draft.expiresAt) return false
  const lineOrder = lines
    .map((line) => playOrderBase(line.latestSuccessfulOrderId))
    .find((value): value is string => Boolean(value))
  const orderBase = lineOrder ?? playOrderBase(orderId)
  const identity = orderBase ?? `token:${await tokenKey(token)}`
  const expiryMs = Date.parse(draft.expiresAt)
  const snapshot = { ...draft, eventId: `play-tx:${identity}:${Number.isFinite(expiryMs) ? expiryMs : 0}` }
  const admin = adminClient()
  const { data, error } = await admin.from('premium_events').select('user_id').like('event_id', `play-tx:${identity}:%`)
  if (error) throw new Error(error.message)
  if ((data ?? []).some((row) => row.user_id && row.user_id !== input.userId)) return false
  const written = await writeSnapshot(snapshot)
  if (
    written &&
    subscription.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING'
  ) {
    try {
      const response = await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}/purchases/subscriptions/spendy_premium/tokens/${encodeURIComponent(token)}:acknowledge`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}`, 'content-type': 'application/json' },
          body: '{}',
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!response.ok && response.status !== 400) throw new Error(`play ack ${response.status}`)
    } catch {
      // Доступ уже записан. Подтверждение Play повторит сам магазин.
    }
  }
  return written
}

async function fetchAppleTransaction(transactionId: string): Promise<AppleTransaction | null> {
  if (!TX_ID.test(transactionId)) return null
  const jwt = await appleJwt()
  const hosts = ['https://api.storekit-sandbox.itunes.apple.com', 'https://api.storekit.itunes.apple.com']
  for (const host of hosts) {
    const response = await fetch(`${host}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(8000),
    })
    if (response.status === 404 || response.status === 400 || response.status === 401) continue
    if (!response.ok) throw new Error(`apple ${response.status}`)
    const body = (await response.json()) as { signedTransactionInfo?: string }
    if (!body.signedTransactionInfo) throw new Error('apple payload')
    return decodeJws(body.signedTransactionInfo)
  }
  return null
}

export async function applyAppleTransaction(input: { userId: string; transactionId: string }): Promise<boolean> {
  const tx = await fetchAppleTransaction(input.transactionId)
  if (!tx) return false
  const original = tx.originalTransactionId ?? tx.transactionId ?? ''
  if (!TX_ID.test(original)) return false
  const nowMs = Date.now()
  const snapshot = snapshotFromApple({
    userId: input.userId,
    eventId: `apple-tx:${original}:${tx.expiresDate ?? 0}:${tx.revocationDate ?? 0}`,
    eventAtMs: nowMs,
    nowMs,
    transaction: tx,
  })
  if (!snapshot) return false
  if (!tx.appAccountToken) {
    const admin = adminClient()
    const { data, error } = await admin.from('premium_events').select('user_id').like('event_id', `apple-tx:${original}:%`)
    if (error) throw new Error(error.message)
    const taken = (data ?? []).some((row) => row.user_id && row.user_id !== input.userId)
    if (taken) return false
  }
  const revoked = typeof tx.revocationDate === 'number' && Number.isFinite(tx.revocationDate)
  return writeSnapshot(snapshot, revoked)
}

export async function userIdFromRequest(req: Request): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const header = req.headers.get('Authorization') ?? ''
  if (!url || !anon || !header) return null
  const client = createClient(url, anon, {
    global: { headers: { Authorization: header } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}
