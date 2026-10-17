import { Head } from '@inertiajs/react'
import type { TaskDto } from '~/lib/types'
import { EmptyState, Section, TaskList } from '~/components/task_row'

export default function Today({
  overdue,
  today,
  soon,
}: {
  overdue: TaskDto[]
  today: TaskDto[]
  soon: TaskDto[]
}) {
  const nothing = !overdue.length && !today.length && !soon.length
  return (
    <>
      <Head title="Aujourd'hui" />
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Aujourd'hui</h1>
      {nothing && (
        <EmptyState>Rien de prévu. Ajoutez une tâche avec le champ du haut (⌘K).</EmptyState>
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
        <Section title="7 prochains jours" count={soon.length}>
          <TaskList tasks={soon} />
        </Section>
      )}
    </>
  )
}
