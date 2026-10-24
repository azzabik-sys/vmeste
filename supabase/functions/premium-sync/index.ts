import { applyAppleTransaction, applyPlayPurchase, applySubscriber, json, recordedGrant, userIdFromRequest } from '../_shared/premiumHttp.ts'

const PLAY_ORDER = /^GPA\.\d{4}(?:-\d{4}){2,}-\d{4,6}(?:\.\.\d+)?$/
const PLAY_TOKEN = /^[A-Za-z0-9._~+/-]{20,4096}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const userId = await userIdFromRequest(req)
  if (!userId) return json({ error: 'unauthorized' }, 401)
  let transactionId = ''
  let purchaseToken = ''
  try {
    const body = (await req.json()) as { transactionId?: unknown; purchaseToken?: unknown }
    if (typeof body?.transactionId === 'string') transactionId = body.transactionId.trim()
    if (typeof body?.purchaseToken === 'string' && PLAY_TOKEN.test(body.purchaseToken.trim())) {
      purchaseToken = body.purchaseToken.trim()
    }
  } catch {
    transactionId = ''
    purchaseToken = ''
  }
  const play = Boolean(purchaseToken) || PLAY_ORDER.test(transactionId)
  try {
    const active = play
      ? await applyPlayPurchase({ userId, transactionId, purchaseToken })
      : transactionId
        ? await applyAppleTransaction({ userId, transactionId })
        : await applySubscriber({
            userId,
            eventId: `sync:${userId}:${Date.now()}`,
            eventAtMs: Date.now(),
          })
    if (active) return json({ ok: true, active: true })
    if (await recordedGrant(userId)) return json({ ok: true, active: true })
    return json({ ok: true, active: false })
  } catch {
    try {
      if (await recordedGrant(userId)) return json({ ok: true, active: true })
    } catch {
      // Ниже обычный повтор.
    }
    return json({ error: 'retry' }, 500)
  }
})
