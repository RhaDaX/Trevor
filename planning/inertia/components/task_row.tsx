import { Link, router } from '@inertiajs/react'
import type { TaskDto } from '~/lib/types'
import { formatDue, useTimezone } from '~/lib/format'
import CompanyBadge from '~/components/company_badge'
import SnoozeMenu from '~/components/snooze_menu'

export function CheckButton({ task }: { task: TaskDto }) {
  const done = task.status === 'done'
  return (
    <button
      type="button"
      title={done ? 'Rouvrir' : 'Marquer comme fait'}
      onClick={() =>
        router.post(
          `/tasks/${task.id}/${done ? 'reopen' : 'complete'}`,
          {},
          { preserveScroll: true }
        )
      }
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
        done
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : task.priority === 'high'
            ? 'border-red-400 hover:bg-red-50'
            : 'border-stone-300 hover:border-stone-500'
      }`}
    >
      {done && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
}

export default function TaskRow({ task, showDate = true }: { task: TaskDto; showDate?: boolean }) {
  const tz = useTimezone()
  const remindsEarly = Boolean(
    task.remindAt && task.dueAt && task.alarmAt !== task.dueAt && !task.snoozedUntil
  )
  const due = showDate
    ? formatDue(task.alarmAt ?? task.dueAt, task.allDay && !task.snoozedUntil && !remindsEarly, tz)
    : null
  const deadline =
    showDate && (remindsEarly || task.snoozedUntil) ? formatDue(task.dueAt, task.allDay, tz) : null
  const done = task.status === 'done' || task.status === 'cancelled'

  return (
    <li className="group flex items-start gap-3 px-3 py-2.5 hover:bg-stone-50">
      <CheckButton task={task} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/tasks/${task.id}`}
          className={`block text-[15px] leading-snug ${done ? 'text-stone-400 line-through' : 'text-stone-900'}`}
        >
          {task.priority === 'high' && !done && (
            <span className="mr-1 font-bold text-red-600">!</span>
          )}
          {task.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          {due && (
            <span className={task.overdue ? 'font-semibold text-red-600' : ''}>
              {task.snoozedUntil ? '⏱ ' : remindsEarly ? '🔔 ' : ''}
              {due}
            </span>
          )}
          {deadline && <span className="text-stone-400">échéance {deadline}</span>}
          {task.client ? (
            <Link
              href={`/clients/${task.client.id}`}
              className="inline-flex items-center gap-1 hover:text-stone-800"
            >
              <CompanyBadge company={task.client.company} />
              {task.client.name}
            </Link>
          ) : (
            <CompanyBadge company={task.company} />
          )}
          {task.clientUncertain && <span className="text-amber-600">client à vérifier</span>}
          {task.recurrenceLabel && <span>↻ {task.recurrenceLabel.toLowerCase()}</span>}
          {task.origin !== 'app' && (
            <span className="rounded bg-stone-100 px-1 text-[10px] uppercase tracking-wide text-stone-500">
              {task.origin}
            </span>
          )}
          {task.attachments.length > 0 && <span>📎 {task.attachments.length}</span>}
        </div>
      </div>
      {!done && (
        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <SnoozeMenu taskId={task.id} />
        </div>
      )}
    </li>
  )
}

export function TaskList({ tasks, showDate = true }: { tasks: TaskDto[]; showDate?: boolean }) {
  return (
    <ul className="divide-y divide-stone-100 overflow-visible rounded-xl border border-stone-200 bg-white">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} showDate={showDate} />
      ))}
    </ul>
  )
}

export function Section({
  title,
  count,
  tone = 'default',
  children,
}: {
  title: string
  count?: number
  tone?: 'default' | 'danger' | 'warning'
  children: React.ReactNode
}) {
  const color =
    tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-stone-500'
  return (
    <section className="mb-6">
      <h2 className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wider ${color}`}>
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-stone-400">{count}</span>}
      </h2>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
      {children}
    </div>
  )
}
