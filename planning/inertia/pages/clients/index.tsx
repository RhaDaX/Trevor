import { Head, Link, router } from '@inertiajs/react'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  Search,
  UsersRound,
  Webhook,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ClientDto } from '~/lib/types'
import { formatDateTime, useTimezone } from '~/lib/format'
import { Card, CompanyBadge, CompanyDot, EmptyState, PageHeader, cx } from '~/components/ui'

interface SyncInfo {
  source: string
  name: string
  company: 'a' | 'b'
  lastFullSync: string | null
  lastEventAt: string | null
  lastError: string | null
}

export default function ClientsIndex({
  q,
  clients,
  meta,
  sync,
}: {
  q: string
  clients: ClientDto[]
  meta: { currentPage: number; lastPage: number; total: number }
  sync: SyncInfo[]
}) {
  const tz = useTimezone()
  const [query, setQuery] = useState(q)

  useEffect(() => {
    if (query === q) return
    const t = setTimeout(
      () => router.get('/clients', { q: query }, { preserveState: true, replace: true }),
      220
    )
    return () => clearTimeout(t)
  }, [query])

  const page = (n: number) => `/clients?q=${encodeURIComponent(q)}&page=${n}`

  return (
    <>
      <Head title="Clients" />
      <PageHeader
        title="Clients"
        description={`Miroir en lecture seule des deux CRM · ${meta.total.toLocaleString('fr-FR')} fiches`}
      />

      <div className="mb-4 flex h-11 items-center gap-2.5 rounded-xl bg-surface px-3.5 shadow-sm ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-ink/80">
        <Search className="size-[18px] text-ink-3" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, email ou domaine…"
          aria-label="Rechercher un client"
          className="h-full w-full bg-transparent text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
        />
      </div>

      {clients.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="flex h-14 items-center gap-3 px-4 transition-colors hover:bg-sunken/60"
              >
                <span
                  className={cx(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold',
                    c.company === 'a' ? 'bg-co-a-soft text-co-a' : 'bg-co-b-soft text-co-b'
                  )}
                  aria-hidden
                >
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">{c.name}</span>
                  {c.emails[0] && (
                    <span className="block truncate text-xs text-ink-3">{c.emails[0]}</span>
                  )}
                </span>
                {!!c.openTasks && (
                  <span className="rounded-full bg-sunken px-2 text-xs leading-6 font-medium text-ink-2 ring-1 ring-line tabular">
                    {c.openTasks} en cours
                  </span>
                )}
                <ChevronRight className="size-4 text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<UsersRound className="size-8" strokeWidth={1.5} />}
          title={q ? 'Aucun résultat' : 'Pas encore de clients'}
        >
          {q
            ? `Rien ne correspond à « ${q} ».`
            : 'Ils apparaîtront après le premier webhook ou la synchro de nuit.'}
        </EmptyState>
      )}

      {meta.lastPage > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {meta.currentPage > 1 ? (
            <Link
              href={page(meta.currentPage - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-ink-2 hover:bg-sunken hover:text-ink"
            >
              <ChevronLeft className="size-4" /> Précédents
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-3 tabular">
            {meta.currentPage} / {meta.lastPage}
          </span>
          {meta.currentPage < meta.lastPage ? (
            <Link
              href={page(meta.currentPage + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-ink-2 hover:bg-sunken hover:text-ink"
            >
              Suivants <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <h2 className="mt-12 mb-3 px-1 text-[13px] font-semibold text-ink-2">
        Synchronisation des CRM
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sync.map((s) => (
          <Card key={s.source} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <CompanyDot company={s.company} /> {s.name}
              </span>
              <CompanyBadge company={s.company} />
            </div>
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex items-center gap-2 text-ink-2">
                <Webhook className="size-3.5 text-ink-3" />
                <dt>Dernier webhook</dt>
                <dd className="ml-auto text-ink tabular">{formatDateTime(s.lastEventAt, tz)}</dd>
              </div>
              <div className="flex items-center gap-2 text-ink-2">
                <RefreshCw className="size-3.5 text-ink-3" />
                <dt>Synchro de nuit</dt>
                <dd className="ml-auto text-ink tabular">{formatDateTime(s.lastFullSync, tz)}</dd>
              </div>
            </dl>
            {s.lastError && (
              <p className="mt-3 flex gap-2 rounded-lg bg-signal-soft p-2.5 text-xs text-signal">
                <CircleAlert className="mt-px size-3.5 shrink-0" />
                {s.lastError}
              </p>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
