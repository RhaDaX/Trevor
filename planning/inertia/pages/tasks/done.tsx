import { Head } from '@inertiajs/react'
import type { TaskDto } from '~/lib/types'
import { EmptyState, TaskList } from '~/components/task_row'

export default function Done({ tasks }: { tasks: TaskDto[] }) {
  return (
    <>
      <Head title="Terminées" />
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Terminées</h1>
      {tasks.length ? (
        <TaskList tasks={tasks} showDate={false} />
      ) : (
        <EmptyState>Rien de terminé pour l'instant.</EmptyState>
      )}
    </>
  )
}
