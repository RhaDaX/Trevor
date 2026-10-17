import { Head, Link, usePage } from '@inertiajs/react'
import { ChevronRight, Inbox, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { SharedProps, TaskDto } from '~/lib/types'
import { plural, todayLabel, useTimezone } from '~/lib/format'
import { Section, TaskList } from '~/components/task_row'
import ProgressRing from '~/components/progress_ring'
import { EmptyState, Kbd, PageHeader, cx } from '~/components/ui'

export default function Today({
  overdue,
  today,
  soon,
  doneToday,
}: {
  overdue: TaskDto[]
  today: TaskDto[]
  soon: TaskDto[]
  doneToday: TaskDto[]
}) {
  const tz = useTimezone()
  const inboxCount = usePage<SharedProps & Record<string, unknown>>().props.attention.inbox
  const [showDone, setShowDone] = useState(false)
  const nothing = !overdue.length && !today.length && !soon.length
  const dayTotal = overdue.length + today.length + doneToday.length

  const summary = [
    overdue.length ? `${overdue.length} en retard` : null,
    today.length ? `${today.length} plus tard aujourd'hui` : null,
  ].filter(Boolean)

  return (
    <>
      <Head title="Aujourd'hui" />
      <PageHeader
        eyebrow={todayLabel(tz)}
        title="Aujourd'hui"
        description={
          summary.length
            ? summary.join(' · ')
            : nothing
              ? undefined
              : 'Rien d’urgent, le reste peut attendre.'
        }
        actions={
          dayTotal > 0 ? <ProgressRing done={doneToday.length} total={dayTotal} /> : undefined
        }
      />

      {inboxCount > 0 && (
        <Link
          href="/inbox"
          className="group mb-8 flex animate-rise items-center gap-3 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-ink ring-1 ring-amber/30 transition-colors hover:ring-amber/60"
        >
          <Inbox className="size-[18px] shrink-0" strokeWidth={2} />
          <span className="flex-1">
            <span className="font-semibold">
              {plural(inboxCount, 'tâche attend', 'tâches attendent')}
            </span>{' '}
            d’être triées
          </span>
          <span className="inline-flex items-center gap-0.5 font-medium">
            Trier{' '}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {nothing && !doneToday.length && (
        <EmptyState
          icon={<Sparkles className="size-8" strokeWidth={1.5} />}
          title="Journée dégagée"
        >
          Rien de prévu pour les 7 prochains jours. Capturez la prochaine idée avec <Kbd>N</Kbd> ou{' '}
          <Kbd>⌘K</Kbd>.
        </EmptyState>
      )}
      {nothing && doneToday.length > 0 && (
        <EmptyState icon={<Sparkles className="size-8" strokeWidth={1.5} />} title="Tout est fait">
          {plural(doneToday.length, 'tâche cochée', 'tâches cochées')} aujourd’hui. Rien d’autre en
          vue cette semaine.
        </EmptyState>
      )}
      {overdue.length > 0 && (
        <Section title="En retard" count={overdue.length} tone="danger">
          <TaskList tasks={overdue} />
        </Section>
      )}
      {today.length > 0 && (
        <Section title="Plus tard aujourd'hui" count={today.length}>
          <TaskList tasks={today} />
        </Section>
      )}
      {soon.length > 0 && (
        <Section title="Les 7 prochains jours" count={soon.length}>
          <TaskList tasks={soon} />
        </Section>
      )}

      {doneToday.length > 0 && (
        <section className="mt-10">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="mb-2.5 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-ink-3 hover:text-ink-2"
          >
            <ChevronRight className={cx('size-4 transition-transform', showDone && 'rotate-90')} />
            Faites aujourd’hui
            <span className="font-medium tabular">{doneToday.length}</span>
          </button>
          {showDone && <TaskList tasks={doneToday} showDate={false} />}
        </section>
      )}
    </>
  )
}
