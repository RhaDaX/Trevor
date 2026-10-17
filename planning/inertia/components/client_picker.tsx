import { useEffect, useState } from 'react'
import type { ClientDto } from '~/lib/types'
import CompanyBadge from '~/components/company_badge'

/** Recherche d'un client dans les deux CRM */
export default function ClientPicker({ onPick }: { onPick: (client: ClientDto) => void }) {
  const [q, setQ] = useState('')
  const [clients, setClients] = useState<ClientDto[]>([])

  useEffect(() => {
    if (q.trim().length < 2) {
      setClients([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/search?q=${encodeURIComponent(q)}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        if (res.ok) setClients((await res.json()).clients)
      } catch {}
    }, 150)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  return (
    <div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nom, email ou domaine…"
        className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-stone-500"
      />
      {clients.length > 0 && (
        <ul className="mt-1 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
          {clients.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50"
              >
                <CompanyBadge company={c.company} />
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-stone-400">{c.emails[0]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
