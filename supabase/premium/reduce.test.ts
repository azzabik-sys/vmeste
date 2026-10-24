import assert from 'node:assert/strict'
import {
  applySnapshot,
  revenueCatUserIds,
  shouldKeepCurrentGrant,
  playOrderBase,
  snapshotFromApple,
  snapshotFromPlay,
  snapshotFromSubscriber,
  snapshotFromWebhook,
  type PremiumSnapshot,
} from '../functions/_shared/reduce.ts'

const now = Date.parse('2026-10-13T00:00:00Z')
const userId = '11111111-1111-4111-8111-111111111111'

function snap(overrides: Partial<PremiumSnapshot> = {}): PremiumSnapshot {
  return {
    userId,
    eventId: 'evt-1',
    eventAtMs: now,
    isActive: true,
    expiresAt: '2026-10-27T00:00:00.000Z',
    productId: 'com.spendy.app.premium.monthly',
    store: 'APP_STORE',
    periodType: 'TRIAL',
    ...overrides,
  }
}

const trial = snapshotFromSubscriber({
  userId,
  eventId: 'purchase',
  eventAtMs: now,
  nowMs: now,
  entitlements: {
    premium: {
      expires_date: '2026-10-27T00:00:00Z',
      product_identifier: 'com.spendy.app.premium.monthly',
    },
  },
  subscriptions: {
    'com.spendy.app.premium.monthly': { store: 'APP_STORE', period_type: 'TRIAL' },
  },
})
assert.equal(trial.isActive, true)
assert.equal(trial.periodType, 'TRIAL')
assert.equal(trial.expiresAt, '2026-10-27T00:00:00.000Z')

const cancelled = snapshotFromSubscriber({
  userId,
  eventId: 'cancel',
  eventAtMs: now,
  nowMs: now,
  entitlements: {
    premium: {
      expires_date: '2026-10-20T00:00:00Z',
      product_identifier: 'com.spendy.app.premium.yearly',
    },
  },
})
assert.equal(cancelled.isActive, true)

const expired = snapshotFromSubscriber({
  userId,
  eventId: 'expired',
  eventAtMs: now,
  nowMs: now,
  entitlements: {
    premium: {
      expires_date: '2026-10-01T00:00:00Z',
      product_identifier: 'com.spendy.app.premium.monthly',
    },
  },
})
assert.equal(expired.isActive, false)

const grace = snapshotFromSubscriber({
  userId,
  eventId: 'grace',
  eventAtMs: now,
  nowMs: now,
  entitlements: {
    premium: {
      expires_date: '2026-10-01T00:00:00Z',
      grace_period_expires_date: '2026-10-20T00:00:00Z',
      product_identifier: 'com.spendy.app.premium.monthly',
    },
  },
})
assert.equal(grace.isActive, true)
assert.equal(grace.expiresAt, '2026-10-20T00:00:00.000Z')

const missing = snapshotFromSubscriber({
  userId,
  eventId: 'none',
  eventAtMs: now,
  nowMs: now,
  entitlements: {},
})
assert.equal(missing.isActive, false)

const current = snap({ eventId: 'new', eventAtMs: now + 1000 })
const stale = applySnapshot(current, snap({ eventId: 'old', eventAtMs: now }))
assert.equal(stale.eventId, 'new')
const replay = applySnapshot(current, snap({ eventId: 'new', eventAtMs: now + 5000, isActive: false }))
assert.equal(replay.isActive, true)
const newer = applySnapshot(current, snap({ eventId: 'renew', eventAtMs: now + 2000, isActive: false, expiresAt: null }))
assert.equal(newer.eventId, 'renew')
assert.equal(newer.isActive, false)

assert.deepEqual(
  revenueCatUserIds({
    type: 'TRANSFER',
    app_user_id: 'not-a-user',
    transferred_to: [userId],
    transferred_from: ['$RCAnonymousID:abc', userId],
  }),
  [userId],
)
assert.deepEqual(revenueCatUserIds({ type: 'INITIAL_PURCHASE', app_user_id: userId }), [userId])
assert.deepEqual(revenueCatUserIds({ type: 'INITIAL_PURCHASE', app_user_id: '$RCAnonymousID:abc' }), [])

const fromEvent = snapshotFromWebhook({
  userId,
  eventId: 'purchase',
  eventAtMs: now,
  nowMs: now,
  type: 'INITIAL_PURCHASE',
  entitlementIds: ['premium'],
  productId: 'com.spendy.app.premium.yearly',
  expirationAtMs: Date.parse('2026-10-27T00:00:00Z'),
  store: 'APP_STORE',
  periodType: 'NORMAL',
})
assert.equal(fromEvent?.isActive, true)
assert.equal(fromEvent?.expiresAt, '2026-10-27T00:00:00.000Z')

const lifetime = snapshotFromWebhook({
  userId,
  eventId: 'promo',
  eventAtMs: now,
  nowMs: now,
  type: 'NON_RENEWING_PURCHASE',
  entitlementIds: ['premium'],
  expirationAtMs: null,
  periodType: 'PROMOTIONAL',
  store: 'PROMOTIONAL',
})
assert.equal(lifetime?.isActive, true)
assert.equal(lifetime?.expiresAt, null)

const refund = snapshotFromWebhook({
  userId,
  eventId: 'refund',
  eventAtMs: now,
  nowMs: now,
  type: 'REFUND',
  entitlementIds: ['premium'],
  productId: 'com.spendy.app.premium.monthly',
  expirationAtMs: Date.parse('2026-10-20T00:00:00Z'),
})
assert.equal(refund?.isActive, false)

const otherEntitlement = snapshotFromWebhook({
  userId,
  eventId: 'other',
  eventAtMs: now,
  nowMs: now,
  type: 'INITIAL_PURCHASE',
  entitlementIds: ['appruves_pro'],
  productId: 'other.product',
  expirationAtMs: Date.parse('2026-10-27T00:00:00Z'),
})
assert.equal(otherEntitlement, null)

const apple = snapshotFromApple({
  userId,
  eventId: 'apple-1',
  eventAtMs: now,
  nowMs: now,
  transaction: {
    bundleId: 'com.spendy.app',
    productId: 'com.spendy.app.premium.monthly',
    expiresDate: Date.parse('2026-10-27T00:00:00Z'),
    appAccountToken: userId.toUpperCase(),
    offerDiscountType: 'FREE_TRIAL',
  },
})
assert.equal(apple?.isActive, true)
assert.equal(apple?.periodType, 'TRIAL')

const stolen = snapshotFromApple({
  userId,
  eventId: 'apple-2',
  eventAtMs: now,
  nowMs: now,
  transaction: {
    bundleId: 'com.spendy.app',
    productId: 'com.spendy.app.premium.yearly',
    expiresDate: Date.parse('2027-10-16T00:00:00Z'),
    appAccountToken: '22222222-2222-4222-8222-222222222222',
  },
})
assert.equal(stolen, null)

const expiredApple = snapshotFromApple({
  userId,
  eventId: 'apple-3',
  eventAtMs: now,
  nowMs: now,
  transaction: {
    bundleId: 'com.spendy.app',
    productId: 'com.spendy.app.premium.monthly',
    expiresDate: Date.parse('2026-10-01T00:00:00Z'),
    revocationDate: Date.parse('2026-10-02T00:00:00Z'),
  },
})
assert.equal(expiredApple?.isActive, false)

assert.equal(playOrderBase('GPA.3372-1234-5678-90123..2'), 'GPA.3372-1234-5678-90123')
assert.equal(playOrderBase('123456789012'), null)

const play = snapshotFromPlay({
  userId,
  eventId: 'play-1',
  eventAtMs: now,
  nowMs: now,
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
  lineItems: [
    {
      productId: 'spendy_premium',
      expiryTime: '2026-11-13T00:00:00Z',
      latestSuccessfulOrderId: 'GPA.3372-1234-5678-90123',
      offerDetails: { basePlanId: 'monthly' },
    },
  ],
})
assert.equal(play?.isActive, true)
assert.equal(play?.productId, 'spendy_premium:monthly')
assert.equal(play?.store, 'PLAY_STORE')

const playStolen = snapshotFromPlay({
  userId,
  eventId: 'play-2',
  eventAtMs: now,
  nowMs: now,
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
  obfuscatedAccountId: '22222222-2222-4222-8222-222222222222',
  lineItems: [
    {
      productId: 'spendy_premium',
      expiryTime: '2026-11-13T00:00:00Z',
      offerDetails: { basePlanId: 'yearly' },
    },
  ],
})
assert.equal(playStolen, null)

const playPending = snapshotFromPlay({
  userId,
  eventId: 'play-3',
  eventAtMs: now,
  nowMs: now,
  subscriptionState: 'SUBSCRIPTION_STATE_PENDING',
  lineItems: [
    {
      productId: 'spendy_premium',
      expiryTime: '2026-11-13T00:00:00Z',
      offerDetails: { basePlanId: 'monthly' },
    },
  ],
})
assert.equal(playPending?.isActive, false)

const later = Date.parse('2026-11-16T00:00:00Z')
assert.equal(
  shouldKeepCurrentGrant({
    incomingActive: false,
    currentActive: true,
    currentExpiresMs: later,
    incomingExpiresMs: Date.parse('2026-10-16T15:03:35Z'),
    nowMs: now,
  }),
  true,
)
assert.equal(
  shouldKeepCurrentGrant({
    incomingActive: false,
    currentActive: true,
    currentExpiresMs: Date.parse('2026-10-16T15:03:35Z'),
    incomingExpiresMs: Date.parse('2026-10-16T15:03:35Z'),
    nowMs: now,
  }),
  false,
)
assert.equal(
  shouldKeepCurrentGrant({
    incomingActive: true,
    currentActive: true,
    currentExpiresMs: later,
    incomingExpiresMs: later,
    nowMs: now,
  }),
  false,
)
assert.equal(
  shouldKeepCurrentGrant({
    incomingActive: false,
    currentActive: false,
    currentExpiresMs: later,
    incomingExpiresMs: Date.parse('2026-10-16T15:03:35Z'),
    nowMs: now,
  }),
  false,
)

console.log('premium reduce: ok')
