import { Head } from '@inertiajs/react'
import { CircleCheckBig } from 'lucide-react'
import type { TaskDto } from '~/lib/types'
import { TaskList } from '~/components/task_row'
import { EmptyState, PageHeader } from '~/components/ui'

export default function Done({ tasks }: { tasks: TaskDto[] }) {
  return (
    <>
      <Head title="Terminées" />
      <PageHeader title="Terminées" description="Les 150 dernières, la plus récente en premier." />
      {tasks.length ? (
        <TaskList tasks={tasks} showDate={false} />
      ) : (
        <EmptyState
          icon={<CircleCheckBig className="size-8" strokeWidth={1.5} />}
          title="Encore rien de coché"
        >
          Les tâches faites atterrissent ici.
        </EmptyState>
      )}
    </>
  )
}
