import { Head } from '@inertiajs/react'
import { ArrowLeft, Archive, ExternalLink, Globe, Mail, Phone, ListTodo } from 'lucide-react'
import type { ClientDto, TaskDto } from '~/lib/types'
import { Section, TaskList } from '~/components/task_row'
import { Card, CompanyBadge, EmptyState, cx } from '~/components/ui'

export default function ClientShow({ client, tasks }: { client: ClientDto; tasks: TaskDto[] }) {
  const open = tasks.filter((t) => t.status === 'inbox' || t.status === 'todo')
  const closed = tasks.filter((t) => t.status === 'done' || t.status === 'cancelled')
  const contact = [
    ...client.emails.map((e) => ({ icon: Mail, label: e, href: `mailto:${e}` })),
    ...(client.phone ? [{ icon: Phone, label: client.phone, href: `tel:${client.phone}` }] : []),
    ...client.domains.map((d) => ({ icon: Globe, label: d, href: `https://${d}` })),
  ]

  return (
    <>
      <Head title={client.name} />
      <button
        type="button"
        onClick={() => history.back()}
        className="mb-6 -ml-2 inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-2 hover:bg-sunken hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Retour
      </button>

      <Card className="mb-8 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className={cx(
              'flex size-12 shrink-0 items-center justify-center rounded-xl font-display text-xl font-semibold',
              client.company === 'a' ? 'bg-co-a-soft text-co-a' : 'bg-co-b-soft text-co-b'
            )}
            aria-hidden
          >
            {client.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <CompanyBadge company={client.company} label={client.companyName} />
              {client.archived && (
                <span className="inline-flex items-center gap-1 text-xs text-ink-3">
                  <Archive className="size-3" /> archivé dans le CRM
                </span>
              )}
            </div>
            <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.015em]">
              {client.name}
            </h1>
          </div>
        </div>

        {contact.length > 0 && (
          <ul className="mt-5 grid gap-1 border-t border-line pt-4 sm:grid-cols-2">
            {contact.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm text-ink-2 hover:bg-sunken hover:text-ink"
                >
                  <c.icon className="size-4 text-ink-3" strokeWidth={1.75} />
                  <span className="truncate">{c.label}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {client.crmUrl && (
          <a
            href={client.crmUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-[10px] bg-surface px-3 text-sm font-medium ring-1 ring-line-strong shadow-sm hover:bg-sunken"
          >
            Ouvrir dans le CRM <ExternalLink className="size-3.5 text-ink-3" />
          </a>
        )}
      </Card>

      <Section title="En cours" count={open.length}>
        {open.length ? (
          <TaskList tasks={open} />
        ) : (
          <EmptyState
            icon={<ListTodo className="size-7" strokeWidth={1.5} />}
            title="Rien en cours"
          >
            Aucune tâche ouverte pour ce client.
          </EmptyState>
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
