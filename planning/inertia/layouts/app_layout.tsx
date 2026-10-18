import { Link, router, usePage } from '@inertiajs/react'
import {
  CalendarRange,
  CircleCheckBig,
  Inbox,
  Keyboard,
  LogOut,
  Plus,
  Settings,
  Sun,
  Undo2,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { SharedProps } from '~/lib/types'
import { TOAST_EVENT, type ToastDetail } from '~/lib/errors'
import QuickCapture, { FOCUS_CAPTURE_EVENT } from '~/components/quick_capture'
import Shortcuts from '~/components/shortcuts'
import ThemeSwitch from '~/components/theme_switch'
import { CompanyDot, Kbd, Segmented, cx } from '~/components/ui'

type Props = SharedProps & Record<string, unknown>

const NAV: { href: string; label: string; short: string; icon: LucideIcon; shortcut: string }[] = [
  { href: '/today', label: "Aujourd'hui", short: "Aujourd'hui", icon: Sun, shortcut: 'T' },
  { href: '/inbox', label: 'À trier', short: 'À trier', icon: Inbox, shortcut: 'I' },
  { href: '/upcoming', label: 'À venir', short: 'À venir', icon: CalendarRange, shortcut: 'A' },
  { href: '/clients', label: 'Clients', short: 'Clients', icon: UsersRound, shortcut: 'C' },
]

function CompanySwitch() {
  const { company, companies } = usePage<Props>().props
  return (
    <Segmented
      label="Filtrer par entreprise"
      value={company ?? 'all'}
      onChange={(value) =>
        router.get(
          window.location.pathname,
          { company: value },
          { preserveScroll: true, preserveState: false }
        )
      }
      options={[
        { value: 'all', label: 'Tout' },
        ...companies.map((c) => ({
          value: c.code,
          title: c.name,
          label: (
            <>
              <CompanyDot company={c.code} />
              {c.code.toUpperCase()}
            </>
          ),
        })),
      ]}
    />
  )
}

function TraceRef({ traceId }: { traceId: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      title="Copier la référence"
      onClick={() => {
        navigator.clipboard?.writeText(traceId)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-white/15 px-2 font-mono text-[12px] tracking-wide hover:bg-white/25"
    >
      {copied ? 'Copié' : `Réf. ${traceId}`}
    </button>
  )
}

function Toast() {
  const { flash } = usePage<Props>().props
  const [toast, setToast] = useState<{
    text: string
    tone: 'ok' | 'error'
    undo: number | null
    traceId: string | null
    id: number
  } | null>(null)

  const open = (next: Omit<NonNullable<typeof toast>, 'id'>) => {
    const id = Date.now() + Math.random()
    setToast({ ...next, id })
    // Une erreur reste plus longtemps : le temps de noter sa référence
    setTimeout(
      () => setToast((cur) => (cur?.id === id ? null : cur)),
      next.tone === 'error' ? 12000 : 5500
    )
  }

  useEffect(() => {
    const text = flash.success ?? flash.error
    if (!text) return
    open({
      text,
      tone: flash.error ? 'error' : 'ok',
      undo: flash.undoTaskId,
      traceId: flash.errorRef,
    })
  }, [flash])

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail
      open({
        text: detail.text,
        tone: detail.tone ?? 'ok',
        undo: null,
        traceId: detail.traceId ?? null,
      })
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  return (
    <div
      aria-live={toast?.tone === 'error' ? 'assertive' : 'polite'}
      className="pointer-events-none fixed inset-x-0 bottom-[84px] z-50 flex justify-center px-4 sm:bottom-6"
    >
      {toast && (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'pointer-events-auto flex max-w-xl animate-rise flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl py-2 pr-2 pl-4 text-sm shadow-lg',
            toast.tone === 'error' ? 'bg-signal text-white' : 'bg-ink text-ink-inverse'
          )}
        >
          <span className="py-1">{toast.text}</span>
          {toast.traceId && <TraceRef traceId={toast.traceId} />}
          {toast.undo && (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-semibold text-amber hover:bg-white/10"
              onClick={() => {
                router.post(`/tasks/${toast.undo}/reopen`, {}, { preserveScroll: true })
                setToast(null)
              }}
            >
              <Undo2 className="size-4" /> Annuler
            </button>
          )}
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setToast(null)}
            className="flex size-8 items-center justify-center rounded-lg opacity-60 hover:bg-white/10 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  badgeTone = 'amber',
  shortcut,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  badge?: number
  badgeTone?: 'amber' | 'signal'
  shortcut?: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm transition-colors',
        active
          ? 'bg-surface font-semibold text-ink shadow-sm ring-1 ring-line'
          : 'text-ink-2 hover:bg-sunken hover:text-ink'
      )}
    >
      <Icon
        className={cx('size-[18px]', active ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2')}
        strokeWidth={1.85}
      />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span
          className={cx(
            'min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-semibold tabular',
            badgeTone === 'signal' ? 'bg-signal-soft text-signal' : 'bg-amber-soft text-amber-ink'
          )}
        >
          {badge}
        </span>
      ) : shortcut ? (
        <span className="hidden gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 lg:flex">
          <Kbd>G</Kbd>
          <Kbd>{shortcut}</Kbd>
        </span>
      ) : null}
    </Link>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { url, props } = usePage<Props>()
  const path = url.split('?')[0]
  const isActive = (href: string) =>
    path === href || (href !== '/today' && path.startsWith(href + '/'))
  const user = props.user

  // Pastille de l'icône de l'app (écran d'accueil iPhone, Dock du Mac)
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    const count = props.attention.badge
    ;(count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.())?.catch(() => {})
  }, [props.attention.badge])

  // En PWA, pas de « tirer pour rafraîchir » : on recharge au retour dans l'app
  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 30_000) router.reload()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div className="min-h-dvh">
      {/* Barre latérale (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-paper px-3 py-4 md:flex">
        <Link href="/today" className="mb-6 flex items-center gap-2.5 px-2.5">
          <img src="/icons/icon.svg" alt="" className="size-7 rounded-lg" />
          <span className="font-display text-[17px] font-semibold tracking-[-0.01em]">
            Planning
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="space-y-0.5">
          {NAV.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              badge={
                item.href === '/inbox'
                  ? props.attention.inbox
                  : item.href === '/today'
                    ? props.attention.overdue
                    : undefined
              }
              badgeTone={item.href === '/today' ? 'signal' : 'amber'}
            />
          ))}
          <NavItem
            href="/done"
            label="Terminées"
            icon={CircleCheckBig}
            active={isActive('/done')}
          />
        </nav>

        <div className="mt-6 px-2.5">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            Entreprise
          </p>
          <CompanySwitch />
        </div>

        <div className="mt-auto space-y-0.5 border-t border-line pt-3">
          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              Thème
            </span>
            <ThemeSwitch />
          </div>
          <NavItem
            href="/settings"
            label="Réglages"
            icon={Settings}
            active={isActive('/settings')}
          />
          <button
            type="button"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
            className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-sm text-ink-2 hover:bg-sunken hover:text-ink"
          >
            <Keyboard className="size-[18px] text-ink-3" strokeWidth={1.85} />
            <span className="flex-1 text-left">Raccourcis</span>
            <Kbd>?</Kbd>
          </button>
          <div className="flex items-center gap-2.5 px-2.5 pt-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-ink-2 ring-1 ring-line">
              {(user?.fullName ?? user?.email ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">
              {user?.fullName ?? user?.email}
            </span>
            <button
              type="button"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              onClick={() => router.post('/logout')}
              className="flex size-8 items-center justify-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="pt-safe sticky top-0 z-30 bg-paper/85 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <QuickCapture />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pt-4 pb-32 sm:px-6 md:pt-8 md:pb-16">
          <div className="mb-5 md:hidden">
            <CompanySwitch />
          </div>
          {children}
        </main>
      </div>

      {/* Bouton de capture (mobile) */}
      <button
        type="button"
        aria-label="Nouvelle tâche"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
          window.dispatchEvent(new Event(FOCUS_CAPTURE_EVENT))
        }}
        className="fixed right-4 bottom-[92px] z-30 flex size-14 items-center justify-center rounded-2xl bg-ink text-ink-inverse shadow-lg active:scale-95 md:hidden"
      >
        <Plus className="size-6" strokeWidth={2.25} />
      </button>

      {/* Barre d'onglets (iPhone) */}
      <nav
        aria-label="Navigation"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        <ul className="grid grid-cols-5">
          {[
            ...NAV,
            {
              href: '/settings',
              label: 'Réglages',
              short: 'Réglages',
              icon: Settings,
              shortcut: 'R',
            },
          ].map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative flex h-14 flex-col items-center justify-center gap-1 text-[10.5px] font-medium',
                    active ? 'text-ink' : 'text-ink-3'
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.75} />
                  {item.short}
                  {item.href === '/inbox' && props.attention.inbox > 0 && (
                    <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-[18px] rounded-full bg-amber px-1 text-center text-[10px] leading-[18px] font-bold text-white tabular">
                      {props.attention.inbox}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Toast />
      <Shortcuts />
    </div>
  )
}
