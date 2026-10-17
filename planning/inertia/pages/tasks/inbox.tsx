import { Head, Link, router } from '@inertiajs/react'
import {
  CalendarDays,
  CalendarPlus,
  Inbox,
  Mail,
  Paperclip,
  Trash2,
  TriangleAlert,
  UserRoundPlus,
} from 'lucide-react'
import { useState } from 'react'
import type { ClientDto, TaskDto } from '~/lib/types'
import { formatDue, ORIGIN_LABELS, plural, useTimezone } from '~/lib/format'
import { CheckButton } from '~/components/task_row'
import { SnoozeButtons } from '~/components/snooze_menu'
import ClientPicker from '~/components/client_picker'
import { Button, CompanyDot, EmptyState, PageHeader, cx, inputClass } from '~/components/ui'

function InboxCard({ task, suggestions }: { task: TaskDto; suggestions: ClientDto[] }) {
  const tz = useTimezone()
  const [panel, setPanel] = useState<'date' | 'client' | null>(null)
  const [date, setDate] = useState('')
  const [leaving, setLeaving] = useState(false)

  const attach = (clientId: number | null) =>
    router.post(`/tasks/${task.id}/client`, { client_id: clientId }, { preserveScroll: true })

  return (
    <li
      data-task-id={task.id}
      tabIndex={-1}
      className={cx(
        'animate-rise rounded-2xl bg-surface shadow-sm ring-1 ring-line outline-none focus-visible:ring-2 focus-visible:ring-focus',
        leaving && 'row-leave'
      )}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="pt-px">
          <CheckButton task={task} onComplete={() => setLeaving(true)} />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/tasks/${task.id}`}
            data-open
            className="block text-[15px] leading-[1.4] font-medium text-ink first-letter:uppercase hover:underline hover:underline-offset-2"
          >
            {task.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3 tabular">
            <span className="inline-flex items-center gap-1">
              {task.origin === 'mail' && <Mail className="size-3.5" />}
              via {ORIGIN_LABELS[task.origin]}
            </span>
            {task.dueAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {formatDue(task.dueAt, task.allDay, tz)}
              </span>
            )}
            {task.client && (
              <span className="inline-flex items-center gap-1.5 text-ink-2">
                <CompanyDot company={task.client.company} /> {task.client.name}
              </span>
            )}
            {task.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="size-3.5" />
                {task.attachments.length}
              </span>
            )}
          </div>
          {task.notes && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-2">{task.notes}</p>
          )}
        </div>
      </div>

      {task.clientUncertain && suggestions.length > 0 && (
        <div className="mx-4 mb-3 rounded-xl bg-amber-soft p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-amber-ink">
            <TriangleAlert className="size-3.5" />
            Plusieurs clients possibles — lequel ?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((c) => (
              <Button key={c.id} size="sm" onClick={() => attach(c.id)}>
                <CompanyDot company={c.company} />
                {c.name}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => attach(null)}>
              Aucun
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2.5">
        {!task.dueAt && <SnoozeButtons taskId={task.id} compact />}
        <Button
          size="sm"
          variant={panel === 'date' ? 'primary' : 'secondary'}
          onClick={() => setPanel(panel === 'date' ? null : 'date')}
        >
          <CalendarPlus className="size-3.5" />
          Dater
        </Button>
        <Button
          size="sm"
          variant={panel === 'client' ? 'primary' : 'secondary'}
          onClick={() => setPanel(panel === 'client' ? null : 'client')}
        >
          <UserRoundPlus className="size-3.5" />
          Client
        </Button>
        <Button
          size="sm"
          variant="danger"
          className="ml-auto"
          aria-label="Supprimer"
          onClick={() => router.delete(`/tasks/${task.id}`, { preserveScroll: true })}
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Supprimer</span>
        </Button>
      </div>

      {panel === 'date' && (
        <form
          className="flex animate-pop-in gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (date)
              router.post(`/tasks/${task.id}/schedule`, { due_at: date }, { preserveScroll: true })
          }}
        >
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date et heure"
            className={inputClass + ' h-10'}
            required
          />
          <Button type="submit" variant="primary">
            Valider
          </Button>
        </form>
      )}
      {panel === 'client' && (
        <div className="border-t border-line p-3">
          <ClientPicker onPick={(c) => attach(c.id)} />
        </div>
      )}
    </li>
  )
}

export default function InboxPage({
  tasks,
  suggestions,
}: {
  tasks: TaskDto[]
  suggestions: Record<number, ClientDto[]>
}) {
  return (
    <>
      <Head title="À trier" />
      <PageHeader
        title="À trier"
        description={
          tasks.length
            ? `${plural(tasks.length, 'tâche', 'tâches')} sans date ou sans client sûr. Une décision chacune : dater, reporter, rattacher, supprimer.`
            : undefined
        }
      />
      {!tasks.length ? (
        <EmptyState icon={<Inbox className="size-8" strokeWidth={1.5} />} title="Boîte vide">
          Tout est trié. Les tâches sans date atterrissent ici et reviennent chaque matin dans le
          récap.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => (
            <InboxCard key={t.id} task={t} suggestions={suggestions[t.id] ?? []} />
          ))}
        </ul>
      )}
    </>
  )
}
