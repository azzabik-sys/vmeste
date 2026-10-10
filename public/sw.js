const CACHE = 'vmeste-v12'

const OFFLINE = {
  ar: 'لا توجد شبكة',
  bg: 'Няма мрежа',
  bn: 'নেটওয়ার্ক নেই',
  ca: 'Sense xarxa',
  cs: 'Není síť',
  da: 'Intet netværk',
  de: 'Kein Netz',
  el: 'Δεν υπάρχει δίκτυο',
  en: 'No network',
  es: 'Sin red',
  fi: 'Ei verkkoa',
  fil: 'Walang network',
  fr: 'Pas de réseau',
  he: 'אין רשת',
  hi: 'नेटवर्क नहीं है',
  hr: 'Nema mreže',
  hu: 'Nincs hálózat',
  id: 'Tidak ada jaringan',
  it: 'Nessuna rete',
  ja: '通信がありません',
  ko: '네트워크 없음',
  ms: 'Tiada rangkaian',
  nb: 'Ingen dekning',
  nl: 'Geen netwerk',
  pl: 'Brak sieci',
  pt: 'Sem rede',
  ro: 'Nu există rețea',
  ru: 'Нет сети',
  sk: 'Nie je sieť',
  sv: 'Inget nät',
  th: 'ไม่มีเครือข่าย',
  tr: 'Ağ yok',
  uk: 'Немає мережі',
  vi: 'Không có mạng',
  'zh-Hans': '没有网络',
  'zh-Hant': '沒有網路',
}

function offlineText() {
  const tags = self.navigator.languages?.length ? self.navigator.languages : [self.navigator.language || 'en']
  for (const tag of tags) {
    const lower = String(tag).toLowerCase().replace(/_/g, '-')
    if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-mo') || lower.startsWith('zh-hant')) {
      return OFFLINE['zh-Hant']
    }
    if (lower.startsWith('zh')) return OFFLINE['zh-Hans']
    const base = lower.split('-')[0]
    const alias = { tl: 'fil', no: 'nb', nn: 'nb', iw: 'he', in: 'id' }[base] || base
    if (OFFLINE[alias]) return OFFLINE[alias]
  }
  return OFFLINE.en
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => {})
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const home = await caches.match(new URL('./', self.registration.scope).href)
        if (home) return home
        return new Response(offlineText(), {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }),
  )
})
