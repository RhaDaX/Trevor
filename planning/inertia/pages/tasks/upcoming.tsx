import { Head } from '@inertiajs/react'
import { CalendarRange } from 'lucide-react'
import type { TaskDto } from '~/lib/types'
import { formatDayHeading, localDayKey, plural, useTimezone } from '~/lib/format'
import { Section, TaskList } from '~/components/task_row'
import { EmptyState, PageHeader } from '~/components/ui'

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
            ? `${plural(tasks.length, 'tâche datée', 'tâches datées')}, par jour de rappel.`
            : undefined
        }
      />
      {!tasks.length && (
        <EmptyState
          icon={<CalendarRange className="size-8" strokeWidth={1.5} />}
          title="Rien à l’horizon"
        >
          Les tâches datées apparaîtront ici, jour par jour.
        </EmptyState>
      )}
      {[...groups.entries()].map(([key, list]) => (
        <Section key={key} title={formatDayHeading(key, tz)} count={list.length}>
          <TaskList tasks={list} />
        </Section>
      ))}
    </>
  )
}
