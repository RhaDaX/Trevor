import { Link, router } from '@inertiajs/react'
import { BellRing, Hourglass, Paperclip, Repeat2, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { TaskDto } from '~/lib/types'
import { formatDue, ORIGIN_LABELS, useTimezone } from '~/lib/format'
import { CompanyDot, cx } from '~/components/ui'
import SnoozeMenu from '~/components/snooze_menu'

/**
 * Coche ronde. La complétion est optimiste : la coche se dessine,
 * la ligne glisse puis la requête part.
 */
export function CheckButton({ task, onComplete }: { task: TaskDto; onComplete?: () => void }) {
  const [checking, setChecking] = useState(false)
  const done = task.status === 'done' || checking
  const high = task.priority === 'high'

  const toggle = () => {
    if (task.status === 'done') {
      router.post(`/tasks/${task.id}/reopen`, {}, { preserveScroll: true })
      return
    }
    if (checking) return
    setChecking(true)
    onComplete?.()
    setTimeout(
      () =>
        router.post(
          `/tasks/${task.id}/complete`,
          {},
          { preserveScroll: true, onError: () => setChecking(false) }
        ),
      520
    )
  }

  return (
    <button
      type="button"
      data-check
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Rouvrir « ${task.title} »` : `Marquer « ${task.title} » comme faite`}
      onClick={toggle}
      className="group/check -m-2 flex size-10 shrink-0 items-center justify-center rounded-full"
    >
      <span
        className={cx(
          'flex size-[22px] items-center justify-center rounded-full border-[1.75px] transition-all duration-200 ease-out-quart',
          done
            ? 'scale-100 border-done bg-done'
            : high
              ? 'border-signal group-hover/check:bg-signal-soft'
              : 'border-line-strong group-hover/check:border-ink-3 group-hover/check:bg-sunken',
          checking && 'scale-110'
        )}
      >
        {done && (
          <svg viewBox="0 0 16 16" className="size-3 text-white" fill="none" aria-hidden>
            <path
              d="M3.5 8.5l3 3 6-7"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={checking ? 'check-path' : undefined}
            />
          </svg>
        )}
      </span>
    </button>
  )
}

function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1', className)}>{children}</span>
}

export default function TaskRow({ task, showDate = true }: { task: TaskDto; showDate?: boolean }) {
  const tz = useTimezone()
  const [leaving, setLeaving] = useState(false)
  const closed = task.status === 'done' || task.status === 'cancelled'

  const remindsEarly = Boolean(
    task.remindAt && task.dueAt && task.alarmAt !== task.dueAt && !task.snoozedUntil
  )
  const due = showDate
    ? formatDue(task.alarmAt ?? task.dueAt, task.allDay && !task.snoozedUntil && !remindsEarly, tz)
    : null
  const deadline =
    showDate && (remindsEarly || task.snoozedUntil) ? formatDue(task.dueAt, task.allDay, tz) : null

  return (
    <li
      data-task-id={task.id}
      tabIndex={-1}
      className={cx(
        'group relative flex items-start gap-3 px-4 py-3 outline-none transition-colors',
        'hover:bg-sunken/60 focus-visible:bg-sunken focus-visible:outline-none',
        'focus-visible:before:absolute focus-visible:before:inset-y-1.5 focus-visible:before:left-0 focus-visible:before:w-[3px] focus-visible:before:rounded-r-full focus-visible:before:bg-focus',
        leaving && 'row-leave'
      )}
    >
      <div className="relative z-10 pt-px">
        <CheckButton task={task} onComplete={() => setLeaving(true)} />
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/tasks/${task.id}`}
          data-open
          className={cx(
            'block text-[15px] leading-[1.4] outline-none after:absolute after:inset-0 after:content-[""]',
            closed || leaving ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink'
          )}
        >
          {task.title}
        </Link>

        <div className="relative z-10 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3 tabular">
          {task.priority === 'high' && !closed && (
            <Meta className="font-semibold text-signal">Urgent</Meta>
          )}
          {due && (
            <Meta className={cx(task.overdue && !closed && 'font-medium text-signal')}>
              {task.snoozedUntil ? (
                <Hourglass className="size-3.5" strokeWidth={2} aria-label="Reportée" />
              ) : remindsEarly ? (
                <BellRing className="size-3.5" strokeWidth={2} aria-label="Rappel" />
              ) : null}
              {due}
            </Meta>
          )}
          {deadline && <Meta>échéance {deadline}</Meta>}
          {task.client ? (
            <Link
              href={`/clients/${task.client.id}`}
              className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink hover:underline hover:underline-offset-2"
            >
              <CompanyDot company={task.client.company} />
              {task.client.name}
            </Link>
          ) : task.company ? (
            <Meta>
              <CompanyDot company={task.company} />
              {task.company === 'a' ? 'Entreprise A' : 'Entreprise B'}
            </Meta>
          ) : null}
          {task.clientUncertain && (
            <Meta className="text-amber-ink">
              <TriangleAlert className="size-3.5" strokeWidth={2} />
              client à vérifier
            </Meta>
          )}
          {task.recurrenceLabel && (
            <Meta>
              <Repeat2 className="size-3.5" strokeWidth={2} />
              {task.recurrenceLabel.toLowerCase()}
            </Meta>
          )}
          {task.attachments.length > 0 && (
            <Meta>
              <Paperclip className="size-3.5" strokeWidth={2} />
              {task.attachments.length}
            </Meta>
          )}
          {task.origin !== 'app' && (
            <Meta className="text-ink-3/80">via {ORIGIN_LABELS[task.origin]}</Meta>
          )}
        </div>
      </div>

      {!closed && (
        <div className="relative z-10 -my-1 -mr-2 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <SnoozeMenu taskId={task.id} />
        </div>
      )}
    </li>
  )
}

export function TaskList({ tasks, showDate = true }: { tasks: TaskDto[]; showDate?: boolean }) {
  return (
    <ul className="divide-y divide-line overflow-visible rounded-2xl bg-surface shadow-sm ring-1 ring-line [&>li:first-child]:rounded-t-2xl [&>li:last-child]:rounded-b-2xl">
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
  aside,
}: {
  title: string
  count?: number
  tone?: 'default' | 'danger' | 'warning'
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <section className="mb-8 animate-rise">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2
          className={cx(
            'flex items-center gap-2 text-[13px] font-semibold',
            tone === 'danger' ? 'text-signal' : tone === 'warning' ? 'text-amber-ink' : 'text-ink-2'
          )}
        >
          {tone === 'danger' && <span className="size-1.5 rounded-full bg-signal" aria-hidden />}
          {title}
          {count !== undefined && <span className="font-medium text-ink-3 tabular">{count}</span>}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
