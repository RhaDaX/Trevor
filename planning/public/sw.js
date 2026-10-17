/* Service worker de la PWA : notifications push et actions rapides */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Planning', body: event.data ? event.data.text() : '' }
  }
  const actions = (data.actions || []).slice(0, 2)
  // Pastille sur l'icône de l'écran d'accueil (iOS ≥ 16.4, macOS)
  if (typeof data.badge === 'number' && self.navigator.setAppBadge) {
    data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge()
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Planning', {
      body: data.body || '',
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/today', actions: data.actions || [] },
      actions: actions.map((a) => ({ action: a.action, title: a.title })),
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { url, actions } = event.notification.data || {}
  const action = (actions || []).find((a) => a.action === event.action)

  if (action) {
    // Report ou « fait » sans ouvrir l'app (URL signée)
    event.waitUntil(fetch(action.url, { method: 'POST', credentials: 'omit' }).catch(() => {}))
    return
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
