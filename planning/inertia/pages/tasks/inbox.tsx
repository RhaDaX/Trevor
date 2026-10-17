import { Head, Link, router } from '@inertiajs/react'
import { useState } from 'react'
import type { ClientDto, TaskDto } from '~/lib/types'
import { formatDue, useTimezone } from '~/lib/format'
import { CheckButton } from '~/components/task_row'
import { SnoozeButtons } from '~/components/snooze_menu'
import CompanyBadge from '~/components/company_badge'
import ClientPicker from '~/components/client_picker'

function InboxCard({ task, suggestions }: { task: TaskDto; suggestions: ClientDto[] }) {
  const tz = useTimezone()
  const [picking, setPicking] = useState(false)
  const [dating, setDating] = useState(false)
  const [date, setDate] = useState('')

  const attach = (clientId: number | null) =>
    router.post(`/tasks/${task.id}/client`, { client_id: clientId }, { preserveScroll: true })

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <CheckButton task={task} />
        <div className="min-w-0 flex-1">
          <Link href={`/tasks/${task.id}`} className="text-[15px] font-medium leading-snug">
            {task.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span className="rounded bg-stone-100 px-1 uppercase tracking-wide">{task.origin}</span>
            {task.dueAt && <span>📅 {formatDue(task.dueAt, task.allDay, tz)}</span>}
            {task.client && (
              <span className="inline-flex items-center gap-1">
                <CompanyBadge company={task.client.company} /> {task.client.name}
              </span>
            )}
            {task.attachments.length > 0 && <span>📎 {task.attachments.length}</span>}
          </div>
          {task.notes && <p className="mt-2 line-clamp-2 text-sm text-stone-500">{task.notes}</p>}
        </div>
      </div>

      {task.clientUncertain && suggestions.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-2.5 text-sm">
          <p className="mb-1.5 text-xs font-medium text-amber-800">
            Client incertain — c'est lequel ?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => attach(c.id)}
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-xs hover:bg-amber-100"
              >
                <CompanyBadge company={c.company} /> {c.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => attach(null)}
              className="px-2 py-1 text-xs text-stone-500 hover:underline"
            >
              Aucun
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
        {!task.dueAt && <SnoozeButtons taskId={task.id} compact />}
        <button
          type="button"
          onClick={() => setDating((v) => !v)}
          className="rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
        >
          📅 Dater
        </button>
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          className="rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
        >
          👥 Client
        </button>
        <button
          type="button"
          onClick={() => router.delete(`/tasks/${task.id}`, { preserveScroll: true })}
          className="ml-auto rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>

      {dating && (
        <form
          className="mt-2 flex gap-2"
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
            className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            required
          />
          <button className="rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white">
            OK
          </button>
        </form>
      )}
      {picking && (
        <div className="mt-2">
          <ClientPicker onPick={(c) => attach(c.id)} />
        </div>
      )}
    </li>
  )
}

export default function Inbox({
  tasks,
  suggestions,
}: {
  tasks: TaskDto[]
  suggestions: Record<number, ClientDto[]>
}) {
  return (
    <>
      <Head title="À trier" />
      <h1 className="mb-1 text-2xl font-bold tracking-tight">À trier</h1>
      <p className="mb-5 text-sm text-stone-500">
        Chaque tâche se traite en un geste : dater, reporter, rattacher à un client, supprimer.
      </p>
      {!tasks.length ? (
        <div className="rounded-xl border border-dashed border-stone-300 px-4 py-10 text-center text-sm text-stone-500">
          🎉 Boîte vide.
        </div>
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
