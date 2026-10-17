import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ClientDto } from '~/lib/types'
import { CompanyDot } from '~/components/ui'

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
    <div className="animate-pop-in">
      <div className="flex h-10 items-center gap-2 rounded-[10px] bg-surface px-3 ring-1 ring-inset ring-line-strong focus-within:ring-2 focus-within:ring-focus">
        <Search className="size-4 text-ink-3" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, email ou domaine…"
          aria-label="Rechercher un client"
          className="h-full w-full bg-transparent text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
        />
      </div>
      {clients.length > 0 && (
        <ul className="mt-1.5 overflow-hidden rounded-xl bg-surface p-1 shadow-md ring-1 ring-line">
          {clients.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm hover:bg-sunken"
              >
                <CompanyDot company={c.company} />
                <span className="flex-1 truncate text-ink">{c.name}</span>
                <span className="truncate text-xs text-ink-3">{c.emails[0]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !clients.length && (
        <p className="mt-2 px-1 text-xs text-ink-3">Aucun client trouvé.</p>
      )}
    </div>
  )
}
