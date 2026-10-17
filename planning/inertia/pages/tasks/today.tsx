import { Head, Link, usePage } from '@inertiajs/react'
import { Inbox, Sparkles } from 'lucide-react'
import type { SharedProps, TaskDto } from '~/lib/types'
import { plural, todayLabel, useTimezone } from '~/lib/format'
import { Section, TaskList } from '~/components/task_row'
import { EmptyState, Kbd, PageHeader } from '~/components/ui'

export default function Today({
  overdue,
  today,
  soon,
}: {
  overdue: TaskDto[]
  today: TaskDto[]
  soon: TaskDto[]
}) {
  const tz = useTimezone()
  const { inboxCount } = usePage<SharedProps & Record<string, unknown>>().props
  const nothing = !overdue.length && !today.length && !soon.length

  const summary = [
    overdue.length ? plural(overdue.length, 'en retard', 'en retard') : null,
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
      />

      {inboxCount > 0 && (
        <Link
          href="/inbox"
          className="mb-8 flex animate-rise items-center gap-3 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-ink ring-1 ring-amber/30 transition-colors hover:ring-amber/60"
        >
          <Inbox className="size-[18px] shrink-0" strokeWidth={2} />
          <span className="flex-1">
            <span className="font-semibold">
              {plural(inboxCount, 'tâche attend', 'tâches attendent')}
            </span>{' '}
            d’être triées
          </span>
          <span className="font-medium">Trier →</span>
        </Link>
      )}

      {nothing && (
        <EmptyState
          icon={<Sparkles className="size-8" strokeWidth={1.5} />}
          title="Journée dégagée"
        >
          Rien de prévu pour les 7 prochains jours. Capturez la prochaine idée avec <Kbd>N</Kbd> ou{' '}
          <Kbd>⌘K</Kbd>.
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
    </>
  )
}
