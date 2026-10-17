import { Link, router, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import type { SharedProps } from '~/lib/types'
import QuickCapture from '~/components/quick_capture'

const NAV = [
  { href: '/today', label: "Aujourd'hui", icon: '☀️' },
  { href: '/inbox', label: 'À trier', icon: '📥' },
  { href: '/upcoming', label: 'À venir', icon: '📅' },
  { href: '/clients', label: 'Clients', icon: '👥' },
  { href: '/settings', label: 'Réglages', icon: '⚙️' },
]

function CompanySwitch() {
  const { company, companies } = usePage<SharedProps & Record<string, unknown>>().props
  const options = [
    { code: 'all', label: 'Tout' },
    ...companies.map((c) => ({ code: c.code, label: c.code.toUpperCase(), title: c.name })),
  ]
  const current = company ?? 'all'
  return (
    <div className="inline-flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-semibold">
      {options.map((o) => (
        <button
          key={o.code}
          type="button"
          title={'title' in o ? o.title : undefined}
          onClick={() =>
            router.get(
              window.location.pathname,
              { company: o.code },
              { preserveScroll: true, preserveState: false }
            )
          }
          className={`rounded-md px-2.5 py-1 ${current === o.code ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Flash() {
  const { flash } = usePage<SharedProps & Record<string, unknown>>().props
  const [visible, setVisible] = useState<{
    text: string
    tone: 'ok' | 'error'
    undo: number | null
  } | null>(null)

  useEffect(() => {
    const text = flash.success ?? flash.error
    if (!text) return
    setVisible({ text, tone: flash.error ? 'error' : 'ok', undo: flash.undoTaskId })
    const t = setTimeout(() => setVisible(null), 5000)
    return () => clearTimeout(t)
  }, [flash])

  if (!visible) return null
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6">
      <div
        className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white shadow-lg ${
          visible.tone === 'error' ? 'bg-red-600' : 'bg-stone-900'
        }`}
      >
        {visible.text}
        {visible.undo && (
          <button
            type="button"
            className="font-semibold text-amber-300"
            onClick={() => {
              router.post(`/tasks/${visible.undo}/reopen`, {}, { preserveScroll: true })
              setVisible(null)
            }}
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { url, props } = usePage<SharedProps & Record<string, unknown>>()
  const path = url.split('?')[0]
  const isActive = (href: string) => path === href || (href !== '/today' && path.startsWith(href))

  return (
    <div className="min-h-screen">
      <header className="pt-safe sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link
            href="/today"
            className="hidden shrink-0 text-base font-bold tracking-tight sm:block"
          >
            Planning
          </Link>
          <div className="min-w-0 flex-1">
            <QuickCapture />
          </div>
          <div className="hidden sm:block">
            <CompanySwitch />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-8 px-4 pt-5 pb-28 sm:pb-12">
        <nav className="hidden w-44 shrink-0 sm:block">
          <ul className="sticky top-20 space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    isActive(item.href)
                      ? 'bg-stone-200/70 font-semibold text-stone-900'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span>
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </span>
                  {item.href === '/inbox' && props.inboxCount > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                      {props.inboxCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
            <li className="pt-4">
              <Link
                href="/done"
                className="block rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100"
              >
                ✓ Terminées
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => router.post('/logout')}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-400 hover:bg-stone-100"
              >
                Déconnexion
              </button>
            </li>
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <div className="mb-4 sm:hidden">
            <CompanySwitch />
          </div>
          {children}
        </main>
      </div>

      {/* Barre du bas sur iPhone */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden">
        <ul className="flex justify-around pt-1.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`relative flex flex-col items-center px-2 text-[10px] ${isActive(item.href) ? 'text-stone-900' : 'text-stone-400'}`}
              >
                <span className="text-lg leading-6">{item.icon}</span>
                {item.label}
                {item.href === '/inbox' && props.inboxCount > 0 && (
                  <span className="absolute -top-0.5 right-1 rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {props.inboxCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Flash />
    </div>
  )
}
