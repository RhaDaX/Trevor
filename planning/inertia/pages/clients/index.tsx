import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import type { ClientDto } from '~/lib/types'
import { formatDateTime, useTimezone } from '~/lib/format'
import CompanyBadge from '~/components/company_badge'

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
      250
    )
    return () => clearTimeout(t)
  }, [query])

  return (
    <>
      <Head title="Clients" />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Clients</h1>
      <p className="mb-4 text-sm text-stone-500">
        Miroir en lecture seule des deux CRM · {meta.total} clients
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un nom, un email, un domaine…"
        className="mb-4 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-500"
      />

      <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
        {clients.map((c) => (
          <li key={c.id}>
            <Link
              href={`/clients/${c.id}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50"
            >
              <CompanyBadge company={c.company} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="hidden truncate text-xs text-stone-400 sm:block">{c.emails[0]}</span>
              {!!c.openTasks && (
                <span className="rounded-full bg-stone-100 px-2 text-xs font-medium text-stone-600">
                  {c.openTasks}
                </span>
              )}
            </Link>
          </li>
        ))}
        {!clients.length && (
          <li className="px-3 py-8 text-center text-sm text-stone-500">Aucun client.</li>
        )}
      </ul>

      {meta.lastPage > 1 && (
        <div className="mt-3 flex justify-between text-sm">
          {meta.currentPage > 1 ? (
            <Link
              href={`/clients?q=${encodeURIComponent(q)}&page=${meta.currentPage - 1}`}
              className="text-blue-600"
            >
              ← Précédents
            </Link>
          ) : (
            <span />
          )}
          <span className="text-stone-400">
            {meta.currentPage} / {meta.lastPage}
          </span>
          {meta.currentPage < meta.lastPage ? (
            <Link
              href={`/clients?q=${encodeURIComponent(q)}&page=${meta.currentPage + 1}`}
              className="text-blue-600"
            >
              Suivants →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      <h2 className="mt-8 mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
        Synchronisation
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sync.map((s) => (
          <div key={s.source} className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <CompanyBadge company={s.company} /> {s.name}
            </div>
            <p className="text-xs text-stone-500">
              Dernier webhook : {formatDateTime(s.lastEventAt, tz)}
            </p>
            <p className="text-xs text-stone-500">
              Dernière synchro : {formatDateTime(s.lastFullSync, tz)}
            </p>
            {s.lastError && <p className="mt-1 text-xs text-red-600">{s.lastError}</p>}
          </div>
        ))}
      </div>
    </>
  )
}
