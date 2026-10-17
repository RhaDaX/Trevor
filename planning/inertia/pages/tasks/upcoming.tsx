import { Head } from '@inertiajs/react'
import type { TaskDto } from '~/lib/types'
import { formatDayHeading, localDayKey, useTimezone } from '~/lib/format'
import { EmptyState, Section, TaskList } from '~/components/task_row'

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
      <h1 className="mb-5 text-2xl font-bold tracking-tight">À venir</h1>
      {!tasks.length && <EmptyState>Aucune tâche datée à venir.</EmptyState>}
      {[...groups.entries()].map(([key, list]) => (
        <Section key={key} title={formatDayHeading(key, tz)} count={list.length}>
          <TaskList tasks={list} />
        </Section>
      ))}
    </>
  )
}
