import { Link, router } from '@inertiajs/react'
import {
  BellRing,
  Check,
  Hourglass,
  Paperclip,
  Repeat2,
  Sunrise,
  TriangleAlert,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import type { TaskDto } from '~/lib/types'
import { formatDue, formatLateness, ORIGIN_LABELS, useTimezone } from '~/lib/format'
import { CompanyDot, cx } from '~/components/ui'
import SnoozeMenu, { snooze } from '~/components/snooze_menu'

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

const SWIPE_COMMIT = 96

/**
 * Glisser sur mobile : vers la droite = faite, vers la gauche = demain.
 * Le geste se verrouille sur l'axe dominant pour ne pas gêner le défilement.
 */
function useSwipe(enabled: boolean, onRight: () => void, onLeft: () => void) {
  const [dx, setDx] = useState(0)
  const [settling, setSettling] = useState(false)
  const origin = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null)
  const moved = useRef(false)
  const crossed = useRef(false)

  const reset = () => {
    setSettling(true)
    setDx(0)
    setTimeout(() => setSettling(false), 220)
  }

  const handlers = enabled
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          const t = e.touches[0]
          origin.current = { x: t.clientX, y: t.clientY, axis: null }
          moved.current = false
          crossed.current = false
        },
        onTouchMove: (e: React.TouchEvent) => {
          const o = origin.current
          if (!o) return
          const t = e.touches[0]
          const ddx = t.clientX - o.x
          const ddy = t.clientY - o.y
          if (!o.axis) {
            if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return
            o.axis = Math.abs(ddx) > Math.abs(ddy) * 1.2 ? 'x' : 'y'
          }
          if (o.axis !== 'x') return
          moved.current = true
          // Résistance au-delà du seuil
          const over = Math.max(0, Math.abs(ddx) - SWIPE_COMMIT)
          const value = Math.sign(ddx) * (Math.min(Math.abs(ddx), SWIPE_COMMIT) + over * 0.35)
          const isCrossed = Math.abs(ddx) >= SWIPE_COMMIT
          if (isCrossed !== crossed.current) {
            crossed.current = isCrossed
            if (isCrossed) navigator.vibrate?.(8)
          }
          setDx(value)
        },
        onTouchEnd: () => {
          const o = origin.current
          origin.current = null
          if (!o || o.axis !== 'x') return
          // Le clic éventuel qui suit le geste est ignoré, puis on relâche le verrou
          setTimeout(() => (moved.current = false), 60)
          if (crossed.current) {
            const direction = dx > 0 ? 1 : -1
            setSettling(true)
            setDx(direction * window.innerWidth)
            setTimeout(() => (direction > 0 ? onRight() : onLeft()), 200)
            // Si la requête échoue, la ligne revient à sa place
            setTimeout(reset, 2500)
          } else {
            reset()
          }
        },
        onTouchCancel: reset,
        // Un glissement n'ouvre pas la tâche
        onClickCapture: (e: React.MouseEvent) => {
          if (moved.current) {
            e.preventDefault()
            e.stopPropagation()
            moved.current = false
          }
        },
      }
    : {}

  return { dx, settling, crossed: Math.abs(dx) >= SWIPE_COMMIT, handlers }
}

export default function TaskRow({ task, showDate = true }: { task: TaskDto; showDate?: boolean }) {
  const tz = useTimezone()
  const rowRef = useRef<HTMLLIElement>(null)
  const [leaving, setLeaving] = useState(false)
  const closed = task.status === 'done' || task.status === 'cancelled'

  const swipe = useSwipe(
    !closed,
    () => rowRef.current?.querySelector<HTMLElement>('[data-check]')?.click(),
    () => {
      setLeaving(true)
      snooze(task.id, 'tomorrow')
    }
  )

  const remindsEarly = Boolean(
    task.remindAt && task.dueAt && task.alarmAt !== task.dueAt && !task.snoozedUntil
  )
  const due = showDate
    ? formatDue(task.alarmAt ?? task.dueAt, task.allDay && !task.snoozedUntil && !remindsEarly, tz)
    : null
  const late = task.overdue && !closed ? formatLateness(task.alarmAt, tz) : null
  const deadline =
    showDate && (remindsEarly || task.snoozedUntil) ? formatDue(task.dueAt, task.allDay, tz) : null

  return (
    <li
      ref={rowRef}
      data-task-id={task.id}
      tabIndex={-1}
      className={cx(
        'group relative outline-none focus-visible:outline-none',
        'focus-visible:before:absolute focus-visible:before:inset-y-1.5 focus-visible:before:left-0 focus-visible:before:z-20 focus-visible:before:w-[3px] focus-visible:before:rounded-r-full focus-visible:before:bg-focus',
        swipe.dx !== 0 && 'overflow-hidden',
        leaving && 'row-leave'
      )}
    >
      {swipe.dx !== 0 && (
        <div
          aria-hidden
          className={cx(
            'absolute inset-0 flex items-center px-6 transition-colors duration-150',
            swipe.dx > 0 ? 'justify-start' : 'justify-end',
            swipe.dx > 0
              ? swipe.crossed
                ? 'bg-done text-white'
                : 'bg-done-soft text-done'
              : swipe.crossed
                ? 'bg-amber text-white'
                : 'bg-amber-soft text-amber-ink'
          )}
        >
          <span
            className={cx(
              'flex items-center gap-2 text-sm font-semibold transition-transform duration-150',
              swipe.crossed ? 'scale-110' : 'scale-90'
            )}
          >
            {swipe.dx > 0 ? (
              <>
                <Check className="size-5" strokeWidth={2.5} /> Faite
              </>
            ) : (
              <>
                Demain <Sunrise className="size-5" strokeWidth={2} />
              </>
            )}
          </span>
        </div>
      )}

      <div
        {...swipe.handlers}
        style={{
          transform: swipe.dx ? `translateX(${swipe.dx}px)` : undefined,
          touchAction: 'pan-y',
        }}
        className={cx(
          'relative flex items-start gap-3 bg-surface px-4 py-3 transition-colors group-hover:bg-sunken/60 group-focus-visible:bg-sunken',
          swipe.settling && 'transition-transform duration-200 ease-out-quart',
          'group-first:rounded-t-2xl group-last:rounded-b-2xl'
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
              'block text-[15px] leading-[1.4] outline-none first-letter:uppercase after:absolute after:inset-0 after:content-[""]',
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
              <Meta className={cx(late && 'font-medium text-signal')}>
                {task.snoozedUntil ? (
                  <Hourglass className="size-3.5" strokeWidth={2} aria-label="Reportée" />
                ) : remindsEarly ? (
                  <BellRing className="size-3.5" strokeWidth={2} aria-label="Rappel" />
                ) : null}
                {due}
                {late && <span className="font-normal text-signal/80">· {late}</span>}
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
            <SnoozeMenu taskId={task.id} onSnooze={() => setLeaving(true)} />
          </div>
        )}
      </div>
    </li>
  )
}

export function TaskList({ tasks, showDate = true }: { tasks: TaskDto[]; showDate?: boolean }) {
  return (
    <ul className="divide-y divide-line rounded-2xl bg-surface shadow-sm ring-1 ring-line [&>li:first-child]:rounded-t-2xl [&>li:last-child]:rounded-b-2xl">
      {tasks.map((t) => (
        // La clé inclut l'état : une tâche reportée ou rouverte repart d'une ligne neuve
        <TaskRow key={`${t.id}-${t.status}-${t.alarmAt}`} task={t} showDate={showDate} />
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
  id,
  sticky = false,
}: {
  title: ReactNode
  count?: number
  tone?: 'default' | 'danger' | 'warning' | 'muted'
  children: ReactNode
  aside?: ReactNode
  id?: string
  sticky?: boolean
}) {
  return (
    <section id={id} className="mb-8 animate-rise scroll-mt-24">
      <div
        className={cx(
          'mb-2.5 flex items-center justify-between px-1',
          sticky && 'sticky top-[68px] z-20 -mx-1 bg-paper/90 px-2 py-1.5 backdrop-blur-xl'
        )}
      >
        <h2
          className={cx(
            'flex items-center gap-2 text-[13px] font-semibold',
            tone === 'danger'
              ? 'text-signal'
              : tone === 'warning'
                ? 'text-amber-ink'
                : tone === 'muted'
                  ? 'text-ink-3'
                  : 'text-ink-2'
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
