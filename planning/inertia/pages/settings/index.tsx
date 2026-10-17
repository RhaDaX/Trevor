import { Head, router, useForm, usePage } from '@inertiajs/react'
import {
  AlarmClock,
  BellRing,
  CalendarSync,
  Check,
  Copy as CopyIcon,
  KeyRound,
  Mic,
  Monitor,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { SharedProps } from '~/lib/types'
import { formatDateTime, useTimezone } from '~/lib/format'
import {
  currentSubscription,
  disablePush,
  enablePush,
  isStandalone,
  pushSupported,
} from '~/lib/push'
import { Button, Card, Field, PageHeader, inputClass } from '~/components/ui'

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

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof BellRing
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="grid gap-4 border-t border-line py-8 first-of-type:border-t-0 first-of-type:pt-0 lg:grid-cols-[220px_1fr] lg:gap-8">
      <div>
        <h2 className="flex items-center gap-2 font-display text-[17px] font-semibold">
          <Icon className="size-[18px] text-ink-3" strokeWidth={1.85} />
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.target.select()}
        className={inputClass + ' h-10 bg-sunken font-mono text-[13px]'}
      />
      <Button
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        }}
        aria-label={`Copier ${label}`}
      >
        {copied ? <Check className="size-4 text-done" /> : <CopyIcon className="size-4" />}
        {copied ? 'Copié' : 'Copier'}
      </Button>
    </div>
  )
}

function deviceIcon(ua: string | null) {
  return /iPhone|iPad|Android/i.test(ua ?? '') ? Smartphone : Monitor
}

function deviceName(ua: string | null) {
  if (!ua) return 'Appareil'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Macintosh/.test(ua))
    return /Firefox/.test(ua)
      ? 'Mac · Firefox'
      : /Chrome/.test(ua)
        ? 'Mac · Chrome'
        : 'Mac · Safari'
  if (/Android/.test(ua)) return 'Android'
  return 'Navigateur'
}

function PushSection({ push }: { push: Props['push'] }) {
  const tz = useTimezone()
  const [state, setState] = useState<'unknown' | 'on' | 'off' | 'unsupported'>('unknown')
  const [error, setError] = useState<string | null>(null)
  const iphone = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent)

  useEffect(() => {
    if (!pushSupported()) return setState('unsupported')
    currentSubscription().then((s) => setState(s ? 'on' : 'off'))
  }, [])

  return (
    <SettingsSection
      icon={BellRing}
      title="Notifications"
      description="Push sur l’iPhone et le Mac, avec report et « fait » directement depuis la notification."
    >
      <div className="space-y-3">
        {!push.enabled && (
          <p className="rounded-xl bg-amber-soft px-3.5 py-2.5 text-sm text-amber-ink">
            Clés VAPID absentes côté serveur : lancez{' '}
            <code className="font-mono text-[13px]">node ace vapid:generate</code> puis renseignez
            le .env.
          </p>
        )}
        {iphone && !isStandalone() && (
          <p className="rounded-xl bg-co-a-soft px-3.5 py-2.5 text-sm text-co-a">
            Sur iPhone : Partager → <strong>Sur l’écran d’accueil</strong>, puis ouvrez l’app depuis
            l’icône pour activer les notifications.
          </p>
        )}
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <span className="flex-1 text-sm">
            {state === 'on' && (
              <span className="font-medium text-done">Activées sur cet appareil</span>
            )}
            {state === 'off' && <span className="text-ink-2">Désactivées sur cet appareil</span>}
            {state === 'unsupported' && (
              <span className="text-ink-3">Non disponibles dans ce navigateur</span>
            )}
            {state === 'unknown' && <span className="text-ink-3">…</span>}
          </span>
          {state === 'off' && push.publicKey && (
            <Button
              variant="primary"
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
              Activer
            </Button>
          )}
          {state === 'on' && (
            <Button
              onClick={async () => {
                await disablePush()
                setState('off')
                router.reload({ only: ['push'] })
              }}
            >
              Désactiver
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => router.post('/settings/push/test', {}, { preserveScroll: true })}
          >
            Envoyer un test
          </Button>
        </Card>
        {error && <p className="text-sm text-signal">{error}</p>}
        {push.devices.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            {push.devices.map((d) => {
              const Icon = deviceIcon(d.userAgent)
              return (
                <li key={d.id} className="flex h-12 items-center gap-3 px-4 text-sm">
                  <Icon className="size-4 text-ink-3" strokeWidth={1.75} />
                  <span className="flex-1 text-ink">{deviceName(d.userAgent)}</span>
                  <span className="text-xs text-ink-3 tabular">
                    depuis le {formatDateTime(d.createdAt, tz)}
                  </span>
                  <button
                    type="button"
                    aria-label="Retirer cet appareil"
                    onClick={() => router.delete(`/push/devices/${d.id}`, { preserveScroll: true })}
                    className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-signal-soft hover:text-signal"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </SettingsSection>
  )
}

const hours = Array.from({ length: 24 }, (_, h) => h)

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
    (key: keyof typeof form.data) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      form.setData(key, Number(e.target.value) as never)
  const recapTime = `${String(form.data.recap_hour).padStart(2, '0')}:${String(form.data.recap_minute).padStart(2, '0')}`

  return (
    <>
      <Head title="Réglages" />
      <PageHeader title="Réglages" />

      <SettingsSection
        icon={UserRound}
        title="Rappels"
        description="Une tâche en retard revient jusqu’à être cochée ou reportée."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.put('/settings', { preserveScroll: true })
          }}
        >
          <Card className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Nom">
              <input
                value={form.data.full_name}
                onChange={(e) => form.setData('full_name', e.target.value)}
                className={inputClass + ' h-10'}
              />
            </Field>
            <Field label="Fuseau horaire" error={errors.timezone}>
              <input
                value={form.data.timezone}
                onChange={(e) => form.setData('timezone', e.target.value)}
                className={inputClass + ' h-10'}
              />
            </Field>
            <Field label="Relance d’une tâche en retard">
              <select
                value={form.data.nag_interval_minutes}
                onChange={num('nag_interval_minutes')}
                className={inputClass + ' h-10'}
              >
                <option value={0}>Jamais</option>
                <option value={30}>Toutes les 30 min</option>
                <option value={60}>Toutes les heures</option>
                <option value={120}>Toutes les 2 h</option>
                <option value={240}>Toutes les 4 h</option>
                <option value={1440}>Une fois par jour</option>
              </select>
            </Field>
            <Field label="Plage des relances" hint="Jours ouvrés uniquement">
              <div className="flex items-center gap-2">
                <select
                  value={form.data.nag_start_hour}
                  onChange={num('nag_start_hour')}
                  aria-label="Début"
                  className={inputClass + ' h-10'}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {h} h
                    </option>
                  ))}
                </select>
                <span className="text-ink-3">à</span>
                <select
                  value={form.data.nag_end_hour}
                  onChange={num('nag_end_hour')}
                  aria-label="Fin"
                  className={inputClass + ' h-10'}
                >
                  {hours
                    .slice(1)
                    .concat(24)
                    .map((h) => (
                      <option key={h} value={h}>
                        {h} h
                      </option>
                    ))}
                </select>
              </div>
            </Field>
            <Field label="Récap du matin" hint="Mail + push : retards, journée, à trier">
              <input
                type="time"
                value={recapTime}
                step={300}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  form.setData((d) => ({ ...d, recap_hour: h || 0, recap_minute: m || 0 }))
                }}
                className={inputClass + ' h-10 tabular'}
              />
            </Field>
            <div className="flex items-end justify-end">
              <Button type="submit" variant="primary" disabled={form.processing || !form.isDirty}>
                Enregistrer
              </Button>
            </div>
          </Card>
        </form>
      </SettingsSection>

      <PushSection push={push} />

      <SettingsSection
        icon={CalendarSync}
        title="Calendrier"
        description="Chaque tâche datée devient un événement avec alerte native dans Calendrier."
      >
        <div className="space-y-3">
          <CopyField value={calendarUrl} label="l’adresse iCal" />
          <ol className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">
            <li>
              <span className="font-medium text-ink">Mac</span> — Calendrier › Fichier › Nouvel
              abonnement à un calendrier
            </li>
            <li>
              <span className="font-medium text-ink">iPhone</span> — Réglages › Calendrier › Comptes
              › Ajouter un compte › Autre › Calendrier avec abonnement
            </li>
          </ol>
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2.5"
            onClick={() =>
              confirm("L'ancienne adresse cessera de fonctionner. Continuer ?") &&
              router.post('/settings/calendar', {}, { preserveScroll: true })
            }
          >
            Régénérer l’adresse secrète
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={KeyRound}
        title="Jetons d’API"
        description="Un jeton par appareil pour Siri, Raycast ou le raccourci Mac. Révocable à tout moment."
      >
        <div className="space-y-3">
          {flash.newToken && (
            <div className="animate-rise rounded-2xl bg-done-soft p-4">
              <p className="mb-2 text-sm font-medium text-done">
                Jeton « {flash.newToken.name} » créé — copiez-le maintenant, il ne sera plus
                affiché.
              </p>
              <CopyField value={flash.newToken.value} label="le jeton" />
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
            className="flex gap-2"
          >
            <input
              value={tokenForm.data.name}
              onChange={(e) => tokenForm.setData('name', e.target.value)}
              placeholder="Nom de l’appareil : iPhone, Mac…"
              aria-label="Nom de l’appareil"
              className={inputClass + ' h-10'}
              required
            />
            <Button type="submit" variant="primary" disabled={tokenForm.processing}>
              Créer
            </Button>
          </form>
          {tokens.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
              {tokens.map((t) => (
                <li key={t.id} className="flex h-14 items-center gap-3 px-4">
                  <KeyRound className="size-4 text-ink-3" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{t.name}</span>
                    <span className="block text-xs text-ink-3 tabular">
                      {t.lastUsedAt
                        ? `Utilisé le ${formatDateTime(t.lastUsedAt, tz)}`
                        : 'Jamais utilisé'}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      confirm('Révoquer ce jeton ?') &&
                      router.delete(`/settings/tokens/${t.id}`, { preserveScroll: true })
                    }
                  >
                    Révoquer
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <details className="group rounded-2xl bg-sunken/70 p-4 text-[13px] leading-relaxed text-ink-2 ring-1 ring-line">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-ink">
              <Mic className="size-4 text-ink-3" />
              Configurer « Dis Siri, ajoute une tâche »
              <span className="ml-auto text-ink-3 transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 marker:text-ink-3">
              <li>App Raccourcis › nouveau raccourci nommé « Ajoute une tâche ».</li>
              <li>Action « Dicter le texte », langue français.</li>
              <li>
                « Obtenir le contenu de l’URL » :{' '}
                <code className="font-mono text-xs text-ink">{apiUrl}</code>, méthode POST, en-têtes{' '}
                <code className="font-mono text-xs text-ink">
                  Authorization: Bearer &lt;jeton&gt;
                </code>{' '}
                et <code className="font-mono text-xs text-ink">X-Planning-Origin: siri</code>,
                corps JSON <code className="font-mono text-xs text-ink">text</code> = Texte dicté.
              </li>
              <li>
                « Obtenir la valeur du dictionnaire » clé{' '}
                <code className="font-mono text-xs text-ink">message</code>, puis « Énoncer ».
              </li>
            </ol>
            <p className="mt-3">
              Sur Mac : même raccourci avec « Demander une entrée », origine{' '}
              <code className="font-mono text-xs text-ink">mac</code> et un raccourci clavier global
              — ou le script Raycast de{' '}
              <code className="font-mono text-xs text-ink">extras/raycast</code>.
            </p>
          </details>
        </div>
      </SettingsSection>
    </>
  )
}
