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
import QuickCapture, { FOCUS_CAPTURE_EVENT } from '~/components/quick_capture'
import Shortcuts from '~/components/shortcuts'
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

function Toast() {
  const { flash } = usePage<Props>().props
  const [toast, setToast] = useState<{
    text: string
    tone: 'ok' | 'error'
    undo: number | null
    id: number
  } | null>(null)

  useEffect(() => {
    const text = flash.success ?? flash.error
    if (!text) return
    const id = Date.now()
    setToast({ text, tone: flash.error ? 'error' : 'ok', undo: flash.undoTaskId, id })
    const t = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 5500)
    return () => clearTimeout(t)
  }, [flash])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[84px] z-50 flex justify-center px-4 sm:bottom-6"
    >
      {toast && (
        <div
          key={toast.id}
          className={cx(
            'pointer-events-auto flex animate-rise items-center gap-3 rounded-xl py-2 pr-2 pl-4 text-sm shadow-lg',
            toast.tone === 'error' ? 'bg-signal text-white' : 'bg-ink text-ink-inverse'
          )}
        >
          <span className="py-1">{toast.text}</span>
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
  shortcut,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  badge?: number
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
        <span className="min-w-5 rounded-full bg-amber-soft px-1.5 text-center text-xs leading-5 font-semibold text-amber-ink tabular">
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
              badge={item.href === '/inbox' ? props.inboxCount : undefined}
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
                  {item.href === '/inbox' && props.inboxCount > 0 && (
                    <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-[18px] rounded-full bg-amber px-1 text-center text-[10px] leading-[18px] font-bold text-white tabular">
                      {props.inboxCount}
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
