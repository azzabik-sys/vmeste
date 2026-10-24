import { applyWebhook, json, safeEqual } from '../_shared/premiumHttp.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? ''
  const header = req.headers.get('Authorization') ?? ''
  if (!expected || !safeEqual(header, `Bearer ${expected}`)) return json({ error: 'unauthorized' }, 401)
  let event: Parameters<typeof applyWebhook>[0]
  try {
    const body = (await req.json()) as { event?: Parameters<typeof applyWebhook>[0] }
    event = body.event ?? body
  } catch {
    return json({ ok: true, ignored: true })
  }
  try {
    const result = await applyWebhook(event)
    return json({ ok: true, applied: result.applied })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'incomplete event') return json({ ok: true, ignored: true })
    return json({ error: 'retry' }, 500)
  }
})
