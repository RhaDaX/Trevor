import { Head } from '@inertiajs/react'
import { CalendarRange } from 'lucide-react'
import type { TaskDto } from '~/lib/types'
import {
  formatDayHeading,
  localDayKey,
  plural,
  shiftDayKey,
  shortWeekday,
  todayKey,
  useTimezone,
} from '~/lib/format'
import { Section, TaskList } from '~/components/task_row'
import { EmptyState, PageHeader, cx } from '~/components/ui'

/** Bandeau des 7 prochains jours : charge de chaque jour, clic pour y aller */
function WeekStrip({ groups, tz }: { groups: Map<string, TaskDto[]>; tz: string }) {
  const today = todayKey(tz)
  const days = Array.from({ length: 7 }, (_, i) => shiftDayKey(today, i))
  const max = Math.max(1, ...days.map((d) => groups.get(d)?.length ?? 0))

  return (
    <div className="mb-8 grid grid-cols-7 gap-1.5 rounded-2xl bg-surface p-2 shadow-sm ring-1 ring-line">
      {days.map((key, i) => {
        const count = groups.get(key)?.length ?? 0
        const urgent = groups.get(key)?.some((t) => t.priority === 'high')
        return (
          <button
            key={key}
            type="button"
            disabled={!count}
            onClick={() =>
              document
                .getElementById(`day-${key}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className={cx(
              'flex flex-col items-center gap-1 rounded-xl py-2 transition-colors',
              count ? 'hover:bg-sunken' : 'opacity-60',
              i === 0 && 'bg-sunken'
            )}
          >
            <span className="text-[11px] font-medium text-ink-3 capitalize">
              {i === 0 ? 'auj.' : shortWeekday(key)}
            </span>
            <span
              className={cx(
                'font-display text-lg leading-none font-semibold tabular',
                i === 0 ? 'text-ink' : 'text-ink-2'
              )}
            >
              {Number(key.slice(8))}
            </span>
            {/* Jauge de charge */}
            <span className="mt-1 flex h-6 w-1.5 items-end overflow-hidden rounded-full bg-line">
              <span
                className={cx('w-full rounded-full', urgent ? 'bg-signal' : 'bg-ink-2')}
                style={{ height: `${(count / max) * 100}%` }}
              />
            </span>
            <span className="text-[11px] text-ink-3 tabular">{count || '·'}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function Upcoming({ tasks }: { tasks: TaskDto[] }) {
  const tz = useTimezone()
  const groups = new Map<string, TaskDto[]>()
  for (const task of tasks) {
    const key = localDayKey(task.alarmAt ?? task.dueAt!, tz)
    groups.set(key, [...(groups.get(key) ?? []), task])
  }

  return (
    <>
      <Head title="À venir" />
      <PageHeader
        title="À venir"
        description={
          tasks.length
            ? `${plural(tasks.length, 'tâche datée', 'tâches datées')}, rangées par jour de rappel.`
            : undefined
        }
      />
      {tasks.length > 0 && <WeekStrip groups={groups} tz={tz} />}
      {!tasks.length && (
        <EmptyState
          icon={<CalendarRange className="size-8" strokeWidth={1.5} />}
          title="Rien à l’horizon"
        >
          Les tâches datées apparaîtront ici, jour par jour.
        </EmptyState>
      )}
      {[...groups.entries()].map(([key, list]) => (
        <Section
          key={key}
          id={`day-${key}`}
          sticky
          title={<span className="first-letter:uppercase">{formatDayHeading(key, tz)}</span>}
          count={list.length}
        >
          <TaskList tasks={list} />
        </Section>
      ))}
    </>
  )
}
