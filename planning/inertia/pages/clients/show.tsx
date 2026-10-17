import { Head } from '@inertiajs/react'
import type { ClientDto, TaskDto } from '~/lib/types'
import CompanyBadge from '~/components/company_badge'
import { EmptyState, Section, TaskList } from '~/components/task_row'

export default function ClientShow({ client, tasks }: { client: ClientDto; tasks: TaskDto[] }) {
  const open = tasks.filter((t) => t.status === 'inbox' || t.status === 'todo')
  const closed = tasks.filter((t) => t.status === 'done' || t.status === 'cancelled')
  return (
    <>
      <Head title={client.name} />
      <div className="mb-5 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <CompanyBadge company={client.company} label={client.companyName} />
          {client.archived && <span className="text-xs text-stone-400">archivé dans le CRM</span>}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{client.name}</h1>
        <div className="mt-2 space-y-0.5 text-sm text-stone-600">
          {client.emails.map((e) => (
            <a key={e} href={`mailto:${e}`} className="block hover:underline">
              {e}
            </a>
          ))}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="block hover:underline">
              {client.phone}
            </a>
          )}
          {client.domains.map((d) => (
            <span key={d} className="block text-stone-400">
              {d}
            </span>
          ))}
        </div>
        {client.crmUrl && (
          <a
            href={client.crmUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50"
          >
            Ouvrir dans le CRM ↗
          </a>
        )}
      </div>

      <Section title="En cours" count={open.length}>
        {open.length ? (
          <TaskList tasks={open} />
        ) : (
          <EmptyState>Aucune tâche en cours pour ce client.</EmptyState>
        )}
      </Section>
      {closed.length > 0 && (
        <Section title="Historique" count={closed.length}>
          <TaskList tasks={closed} />
        </Section>
      )}
    </>
  )
}
