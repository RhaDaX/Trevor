import { requestJson } from '~/lib/errors'

/** POST JSON vers l'app (jeton CSRF, erreurs claires avec trace) */
export function postJson(url: string, body: unknown) {
  return requestJson(url, { method: 'POST', body: JSON.stringify(body) })
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Sur iPhone, le push n'existe que dans la PWA ajoutée à l'écran d'accueil */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function enablePush(publicKey: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications refusées')
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))
  await postJson('/push/subscribe', subscription.toJSON())
  return subscription
}

export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  await postJson('/push/unsubscribe', { endpoint: subscription.endpoint })
  await subscription.unsubscribe()
}
