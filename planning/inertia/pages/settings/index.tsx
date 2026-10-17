import { Head, router, useForm, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import type { SharedProps } from '~/lib/types'
import { formatDateTime, useTimezone } from '~/lib/format'
import {
  currentSubscription,
  disablePush,
  enablePush,
  isStandalone,
  pushSupported,
} from '~/lib/push'

interface Props {
  settings: {
    fullName: string | null
    email: string
    timezone: string
    nagIntervalMinutes: number
    nagStartHour: number
    nagEndHour: number
    recapHour: number
    recapMinute: number
  }
  calendarUrl: string
  apiUrl: string
  tokens: { id: number; name: string | null; createdAt: string; lastUsedAt: string | null }[]
  push: {
    enabled: boolean
    publicKey: string | null
    devices: { id: number; userAgent: string | null; createdAt: string }[]
  }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Copy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="rounded-lg border border-stone-300 px-3 text-xs font-medium hover:bg-stone-50"
      >
        {copied ? 'Copié ✓' : 'Copier'}
      </button>
    </div>
  )
}

function PushCard({ push }: { push: Props['push'] }) {
  const [state, setState] = useState<'unknown' | 'on' | 'off' | 'unsupported'>('unknown')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) return setState('unsupported')
    currentSubscription().then((s) => setState(s ? 'on' : 'off'))
  }, [])

  const iphone = /iPhone|iPad/.test(navigator.userAgent)

  return (
    <Card title="Notifications push">
      {!push.enabled && (
        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Clés VAPID absentes côté serveur : lancez <code>node ace vapid:generate</code> et
          renseignez le .env.
        </p>
      )}
      {iphone && !isStandalone() && (
        <p className="mb-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Sur iPhone, ajoutez d'abord l'app à l'écran d'accueil (Partager → « Sur l'écran d'accueil
          »), puis ouvrez-la depuis l'icône pour activer les notifications.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {state === 'off' && push.publicKey && (
          <button
            type="button"
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white"
            onClick={async () => {
              try {
                setError(null)
                await enablePush(push.publicKey!)
                setState('on')
                router.reload({ only: ['push'] })
              } catch (e: any) {
                setError(e.message)
              }
            }}
          >
            Activer sur cet appareil
          </button>
        )}
        {state === 'on' && (
          <>
            <span className="text-sm text-emerald-700">✓ Activées sur cet appareil</span>
            <button
              type="button"
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              onClick={async () => {
                await disablePush()
                setState('off')
                router.reload({ only: ['push'] })
              }}
            >
              Désactiver
            </button>
          </>
        )}
        {state === 'unsupported' && (
          <span className="text-sm text-stone-500">Non disponible dans ce navigateur.</span>
        )}
        <button
          type="button"
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          onClick={() => router.post('/settings/push/test', {}, { preserveScroll: true })}
        >
          Envoyer un test
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {push.devices.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 text-xs text-stone-500">
          {push.devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-1.5">
              <span className="truncate">{d.userAgent ?? 'Appareil'}</span>
              <button
                type="button"
                className="ml-2 text-red-600"
                onClick={() => router.delete(`/push/devices/${d.id}`, { preserveScroll: true })}
              >
                retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Settings({ settings, calendarUrl, apiUrl, tokens, push }: Props) {
  const tz = useTimezone()
  const { flash } = usePage<SharedProps & Record<string, unknown>>().props
  const errors = usePage<SharedProps & Record<string, unknown>>().props.errors ?? {}
  const form = useForm({
    full_name: settings.fullName ?? '',
    timezone: settings.timezone,
    nag_interval_minutes: settings.nagIntervalMinutes,
    nag_start_hour: settings.nagStartHour,
    nag_end_hour: settings.nagEndHour,
    recap_hour: settings.recapHour,
    recap_minute: settings.recapMinute,
  })
  const tokenForm = useForm({ name: '' })
  const num =
    (key: keyof typeof form.data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      form.setData(key, Number(e.target.value) as never)

  return (
    <>
      <Head title="Réglages" />
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Réglages</h1>

      <Card title="Rappels">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.put('/settings', { preserveScroll: true })
          }}
          className="grid gap-4 text-sm sm:grid-cols-2"
        >
          <label className="block">
            <span className="text-stone-600">Nom</span>
            <input
              value={form.data.full_name}
              onChange={(e) => form.setData('full_name', e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-stone-600">Fuseau horaire</span>
            <input
              value={form.data.timezone}
              onChange={(e) => form.setData('timezone', e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
            {errors.timezone && (
              <span className="text-xs text-red-600">{String(errors.timezone)}</span>
            )}
          </label>
          <label className="block">
            <span className="text-stone-600">Relance d'une tâche en retard</span>
            <select
              value={form.data.nag_interval_minutes}
              onChange={num('nag_interval_minutes')}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option value={0}>Jamais</option>
              <option value={30}>Toutes les 30 min</option>
              <option value={60}>Toutes les heures</option>
              <option value={120}>Toutes les 2 h</option>
              <option value={240}>Toutes les 4 h</option>
              <option value={1440}>Une fois par jour</option>
            </select>
          </label>
          <div className="block">
            <span className="text-stone-600">Plage des relances (jours ouvrés)</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                value={form.data.nag_start_hour}
                onChange={num('nag_start_hour')}
                className="w-20 rounded-lg border border-stone-300 px-3 py-2"
              />
              h →
              <input
                type="number"
                min={1}
                max={24}
                value={form.data.nag_end_hour}
                onChange={num('nag_end_hour')}
                className="w-20 rounded-lg border border-stone-300 px-3 py-2"
              />
              h
            </div>
          </div>
          <div className="block">
            <span className="text-stone-600">Récap du matin (mail + push)</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                value={form.data.recap_hour}
                onChange={num('recap_hour')}
                className="w-20 rounded-lg border border-stone-300 px-3 py-2"
              />
              h
              <input
                type="number"
                min={0}
                max={59}
                step={5}
                value={form.data.recap_minute}
                onChange={num('recap_minute')}
                className="w-20 rounded-lg border border-stone-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="flex items-end justify-end sm:col-span-2">
            <button
              disabled={form.processing || !form.isDirty}
              className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white disabled:opacity-40"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Card>

      <PushCard push={push} />

      <Card title="Calendrier (iCal)">
        <p className="mb-2 text-sm text-stone-600">
          Calendrier → Fichier → Nouvel abonnement (Mac) ou Réglages → Calendrier → Comptes →
          Ajouter un calendrier avec abonnement (iPhone). Chaque tâche datée devient un événement
          avec alerte.
        </p>
        <Copy value={calendarUrl} />
        <button
          type="button"
          onClick={() =>
            confirm("L'ancienne adresse cessera de fonctionner. Continuer ?") &&
            router.post('/settings/calendar', {}, { preserveScroll: true })
          }
          className="mt-2 text-xs text-stone-500 hover:text-red-600"
        >
          Régénérer l'adresse secrète
        </button>
      </Card>

      <Card title="Jetons d'API (Siri, Raycast, Raccourci Mac)">
        {flash.newToken && (
          <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm">
            <p className="mb-1 font-medium text-emerald-800">
              Jeton « {flash.newToken.name} » — copiez-le, il ne sera plus affiché :
            </p>
            <Copy value={flash.newToken.value} />
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            tokenForm.post('/settings/tokens', {
              preserveScroll: true,
              onSuccess: () => tokenForm.reset(),
            })
          }}
          className="mb-3 flex gap-2"
        >
          <input
            value={tokenForm.data.name}
            onChange={(e) => tokenForm.setData('name', e.target.value)}
            placeholder="Nom de l'appareil (iPhone, Mac…)"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            required
          />
          <button className="rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white">
            Créer
          </button>
        </form>
        <ul className="divide-y divide-stone-100 text-sm">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <span>
                {t.name}
                <span className="ml-2 text-xs text-stone-400">
                  {t.lastUsedAt
                    ? `utilisé le ${formatDateTime(t.lastUsedAt, tz)}`
                    : 'jamais utilisé'}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  confirm('Révoquer ce jeton ?') &&
                  router.delete(`/settings/tokens/${t.id}`, { preserveScroll: true })
                }
                className="text-xs text-red-600"
              >
                Révoquer
              </button>
            </li>
          ))}
        </ul>
        <details className="mt-3 text-sm text-stone-600">
          <summary className="cursor-pointer font-medium">
            Configurer le raccourci Siri « Ajoute une tâche »
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>App Raccourcis → nouveau raccourci nommé « Ajoute une tâche ».</li>
            <li>Action « Dicter le texte » (langue : français).</li>
            <li>
              Action « Obtenir le contenu de l'URL » : <code className="text-xs">{apiUrl}</code>,
              méthode POST, en-têtes{' '}
              <code className="text-xs">Authorization: Bearer &lt;jeton&gt;</code> et{' '}
              <code className="text-xs">X-Planning-Origin: siri</code>, corps JSON{' '}
              <code className="text-xs">text = Texte dicté</code>.
            </li>
            <li>
              Action « Obtenir la valeur du dictionnaire » clé{' '}
              <code className="text-xs">message</code>, puis « Énoncer ».
            </li>
          </ol>
          <p className="mt-2">
            Mac : même raccourci avec « Demander une entrée » au lieu de la dictée, origine{' '}
            <code className="text-xs">mac</code>, et un raccourci clavier global dans ses réglages —
            ou le script Raycast fourni dans <code className="text-xs">extras/raycast</code>.
          </p>
        </details>
      </Card>
    </>
  )
}
